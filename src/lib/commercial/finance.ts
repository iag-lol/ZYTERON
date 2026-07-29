import { DEFAULT_RETENTION_PCT, formatCLP, formatPeriod } from "@/config/commercial";
import { notifyCommercialUser, recordAudit } from "@/lib/commercial/audit";
import { commercialDb, getCommercialUserById } from "@/lib/commercial/store";

/**
 * Comisiones y liquidaciones mensuales del área comercial.
 *
 * Flujo:
 *   1. Administración registra una comisión (base neta × porcentaje) asociada
 *      opcionalmente al prospecto que la originó.
 *   2. La comisión se aprueba cuando el cliente paga.
 *   3. Al cierre del mes se genera la liquidación del periodo: consolida las
 *      comisiones aprobadas, aplica retención y ajustes, y queda emitida.
 *   4. Al marcarla pagada, las comisiones incluidas pasan a "paid".
 *
 * El ejecutivo solo lee sus propios datos; el filtro por `owner_id` se aplica
 * en cada consulta porque las tablas viven tras el service role.
 */

export type Commission = {
  id: string;
  owner_id: string;
  lead_id: string | null;
  statement_id: string | null;
  project_ref: string | null;
  client_name: string | null;
  concept: string | null;
  base_amount: number;
  percentage: number;
  gross_amount: number;
  status: string;
  period: string | null;
  notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type Statement = {
  id: string;
  owner_id: string;
  period: string;
  folio: string | null;
  gross_total: number;
  retention: number;
  retention_pct: number;
  adjustments: number;
  adjustments_note: string | null;
  net_total: number;
  commissions_count: number;
  status: string;
  pdf_path: string | null;
  issued_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

const COMMISSION_COLS =
  "id,owner_id,lead_id,statement_id,project_ref,client_name,concept,base_amount,percentage,gross_amount,status,period,notes,approved_at,approved_by,paid_at,created_by,created_at";

const STATEMENT_COLS =
  "id,owner_id,period,folio,gross_total,retention,retention_pct,adjustments,adjustments_note,net_total,commissions_count,status,pdf_path,issued_at,paid_at,payment_method,payment_reference,notes,created_by,created_at";

// -- Lectura -----------------------------------------------------------------

export async function listCommissions(filter?: {
  ownerId?: string;
  period?: string;
  status?: string;
}): Promise<Commission[]> {
  let query = commercialDb()
    .from("commercial_commissions")
    .select(COMMISSION_COLS)
    .order("created_at", { ascending: false });
  if (filter?.ownerId) query = query.eq("owner_id", filter.ownerId);
  if (filter?.period) query = query.eq("period", filter.period);
  if (filter?.status) query = query.eq("status", filter.status);
  const { data } = await query;
  return (data as Commission[]) ?? [];
}

export async function listStatements(filter?: {
  ownerId?: string;
  period?: string;
  status?: string;
}): Promise<Statement[]> {
  let query = commercialDb()
    .from("commercial_statements")
    .select(STATEMENT_COLS)
    .order("period", { ascending: false });
  if (filter?.ownerId) query = query.eq("owner_id", filter.ownerId);
  if (filter?.period) query = query.eq("period", filter.period);
  if (filter?.status) query = query.eq("status", filter.status);
  const { data } = await query;
  return (data as Statement[]) ?? [];
}

export async function getStatementForOwner(
  ownerId: string,
  statementId: string,
): Promise<{ statement: Statement; commissions: Commission[] } | null> {
  const { data } = await commercialDb()
    .from("commercial_statements")
    .select(STATEMENT_COLS)
    .eq("id", statementId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  const statement = (data as Statement) ?? null;
  if (!statement) return null;
  const { data: rows } = await commercialDb()
    .from("commercial_commissions")
    .select(COMMISSION_COLS)
    .eq("statement_id", statementId)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  return { statement, commissions: (rows as Commission[]) ?? [] };
}

/** Resumen de ganancias que ve el ejecutivo en su portal. */
export type EarningsSummary = {
  grossTotal: number;
  paidTotal: number;
  approvedPending: number;
  pendingTotal: number;
  currentPeriodGross: number;
  lastPaymentAt: string | null;
  statementsIssued: number;
  statementsPaid: number;
  byPeriod: Array<{ period: string; gross: number; count: number }>;
};

export function summarizeEarnings(
  commissions: Commission[],
  statements: Statement[],
  period: string,
): EarningsSummary {
  const byPeriod = new Map<string, { gross: number; count: number }>();
  let grossTotal = 0;
  let paidTotal = 0;
  let approvedPending = 0;
  let pendingTotal = 0;

  for (const item of commissions) {
    const gross = Number(item.gross_amount) || 0;
    grossTotal += gross;
    if (item.status === "paid") paidTotal += gross;
    else if (item.status === "approved") approvedPending += gross;
    else if (item.status === "pending") pendingTotal += gross;

    const key = item.period || item.created_at.slice(0, 7);
    const bucket = byPeriod.get(key) ?? { gross: 0, count: 0 };
    bucket.gross += gross;
    bucket.count += 1;
    byPeriod.set(key, bucket);
  }

  const paidStatements = statements.filter((item) => item.status === "paid");
  const lastPaymentAt =
    paidStatements
      .map((item) => item.paid_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    grossTotal,
    paidTotal,
    approvedPending,
    pendingTotal,
    currentPeriodGross: byPeriod.get(period)?.gross ?? 0,
    lastPaymentAt,
    statementsIssued: statements.length,
    statementsPaid: paidStatements.length,
    byPeriod: Array.from(byPeriod.entries())
      .map(([key, value]) => ({ period: key, ...value }))
      .sort((a, b) => b.period.localeCompare(a.period))
      .slice(0, 12),
  };
}

// -- Escritura (solo administración) -----------------------------------------

type Actor = { id: string; name?: string | null };

export async function createCommission(
  actor: Actor,
  input: {
    ownerId: string;
    clientName?: string | null;
    projectRef?: string | null;
    concept?: string | null;
    leadId?: string | null;
    baseAmount: number;
    percentage: number;
    period: string;
    status?: string;
    notes?: string | null;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const owner = await getCommercialUserById(input.ownerId);
  if (!owner) return { ok: false, error: "El usuario comercial no existe." };
  if (!/^\d{4}-\d{2}$/.test(input.period)) return { ok: false, error: "El periodo debe tener formato AAAA-MM." };

  const base = Math.max(0, Math.round(Number(input.baseAmount) || 0));
  const pct = Math.min(100, Math.max(0, Number(input.percentage) || 0));
  const gross = Math.round((base * pct) / 100);
  const status = input.status ?? "pending";
  const now = new Date().toISOString();

  const { data, error } = await commercialDb()
    .from("commercial_commissions")
    .insert({
      owner_id: input.ownerId,
      lead_id: input.leadId || null,
      client_name: input.clientName?.trim() || null,
      project_ref: input.projectRef?.trim() || null,
      concept: input.concept?.trim() || null,
      base_amount: base,
      percentage: pct,
      gross_amount: gross,
      status,
      period: input.period,
      notes: input.notes?.trim() || null,
      approved_at: status === "approved" ? now : null,
      approved_by: status === "approved" ? actor.id : null,
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const label = input.clientName?.trim() || input.concept?.trim() || "Comisión";
  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "commission",
    entityId: data.id as string,
    entityLabel: label,
    action: "created",
    summary: `Comisión registrada para ${owner.name}: ${formatCLP(gross)} (${pct}% sobre ${formatCLP(base)}) · ${formatPeriod(input.period)}.`,
    meta: { base, pct, gross, period: input.period, status },
    ownerId: input.ownerId,
  });
  await notifyCommercialUser({
    ownerId: input.ownerId,
    kind: "success",
    title: `Nueva comisión registrada · ${formatCLP(gross)}`,
    body: `${label} — periodo ${formatPeriod(input.period)}. Revisa el detalle en Ganancias.`,
    link: "/portal-comercial/ganancias",
  });
  return { ok: true, id: data.id as string };
}

export async function updateCommission(
  actor: Actor,
  id: string,
  patch: {
    status?: string;
    baseAmount?: number;
    percentage?: number;
    clientName?: string | null;
    projectRef?: string | null;
    concept?: string | null;
    period?: string;
    notes?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await commercialDb()
    .from("commercial_commissions")
    .select(COMMISSION_COLS)
    .eq("id", id)
    .maybeSingle();
  const current = (data as Commission) ?? null;
  if (!current) return { ok: false, error: "Comisión no encontrada." };
  if (current.status === "paid" && patch.status !== "adjusted") {
    return { ok: false, error: "Una comisión pagada solo puede marcarse como ajustada." };
  }

  const update: Record<string, unknown> = {};
  const base = patch.baseAmount === undefined ? current.base_amount : Math.max(0, Math.round(patch.baseAmount));
  const pct =
    patch.percentage === undefined ? current.percentage : Math.min(100, Math.max(0, patch.percentage));
  if (base !== current.base_amount || pct !== current.percentage) {
    update.base_amount = base;
    update.percentage = pct;
    update.gross_amount = Math.round((base * pct) / 100);
  }
  if (patch.clientName !== undefined) update.client_name = patch.clientName?.trim() || null;
  if (patch.projectRef !== undefined) update.project_ref = patch.projectRef?.trim() || null;
  if (patch.concept !== undefined) update.concept = patch.concept?.trim() || null;
  if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
  if (patch.period && /^\d{4}-\d{2}$/.test(patch.period)) update.period = patch.period;
  if (patch.status && patch.status !== current.status) {
    update.status = patch.status;
    if (patch.status === "approved") {
      update.approved_at = new Date().toISOString();
      update.approved_by = actor.id;
    }
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await commercialDb().from("commercial_commissions").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "commission",
    entityId: id,
    entityLabel: current.client_name ?? current.concept ?? "Comisión",
    action: patch.status && patch.status !== current.status ? "status_changed" : "updated",
    summary:
      patch.status && patch.status !== current.status
        ? `Comisión cambiada de "${current.status}" a "${patch.status}".`
        : "Comisión actualizada por administración.",
    meta: { before: current, patch: update },
    ownerId: current.owner_id,
  });
  return { ok: true };
}

export async function deleteCommission(actor: Actor, id: string): Promise<{ ok: boolean; error?: string }> {
  const { data } = await commercialDb()
    .from("commercial_commissions")
    .select(COMMISSION_COLS)
    .eq("id", id)
    .maybeSingle();
  const current = (data as Commission) ?? null;
  if (!current) return { ok: false, error: "Comisión no encontrada." };
  if (current.statement_id) {
    return { ok: false, error: "Esta comisión ya está incluida en una liquidación. Anúlala desde la liquidación." };
  }
  const { error } = await commercialDb().from("commercial_commissions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "commission",
    entityId: id,
    entityLabel: current.client_name ?? "Comisión",
    action: "deleted",
    summary: `Comisión eliminada (${formatCLP(current.gross_amount)}).`,
    meta: { before: current },
    ownerId: current.owner_id,
  });
  return { ok: true };
}

/** Vista previa de lo que quedaría incluido en la liquidación de un periodo. */
export async function previewStatement(ownerId: string, period: string) {
  const commissions = await listCommissions({ ownerId, period });
  const eligible = commissions.filter((item) => item.status === "approved" && !item.statement_id);
  const gross = eligible.reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);
  return { eligible, gross };
}

export async function issueStatement(
  actor: Actor,
  input: {
    ownerId: string;
    period: string;
    retentionPct?: number;
    adjustments?: number;
    adjustmentsNote?: string | null;
    folio?: string | null;
    notes?: string | null;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const owner = await getCommercialUserById(input.ownerId);
  if (!owner) return { ok: false, error: "El usuario comercial no existe." };
  if (!/^\d{4}-\d{2}$/.test(input.period)) return { ok: false, error: "El periodo debe tener formato AAAA-MM." };

  const { data: existing } = await commercialDb()
    .from("commercial_statements")
    .select("id")
    .eq("owner_id", input.ownerId)
    .eq("period", input.period)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `Ya existe una liquidación de ${formatPeriod(input.period)} para este ejecutivo.` };
  }

  const { eligible, gross } = await previewStatement(input.ownerId, input.period);
  if (eligible.length === 0) {
    return { ok: false, error: "No hay comisiones aprobadas sin liquidar en este periodo." };
  }

  const retentionPct = input.retentionPct ?? DEFAULT_RETENTION_PCT;
  const adjustments = Math.round(Number(input.adjustments) || 0);
  const retention = Math.round((gross * retentionPct) / 100);
  const net = gross - retention + adjustments;

  const { data, error } = await commercialDb()
    .from("commercial_statements")
    .insert({
      owner_id: input.ownerId,
      period: input.period,
      folio: input.folio?.trim() || null,
      gross_total: gross,
      retention,
      retention_pct: retentionPct,
      adjustments,
      adjustments_note: input.adjustmentsNote?.trim() || null,
      net_total: net,
      commissions_count: eligible.length,
      status: "issued",
      issued_at: new Date().toISOString(),
      notes: input.notes?.trim() || null,
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const statementId = data.id as string;
  await commercialDb()
    .from("commercial_commissions")
    .update({ statement_id: statementId })
    .in(
      "id",
      eligible.map((item) => item.id),
    );

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "statement",
    entityId: statementId,
    entityLabel: `${owner.name} · ${formatPeriod(input.period)}`,
    action: "issued",
    summary: `Liquidación emitida: bruto ${formatCLP(gross)}, retención ${retentionPct}% (${formatCLP(retention)}), neto ${formatCLP(net)} sobre ${eligible.length} comisión(es).`,
    meta: { gross, retention, retentionPct, adjustments, net, commissions: eligible.length },
    ownerId: input.ownerId,
  });
  await notifyCommercialUser({
    ownerId: input.ownerId,
    kind: "payment",
    title: `Liquidación de ${formatPeriod(input.period)} emitida`,
    body: `Monto neto a pagar: ${formatCLP(net)}. Revisa el detalle en Ganancias.`,
    link: "/portal-comercial/ganancias",
  });
  return { ok: true, id: statementId };
}

export async function updateStatement(
  actor: Actor,
  id: string,
  patch: {
    status?: string;
    folio?: string | null;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    notes?: string | null;
    adjustments?: number;
    adjustmentsNote?: string | null;
    retentionPct?: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await commercialDb()
    .from("commercial_statements")
    .select(STATEMENT_COLS)
    .eq("id", id)
    .maybeSingle();
  const current = (data as Statement) ?? null;
  if (!current) return { ok: false, error: "Liquidación no encontrada." };

  const update: Record<string, unknown> = {};
  const retentionPct = patch.retentionPct ?? current.retention_pct;
  const adjustments = patch.adjustments === undefined ? current.adjustments : Math.round(patch.adjustments);
  if (retentionPct !== current.retention_pct || adjustments !== current.adjustments) {
    const retention = Math.round((current.gross_total * retentionPct) / 100);
    update.retention_pct = retentionPct;
    update.retention = retention;
    update.adjustments = adjustments;
    update.net_total = current.gross_total - retention + adjustments;
  }
  if (patch.folio !== undefined) update.folio = patch.folio?.trim() || null;
  if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
  if (patch.adjustmentsNote !== undefined) update.adjustments_note = patch.adjustmentsNote?.trim() || null;
  if (patch.paymentMethod !== undefined) update.payment_method = patch.paymentMethod?.trim() || null;
  if (patch.paymentReference !== undefined) update.payment_reference = patch.paymentReference?.trim() || null;

  const becomesPaid = patch.status === "paid" && current.status !== "paid";
  if (patch.status && patch.status !== current.status) {
    update.status = patch.status;
    update.paid_at = becomesPaid ? new Date().toISOString() : null;
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await commercialDb().from("commercial_statements").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (becomesPaid) {
    await commercialDb()
      .from("commercial_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("statement_id", id);
  }
  if (patch.status === "cancelled" && current.status !== "cancelled") {
    // Al anular, las comisiones vuelven a quedar disponibles para otra liquidación.
    await commercialDb()
      .from("commercial_commissions")
      .update({ statement_id: null, status: "approved", paid_at: null })
      .eq("statement_id", id);
  }

  const netTotal = Number(update.net_total ?? current.net_total);
  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "statement",
    entityId: id,
    entityLabel: formatPeriod(current.period),
    action: patch.status && patch.status !== current.status ? "status_changed" : "updated",
    summary: becomesPaid
      ? `Liquidación de ${formatPeriod(current.period)} marcada como pagada (${formatCLP(netTotal)}).`
      : `Liquidación de ${formatPeriod(current.period)} actualizada.`,
    meta: { before: current, patch: update },
    ownerId: current.owner_id,
  });
  if (becomesPaid) {
    await notifyCommercialUser({
      ownerId: current.owner_id,
      kind: "payment",
      title: `Pago realizado · ${formatPeriod(current.period)}`,
      body: `Se transfirió el monto neto de ${formatCLP(netTotal)}${patch.paymentReference ? ` (ref. ${patch.paymentReference})` : ""}.`,
      link: "/portal-comercial/ganancias",
    });
  }
  return { ok: true };
}

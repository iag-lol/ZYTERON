import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeDteTotals } from "@/lib/dte/tax-calculator";
import { DTE_TYPES, getSiiEnvironment } from "@/lib/dte/constants";
import { writeTaxAudit } from "@/lib/sii/audit";
import { isValidRut } from "@/lib/sii/rut";

/**
 * Auto-relleno de un BORRADOR de documento tributario (DTE) a partir de una
 * cotización cuando pasa a orden de trabajo. NO emite nada ante el SII: crea un
 * borrador pre-rellenado (internal_status='draft') listo para revisar y, cuando
 * la configuración tributaria esté completa (certificado + CAF + firma, Fase 2),
 * confirmar y emitir. Idempotente por orden de trabajo. Nunca lanza.
 */

type QuoteItem = {
  description?: string;
  detail?: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  discountPct?: number;
  isExempt?: boolean;
};

type QuoteLike = {
  id: string;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  totalAmount?: number | null;
  displayNumber?: string | null;
};

type QuoteMetaLike = {
  items?: QuoteItem[];
  clientRut?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  giro?: string | null;
  documentType?: number | null;
};

function db() {
  return createSupabaseServerClient().supabase.schema("public");
}

async function upsertCustomerProfile(quote: QuoteLike, meta: QuoteMetaLike): Promise<string | null> {
  const rut = String(meta.clientRut || "").trim();
  if (!rut || !isValidRut(rut)) return null;
  try {
    const supabase = db();
    const { data: existing } = await supabase
      .from("tax_customer_profiles")
      .select("id")
      .eq("rut", rut)
      .maybeSingle();
    if (existing?.id) return existing.id as string;

    const { data, error } = await supabase
      .from("tax_customer_profiles")
      .insert({
        customer_id: quote.userId ?? null,
        rut,
        razon_social: quote.company || quote.name || "Cliente",
        giro: meta.giro ?? null,
        direccion: meta.clientAddress ?? null,
        ciudad: meta.clientCity ?? null,
        email_tributario: quote.email ?? null,
        telefono: quote.phone ?? null,
        afecto: true,
      })
      .select("id")
      .single();
    if (error) return null;
    return data?.id as string;
  } catch {
    return null;
  }
}

export async function createDteDraftFromQuote(input: {
  quote: QuoteLike;
  workOrderId: string;
  meta: QuoteMetaLike;
  createdBy?: string | null;
}): Promise<{ ok: boolean; documentId: string | null; reason?: string }> {
  const { quote, workOrderId, meta } = input;
  const environment = getSiiEnvironment();
  const idempotencyKey = `wo:${workOrderId}`;

  try {
    const supabase = db();

    // Idempotencia: si ya existe un borrador para esta OT, no duplicar.
    const { data: dup } = await supabase
      .from("tax_documents")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (dup?.id) return { ok: true, documentId: dup.id as string, reason: "already_exists" };

    const rawItems = Array.isArray(meta.items) && meta.items.length > 0 ? meta.items : [];
    // Si la cotización no trae ítems, creamos una línea única con el total.
    const items =
      rawItems.length > 0
        ? rawItems
        : [{ description: `Servicios cotización ${quote.displayNumber || quote.id}`, qty: 1, unitPrice: Math.max(0, Math.round(quote.totalAmount || 0)), discountPct: 0 }];

    const totals = computeDteTotals(
      items.map((it) => ({
        quantity: Number(it.qty) || 1,
        unitPrice: Math.round(Number(it.unitPrice) || 0),
        discountPct: Number(it.discountPct) || 0,
        isExempt: Boolean(it.isExempt),
      })),
    );

    const documentType = meta.documentType || DTE_TYPES.FACTURA; // 33 por defecto
    const customerProfileId = await upsertCustomerProfile(quote, meta);
    const documentId = randomUUID();

    const { error: docErr } = await supabase.from("tax_documents").insert({
      id: documentId,
      document_type: documentType,
      folio: null, // se asigna al emitir (Fase 2)
      environment,
      customer_id: quote.userId ?? null,
      customer_tax_profile_id: customerProfileId,
      quote_id: quote.id,
      work_order_id: workOrderId,
      currency: "CLP",
      net_amount: totals.netAmount,
      exempt_amount: totals.exemptAmount,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      internal_status: "draft",
      sii_status: "not_sent",
      commercial_status: "pending_payment",
      idempotency_key: idempotencyKey,
      observations: `Auto-generado desde cotización ${quote.displayNumber || quote.id} (OT ${workOrderId}).`,
      created_by: input.createdBy ?? null,
    });
    if (docErr) {
      console.error("[dte] no se pudo crear el borrador:", docErr.message);
      return { ok: false, documentId: null, reason: docErr.message };
    }

    // Ítems
    const itemRows = items.map((it, i) => ({
      document_id: documentId,
      line_number: i + 1,
      code: null,
      description: String(it.description || "Servicio").slice(0, 500),
      quantity: Number(it.qty) || 1,
      unit: it.unit || "unidad",
      unit_price: Math.round(Number(it.unitPrice) || 0),
      discount_pct: Number(it.discountPct) || 0,
      is_exempt: Boolean(it.isExempt),
      line_total: totals.lines[i]?.lineTotal ?? 0,
    }));
    await supabase.from("tax_document_items").insert(itemRows);

    // Referencias (cotización + orden de trabajo)
    await supabase.from("tax_document_references").insert([
      { document_id: documentId, reference_type: "quote", reference_folio: quote.displayNumber || quote.id, reason: "Cotización de origen" },
      { document_id: documentId, reference_type: "order", reference_folio: workOrderId, reason: "Orden de trabajo" },
    ]);

    // Historial de estado + auditoría
    await supabase.from("tax_document_status_history").insert({
      document_id: documentId,
      status_kind: "internal",
      status_value: "draft",
      detail: "Borrador auto-generado desde orden de trabajo.",
      actor: input.createdBy ?? "system",
    });
    await writeTaxAudit({
      userId: input.createdBy,
      action: "dte_draft_autofill",
      entity: "tax_documents",
      entityId: documentId,
      after: { quote_id: quote.id, work_order_id: workOrderId, total: totals.totalAmount },
      result: "ok",
      reason: "Auto-relleno desde cotización → orden de trabajo",
    });

    return { ok: true, documentId };
  } catch (err) {
    console.error("[dte] createDteDraftFromQuote falló:", err);
    return { ok: false, documentId: null, reason: "exception" };
  }
}

export async function getDteDraftByWorkOrder(workOrderId: string) {
  try {
    const { data } = await db()
      .from("tax_documents")
      .select("*")
      .eq("idempotency_key", `wo:${workOrderId}`)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

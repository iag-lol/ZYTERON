import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSalesSettings, updateSalesSetting } from "./settings";
import { computeNextSendAt, effectiveDailyLimit, rescheduleBacklog } from "./scheduler";
import { logSalesEvent } from "./repository";
import { notifySalesEvent } from "./notifications";
import { SALES_EVENT_TYPES } from "./types";

/**
 * Cola de envíos.
 *
 * Toda salida de correo comercial pasa por aquí. La reserva del siguiente
 * envío la resuelve una función de PostgreSQL con FOR UPDATE SKIP LOCKED: es
 * lo que impide que dos ejecuciones del cron tomen el mismo registro y
 * produzcan la ráfaga que Microsoft rechazó.
 */

export const QUEUE_STATUSES = [
  "PENDIENTE_ANALISIS",
  "PENDIENTE_REVISION",
  "PROGRAMADO",
  "PROCESANDO",
  "ACEPTADO_POR_MICROSOFT",
  "ENVIADO_SIN_REBOTE",
  "REBOTADO",
  "CANCELADO",
  "ERROR",
] as const;

export type QueueStatus = (typeof QUEUE_STATUSES)[number];
export type QueueKind = "PRIMER_CONTACTO" | "SEGUIMIENTO" | "RESPUESTA";

export type QueueItem = {
  id: string;
  company_id: string | null;
  campaign_id: string | null;
  thread_id: string | null;
  draft_id: string | null;
  followup_id: string | null;
  kind: QueueKind;
  recipient_email: string | null;
  subject: string | null;
  body: string | null;
  content: Record<string, unknown> | null;
  status: QueueStatus;
  scheduled_at: string | null;
  processing_started_at: string | null;
  accepted_at: string | null;
  bounced_at: string | null;
  bounce_code: string | null;
  bounce_kind: string | null;
  graph_message_id: string | null;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  confidence: number | null;
  requires_review: boolean;
  review_reason: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Alta en la cola
// ---------------------------------------------------------------------------

export type EnqueueInput = {
  companyId: string;
  kind: QueueKind;
  campaignId?: string | null;
  threadId?: string | null;
  followupId?: string | null;
  recipientEmail?: string | null;
  createdBy?: string;
};

/**
 * Encola un envío en estado PENDIENTE_ANALISIS. El contenido NO se genera
 * todavía: se redacta cerca del momento del envío para no gastar IA en
 * prospectos que después se cancelen.
 */
export async function enqueueSend(input: EnqueueInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { supabase } = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("sales_send_queue")
      .insert({
        company_id: input.companyId,
        campaign_id: input.campaignId ?? null,
        thread_id: input.threadId ?? null,
        followup_id: input.followupId ?? null,
        kind: input.kind,
        recipient_email: input.recipientEmail ?? null,
        status: "PENDIENTE_ANALISIS",
        created_by: input.createdBy ?? "SYSTEM",
      })
      .select("id")
      .single();

    if (error) {
      // El índice único impide duplicar un envío vivo para el mismo prospecto.
      if (error.code === "23505") {
        return { ok: false, error: "Ya existe un envío en curso para esta empresa." };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true, id: String(data.id) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error al encolar." };
  }
}

/** Última hora ya comprometida en la cola, para encadenar la separación. */
async function getLastScheduledAt(): Promise<Date | null> {
  const { supabase } = createSupabaseServerClient();
  const { data } = await supabase
    .from("sales_send_queue")
    .select("scheduled_at")
    .in("status", ["PROGRAMADO", "PROCESANDO"])
    .order("scheduled_at", { ascending: false })
    .limit(1);

  const value = data?.[0]?.scheduled_at;
  return value ? new Date(value) : null;
}

/**
 * Pasa un envío revisado a PROGRAMADO con su hora definitiva.
 * La hora se fija una sola vez y queda persistida.
 */
export async function scheduleQueueItem(
  id: string,
  options: { reviewedBy?: string } = {},
): Promise<{ ok: boolean; scheduledAt?: string; error?: string }> {
  try {
    const { supabase } = createSupabaseServerClient();
    const lastScheduledAt = await getLastScheduledAt();
    const scheduledAt = computeNextSendAt({ lastScheduledAt });

    const { error } = await supabase
      .from("sales_send_queue")
      .update({
        status: "PROGRAMADO",
        scheduled_at: scheduledAt.toISOString(),
        requires_review: false,
        reviewed_by: options.reviewedBy ?? null,
        reviewed_at: options.reviewedBy ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .in("status", ["PENDIENTE_REVISION", "PENDIENTE_ANALISIS"]);

    if (error) return { ok: false, error: error.message };
    return { ok: true, scheduledAt: scheduledAt.toISOString() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error al programar." };
  }
}

// ---------------------------------------------------------------------------
// Reserva atómica
// ---------------------------------------------------------------------------

/** Límite diario efectivo considerando calentamiento y override manual. */
export async function getEffectiveDailyLimit() {
  const settings = await getSalesSettings();
  const raw = settings as unknown as {
    warmup_started_on?: string | null;
    warmup_manual_override?: number | null;
  };

  return effectiveDailyLimit({
    warmupStartedOn: raw.warmup_started_on ?? null,
    manualOverride: raw.warmup_manual_override ?? null,
    configuredDailyLimit: settings.daily_send_limit,
  });
}

/**
 * Reserva el siguiente envío vencido. Devuelve null si no hay nada que enviar,
 * si ya hay otro en curso, si no queda cupo o si otra ejecución se lo llevó.
 */
export async function claimNextSend(): Promise<QueueItem | null> {
  const settings = await getSalesSettings();
  if (settings.zara_paused) return null;

  const { limit } = await getEffectiveDailyLimit();
  const gap = Number((settings as unknown as { queue_min_gap_seconds?: number }).queue_min_gap_seconds ?? 60);

  try {
    const { supabase } = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("sales_claim_next_send", {
      p_daily_limit: limit,
      p_min_gap_seconds: gap,
    });

    if (error) {
      console.error("[queue] no se pudo reservar el siguiente envío:", error.message);
      return null;
    }

    const rows = (data ?? []) as QueueItem[];
    return rows[0] ?? null;
  } catch (error) {
    console.error("[queue] error al reservar:", error);
    return null;
  }
}

/** Devuelve a PROGRAMADO los envíos que quedaron colgados en PROCESANDO. */
export async function releaseStuckSends(): Promise<number> {
  try {
    const { supabase } = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("sales_release_stuck_sends");
    if (error) return 0;
    return Number(data ?? 0);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Resultado del envío
// ---------------------------------------------------------------------------

/**
 * Graph aceptó el mensaje. Deliberadamente NO se llama "enviado": un NDR puede
 * llegar después y recién ahí se sabe si fue entregado.
 */
export async function markAccepted(
  id: string,
  graph: { messageId?: string | null; conversationId?: string | null },
): Promise<void> {
  const { supabase } = createSupabaseServerClient();
  await supabase
    .from("sales_send_queue")
    .update({
      status: "ACEPTADO_POR_MICROSOFT",
      accepted_at: new Date().toISOString(),
      graph_message_id: graph.messageId ?? null,
      graph_conversation_id: graph.conversationId ?? null,
      processing_started_at: null,
      last_error: null,
    })
    .eq("id", id);

  // El primer envío real marca el inicio del calentamiento.
  const settings = await getSalesSettings();
  const started = (settings as unknown as { warmup_started_on?: string | null }).warmup_started_on;
  if (!started) {
    await updateSalesSetting("warmup_started_on" as never, new Date().toISOString(), "SYSTEM");
  }
}

export async function markSendError(id: string, error: string): Promise<void> {
  const { supabase } = createSupabaseServerClient();
  const { data } = await supabase
    .from("sales_send_queue")
    .select("attempts, max_attempts")
    .eq("id", id)
    .maybeSingle();

  const exhausted = Number(data?.attempts ?? 1) >= Number(data?.max_attempts ?? 1);

  await supabase
    .from("sales_send_queue")
    .update({
      status: exhausted ? "ERROR" : "PROGRAMADO",
      last_error: error.slice(0, 500),
      processing_started_at: null,
    })
    .eq("id", id);
}

/**
 * Registra un rebote sobre el envío original y detiene lo que corresponda.
 * Un bloqueo del tenant pausa a Zara por completo.
 */
export async function markBounced(input: {
  graphMessageId?: string | null;
  companyId?: string | null;
  code: string;
  kind: "HARD" | "POLICY" | "SOFT" | "UNKNOWN";
  detail: string;
}): Promise<{ matched: boolean; paused: boolean }> {
  const { supabase } = createSupabaseServerClient();
  let matched = false;

  if (input.graphMessageId) {
    const { data } = await supabase
      .from("sales_send_queue")
      .update({
        status: "REBOTADO",
        bounced_at: new Date().toISOString(),
        bounce_code: input.code,
        bounce_kind: input.kind,
        bounce_detail: input.detail.slice(0, 1000),
      })
      .eq("graph_message_id", input.graphMessageId)
      .select("id, company_id");

    matched = (data?.length ?? 0) > 0;
  }

  // El rebote cancela los seguimientos del prospecto: no se insiste.
  if (input.companyId) {
    await supabase
      .from("sales_followups")
      .update({ status: "CANCELADO", cancel_reason: `Rebote ${input.code}` })
      .eq("company_id", input.companyId)
      .eq("status", "PENDIENTE");

    await supabase
      .from("sales_send_queue")
      .update({ status: "CANCELADO", cancel_reason: `Rebote ${input.code}` })
      .eq("company_id", input.companyId)
      .in("status", ["PENDIENTE_ANALISIS", "PENDIENTE_REVISION", "PROGRAMADO"]);
  }

  let paused = false;

  if (input.kind === "POLICY") {
    // Bloqueo del tenant: se detiene TODO de inmediato y sin reintentos.
    await updateSalesSetting("zara_paused", true, "SYSTEM");
    await updateSalesSetting(
      "pause_reason" as never,
      `Bloqueo de entrega ${input.code}. Revisa SPF, DKIM y DMARC antes de reanudar.`,
      "SYSTEM",
    );
    await updateSalesSetting("last_bounce_code" as never, input.code, "SYSTEM");
    paused = true;

    await notifySalesEvent({
      priority: "ALTA",
      title: `Zara pausada automáticamente · ${input.code}`,
      detail:
        "El servidor de destino rechazó el envío por política o reputación. La cola quedó " +
        "detenida y los pendientes se conservan sin enviar. No se harán reintentos automáticos.",
      companyId: input.companyId,
    });

    await logSalesEvent({
      companyId: input.companyId,
      type: SALES_EVENT_TYPES.ERROR,
      title: `Pausa automática por ${input.code}`,
      detail: input.detail.slice(0, 400),
      actor: "SYSTEM",
    });
  }

  return { matched, paused };
}

// ---------------------------------------------------------------------------
// Reprogramación del atraso
// ---------------------------------------------------------------------------

/**
 * Reparte de nuevo los envíos vencidos. Se usa al reactivar Zara: si estuvo
 * detenida, despacharlos todos juntos sería la misma ráfaga que se evita.
 */
export async function rescheduleOverdue(): Promise<number> {
  const { supabase } = createSupabaseServerClient();

  const { data } = await supabase
    .from("sales_send_queue")
    .select("id")
    .eq("status", "PROGRAMADO")
    .lt("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  const overdue = data ?? [];
  if (overdue.length === 0) return 0;

  const dates = rescheduleBacklog(overdue.length);

  for (let index = 0; index < overdue.length; index += 1) {
    await supabase
      .from("sales_send_queue")
      .update({ scheduled_at: dates[index].toISOString() })
      .eq("id", overdue[index].id);
  }

  return overdue.length;
}

// ---------------------------------------------------------------------------
// Métricas para el panel
// ---------------------------------------------------------------------------

export type QueueStats = {
  pendingAnalysis: number;
  pendingReview: number;
  scheduled: number;
  processing: number;
  acceptedToday: number;
  sentWithoutBounce: number;
  bounced: number;
  errors: number;
  nextSendAt: string | null;
  lastBounceCode: string | null;
};

export async function getQueueStats(): Promise<QueueStats> {
  const empty: QueueStats = {
    pendingAnalysis: 0,
    pendingReview: 0,
    scheduled: 0,
    processing: 0,
    acceptedToday: 0,
    sentWithoutBounce: 0,
    bounced: 0,
    errors: 0,
    nextSendAt: null,
    lastBounceCode: null,
  };

  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_send_queue")
      .select("status, scheduled_at, accepted_at, bounce_code")
      .limit(2000);

    const rows = data ?? [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const stats = { ...empty };
    let nextSend: number | null = null;
    let lastBounce: string | null = null;

    for (const row of rows) {
      switch (row.status) {
        case "PENDIENTE_ANALISIS":
          stats.pendingAnalysis += 1;
          break;
        case "PENDIENTE_REVISION":
          stats.pendingReview += 1;
          break;
        case "PROGRAMADO": {
          stats.scheduled += 1;
          const ts = row.scheduled_at ? new Date(row.scheduled_at).getTime() : null;
          if (ts && (nextSend === null || ts < nextSend)) nextSend = ts;
          break;
        }
        case "PROCESANDO":
          stats.processing += 1;
          break;
        case "ACEPTADO_POR_MICROSOFT":
          stats.sentWithoutBounce += 1;
          break;
        case "ENVIADO_SIN_REBOTE":
          stats.sentWithoutBounce += 1;
          break;
        case "REBOTADO":
          stats.bounced += 1;
          if (row.bounce_code) lastBounce = row.bounce_code as string;
          break;
        case "ERROR":
          stats.errors += 1;
          break;
      }

      if (row.accepted_at && new Date(row.accepted_at) >= todayStart) {
        stats.acceptedToday += 1;
      }
    }

    stats.nextSendAt = nextSend ? new Date(nextSend).toISOString() : null;
    stats.lastBounceCode = lastBounce;
    return stats;
  } catch {
    return empty;
  }
}

/** Próximos envíos programados, para la vista de calendario. */
export async function getUpcomingSends(limit = 25) {
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_send_queue")
      .select("id, company_id, kind, subject, scheduled_at, recipient_email")
      .eq("status", "PROGRAMADO")
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    return data ?? [];
  } catch {
    return [];
  }
}

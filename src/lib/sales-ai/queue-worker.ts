import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  claimNextSend,
  markAccepted,
  markSendError,
  releaseStuckSends,
  scheduleQueueItem,
  type QueueItem,
} from "./queue";
import { composeOutreach } from "./composer";
import { sendCommercialEmail } from "./mailer";
import { getCompany, logSalesEvent } from "./repository";
import { getSalesSettings } from "./settings";
import { evaluateFollowupGuards } from "./rules";
import { SALES_EVENT_TYPES } from "./types";

/**
 * Trabajador de la cola.
 *
 * Cada ejecución del cron procesa COMO MÁXIMO un envío. No se usa Promise.all
 * ni ningún paralelismo: fue precisamente el despacho simultáneo lo que produjo
 * la ráfaga rechazada por Microsoft.
 */

export type WorkerResult = {
  released: number;
  analyzed: number;
  scheduled: number;
  sent: number;
  detail: string;
};

/**
 * Prepara el contenido de los envíos que están esperando análisis.
 *
 * Se hace por separado del envío para poder analizar cien prospectos sin
 * mandarles nada, y para no gastar IA en los que después se cancelen.
 */
export async function processPendingAnalysis(limit = 3): Promise<{ analyzed: number; scheduled: number }> {
  const { supabase } = createSupabaseServerClient();
  const settings = await getSalesSettings();

  if (settings.zara_paused) return { analyzed: 0, scheduled: 0 };

  const { data } = await supabase
    .from("sales_send_queue")
    .select("id, company_id, kind, recipient_email")
    .eq("status", "PENDIENTE_ANALISIS")
    .order("created_at", { ascending: true })
    .limit(limit);

  let analyzed = 0;
  let scheduled = 0;

  for (const item of data ?? []) {
    if (!item.company_id) continue;

    const company = await getCompany(item.company_id as string);
    if (!company) {
      await supabase
        .from("sales_send_queue")
        .update({ status: "CANCELADO", cancel_reason: "La empresa ya no existe." })
        .eq("id", item.id);
      continue;
    }

    // Revalidación antes de gastar IA: puede haber cambiado desde que se encoló.
    if (company.do_not_contact || company.email_invalid || !company.primary_email) {
      await supabase
        .from("sales_send_queue")
        .update({
          status: "CANCELADO",
          cancel_reason: company.do_not_contact
            ? "Pidió no ser contactada."
            : company.email_invalid
              ? "Su correo rebotó antes."
              : "Sin correo registrado.",
        })
        .eq("id", item.id);
      continue;
    }

    const composed = await composeOutreach(item.company_id as string);
    analyzed += 1;

    if (!composed.ok || !composed.content) {
      await supabase
        .from("sales_send_queue")
        .update({
          status: "PENDIENTE_REVISION",
          requires_review: true,
          review_reason: composed.reviewReason ?? composed.error ?? "No se pudo redactar.",
        })
        .eq("id", item.id);
      continue;
    }

    await supabase
      .from("sales_send_queue")
      .update({
        subject: composed.content.subject,
        body: composed.content.body_text,
        content: composed.content,
        recipient_email: company.primary_email,
        confidence: composed.content.confidence,
        requires_review: composed.requiresReview,
        review_reason: composed.reviewReason ?? null,
        status: composed.requiresReview ? "PENDIENTE_REVISION" : "PENDIENTE_ANALISIS",
      })
      .eq("id", item.id);

    // Solo lo que pasó el control de calidad se programa solo.
    if (!composed.requiresReview) {
      const result = await scheduleQueueItem(item.id as string);
      if (result.ok) scheduled += 1;
    }
  }

  return { analyzed, scheduled };
}

/** Comprueba, justo antes de enviar, que el envío siga teniendo sentido. */
async function stillValid(item: QueueItem): Promise<{ ok: boolean; reason?: string }> {
  if (!item.company_id) return { ok: false, reason: "Sin empresa asociada." };

  const company = await getCompany(item.company_id);
  if (!company) return { ok: false, reason: "La empresa ya no existe." };

  if (item.kind === "SEGUIMIENTO") {
    const { supabase } = createSupabaseServerClient();
    const { data: inbound } = await supabase
      .from("sales_messages")
      .select("id")
      .eq("company_id", item.company_id)
      .eq("direction", "INBOUND")
      .limit(1);

    const guard = evaluateFollowupGuards({
      status: company.status,
      doNotContact: company.do_not_contact,
      emailInvalid: Boolean(company.email_invalid),
      hasEmail: Boolean(company.primary_email),
      alreadyReplied: (inbound?.length ?? 0) > 0,
    });

    if (!guard.shouldSend) return { ok: false, reason: guard.reason };
  }

  if (company.do_not_contact) return { ok: false, reason: "Pidió no ser contactada." };
  if (company.email_invalid) {
    return { ok: false, reason: "Su correo rebotó antes." };
  }
  if (!company.primary_email && !item.recipient_email) {
    return { ok: false, reason: "Sin dirección de destino." };
  }

  return { ok: true };
}

/**
 * Envía como máximo UN correo. Devuelve el detalle de lo ocurrido para el
 * registro del cron.
 */
export async function processOneSend(): Promise<{ sent: number; detail: string }> {
  const item = await claimNextSend();
  if (!item) return { sent: 0, detail: "Nada vencido, en curso o sin cupo." };

  const { supabase } = createSupabaseServerClient();

  const validity = await stillValid(item);
  if (!validity.ok) {
    await supabase
      .from("sales_send_queue")
      .update({
        status: "CANCELADO",
        cancel_reason: validity.reason,
        processing_started_at: null,
      })
      .eq("id", item.id);

    return { sent: 0, detail: `Cancelado: ${validity.reason}` };
  }

  const recipient = item.recipient_email ?? "";
  if (!recipient || !item.subject || !item.body) {
    await markSendError(item.id, "Faltaba destinatario, asunto o cuerpo.");
    return { sent: 0, detail: "Envío incompleto." };
  }

  const result = await sendCommercialEmail({
    companyId: item.company_id,
    threadId: item.thread_id,
    recipient,
    subject: item.subject,
    body: item.body,
  });

  if (!result.ok) {
    await markSendError(item.id, result.error ?? "Error desconocido.");
    return { sent: 0, detail: `Fallo de envío: ${result.error}` };
  }

  await markAccepted(item.id, {
    messageId: result.messageId,
    conversationId: result.conversationId,
  });

  await logSalesEvent({
    companyId: item.company_id,
    type: SALES_EVENT_TYPES.EMAIL_SENT,
    title: "Correo aceptado por Microsoft",
    detail: `${item.subject}${result.redirected ? " · MODO PRUEBA" : ""}`,
    actor: "ZARA",
  });

  return { sent: 1, detail: `Aceptado para ${recipient}` };
}

/** Ciclo completo que ejecuta el cron. */
export async function runQueueCycle(): Promise<WorkerResult> {
  const released = await releaseStuckSends();
  const { analyzed, scheduled } = await processPendingAnalysis(3);
  const { sent, detail } = await processOneSend();

  return { released, analyzed, scheduled, sent, detail };
}

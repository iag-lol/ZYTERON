import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getConversationMessages, getMessage, type GraphMessage } from "./graph-client";
import { markEmailInvalid } from "./mailer";
import { detectAutoReply, detectBounce, detectOptOut } from "./rules";
import { analyzeIncomingEmail, decideAction, draftReply } from "./zara-brain";
import { getZaraProfile } from "./zara-identity";
import { logSalesEvent, markDoNotContact } from "./repository";
import { notifySalesEvent } from "./notifications";
import { SALES_EVENT_TYPES, type SalesStatus } from "./types";

/**
 * Procesamiento de correo entrante. El webhook solo dispara este flujo: el
 * contenido real siempre se pide a Graph, nunca se confía en el payload.
 */

// Las detecciones por patrón viven en rules.ts (puras y testeables).
export { detectOptOut, detectAutoReply } from "./rules";

function plainText(message: GraphMessage): string {
  const raw = message.body?.content ?? message.bodyPreview ?? "";
  if (message.body?.contentType?.toLowerCase() === "html") {
    return raw
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return raw.trim();
}

/** Recorta la cita del mensaje anterior para no gastar tokens de más. */
function stripQuotedReply(text: string): string {
  const markers = [
    /\nDe:\s/i,
    /\nFrom:\s/i,
    /\nEl\s+.+escribi[óo]:/i,
    /\nOn\s+.+wrote:/i,
    /\n-{2,}\s*Mensaje original/i,
  ];
  let cut = text.length;
  for (const marker of markers) {
    const match = text.match(marker);
    if (match?.index != null && match.index < cut) cut = match.index;
  }
  return text.slice(0, cut).trim();
}

async function findCompanyByEmail(email: string) {
  const { supabase } = createSupabaseServerClient();
  const normalized = email.toLowerCase();

  const { data: direct } = await supabase
    .from("sales_companies")
    .select("*")
    .ilike("primary_email", normalized)
    .maybeSingle();
  if (direct) return direct;

  // Segundo intento por dominio: escribió otra persona de la misma empresa.
  const domain = normalized.split("@")[1];
  if (!domain) return null;

  const { data: byDomain } = await supabase
    .from("sales_companies")
    .select("*")
    .eq("website_domain", domain)
    .maybeSingle();

  return byDomain ?? null;
}

async function upsertThread(message: GraphMessage, companyId: string | null) {
  const { supabase } = createSupabaseServerClient();
  const conversationId = message.conversationId;
  if (!conversationId) return null;

  const { data: existing } = await supabase
    .from("sales_threads")
    .select("id, message_count")
    .eq("graph_conversation_id", conversationId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("sales_threads")
      .update({
        last_message_at: message.receivedDateTime ?? new Date().toISOString(),
        message_count: Number(existing.message_count ?? 0) + 1,
        awaiting_reply: false,
        ...(companyId ? { company_id: companyId } : {}),
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const participants = [
    message.from?.emailAddress?.address,
    ...(message.toRecipients ?? []).map((r) => r.emailAddress?.address),
  ].filter(Boolean) as string[];

  const { data: created } = await supabase
    .from("sales_threads")
    .insert({
      company_id: companyId,
      graph_conversation_id: conversationId,
      subject: message.subject ?? null,
      participants,
      last_message_at: message.receivedDateTime ?? new Date().toISOString(),
      message_count: 1,
      awaiting_reply: false,
    })
    .select("id")
    .single();

  return (created?.id as string) ?? null;
}

/** Cancela seguimientos pendientes: el prospecto respondió. */
async function cancelPendingFollowups(companyId: string, reason: string) {
  const { supabase } = createSupabaseServerClient();
  const { data } = await supabase
    .from("sales_followups")
    .update({ status: "CANCELADO", cancel_reason: reason })
    .eq("company_id", companyId)
    .eq("status", "PENDIENTE")
    .select("id");

  if ((data?.length ?? 0) > 0) {
    await logSalesEvent({
      companyId,
      type: SALES_EVENT_TYPES.FOLLOWUP_CANCELLED,
      title: `${data?.length} seguimiento(s) cancelado(s)`,
      detail: reason,
      actor: "SYSTEM",
    });
  }
}

export type InboundResult = {
  processed: boolean;
  reason?: string;
  companyId?: string | null;
  messageId?: string;
  action?: string;
};

/**
 * Procesa un mensaje entrante identificado por su ID de Graph.
 * Orden: guardar siempre primero, analizar después. Así no se pierde nada
 * aunque falle la IA o el presupuesto esté agotado.
 */
export async function processInboundMessage(graphMessageId: string): Promise<InboundResult> {
  const { supabase } = createSupabaseServerClient();
  const profile = await getZaraProfile();

  // Idempotencia: Microsoft puede reenviar la misma notificación.
  const { data: existing } = await supabase
    .from("sales_messages")
    .select("id")
    .eq("graph_message_id", graphMessageId)
    .maybeSingle();
  if (existing) return { processed: false, reason: "Mensaje ya procesado." };

  const message = await getMessage(graphMessageId);
  const fromEmail = message.from?.emailAddress?.address?.toLowerCase() ?? "";

  // No procesamos nuestros propios envíos.
  if (fromEmail && profile.mailboxAddress && fromEmail === profile.mailboxAddress.toLowerCase()) {
    return { processed: false, reason: "Mensaje propio, se ignora." };
  }

  const bodyFull = plainText(message);
  const body = stripQuotedReply(bodyFull);
  const subject = message.subject ?? "";

  const company = fromEmail ? await findCompanyByEmail(fromEmail) : null;
  const companyId = (company?.id as string) ?? null;
  const threadId = await upsertThread(message, companyId);

  // Rebote: se marca la dirección y no se sigue el flujo comercial.
  if (detectBounce({ from: fromEmail, subject, body: bodyFull })) {
    if (companyId) await markEmailInvalid(companyId, `Rebote recibido: ${subject}`);
    await supabase.from("sales_messages").insert({
      thread_id: threadId,
      company_id: companyId,
      graph_message_id: message.id,
      graph_internet_message_id: message.internetMessageId ?? null,
      direction: "INBOUND",
      from_email: fromEmail,
      from_name: message.from?.emailAddress?.name ?? null,
      subject,
      body_preview: message.bodyPreview ?? null,
      body_text: body,
      sent_at: message.receivedDateTime ?? new Date().toISOString(),
      ai_analyzed: true,
      ai_intent: "REBOTE",
      ai_requires_human: false,
      ai_summary: "Rebote de entrega. La dirección quedó marcada como inválida.",
    });
    return { processed: true, companyId, action: "BOUNCE" };
  }

  // Guardamos el mensaje SIEMPRE, antes de cualquier análisis.
  const { data: saved } = await supabase
    .from("sales_messages")
    .insert({
      thread_id: threadId,
      company_id: companyId,
      graph_message_id: message.id,
      graph_internet_message_id: message.internetMessageId ?? null,
      direction: "INBOUND",
      from_email: fromEmail,
      from_name: message.from?.emailAddress?.name ?? null,
      to_emails: (message.toRecipients ?? [])
        .map((r) => r.emailAddress?.address)
        .filter(Boolean) as string[],
      subject,
      body_preview: message.bodyPreview ?? null,
      body_text: body,
      has_attachments: Boolean(message.hasAttachments),
      sent_at: message.receivedDateTime ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  const savedId = saved?.id as string | undefined;

  if (companyId) {
    await supabase
      .from("sales_companies")
      .update({ last_interaction_at: new Date().toISOString() })
      .eq("id", companyId);

    await logSalesEvent({
      companyId,
      type: SALES_EVENT_TYPES.EMAIL_RECEIVED,
      title: `Respuesta recibida: ${subject || "(sin asunto)"}`,
      detail: body.slice(0, 300),
      actor: "SYSTEM",
    });

    await cancelPendingFollowups(companyId, "El prospecto respondió.");
  }

  // Baja explícita: manda sobre cualquier análisis y no consume IA.
  if (detectOptOut(body)) {
    if (companyId) {
      await markDoNotContact(companyId, "El destinatario pidió no recibir más correos.", "SYSTEM");
      await supabase.from("sales_companies").update({ status: "PERDIDO", lost_reason: "NO_INTERESADO" }).eq("id", companyId);
    }
    if (savedId) {
      await supabase
        .from("sales_messages")
        .update({
          ai_analyzed: true,
          ai_intent: "PIDE_NO_CONTACTAR",
          ai_requires_human: false,
          ai_summary: "El destinatario pidió no ser contactado. Se detuvo todo envío futuro.",
        })
        .eq("id", savedId);
    }
    await notifySalesEvent({
      priority: "ALTA",
      title: "Solicitud de no contactar",
      detail: `${fromEmail} pidió no recibir más correos. Se canceló todo envío.`,
      companyId,
    });
    return { processed: true, companyId, messageId: savedId, action: "OPT_OUT" };
  }

  // Fuera de oficina: no es interés comercial y no gasta IA.
  if (detectAutoReply(subject, body)) {
    if (savedId) {
      await supabase
        .from("sales_messages")
        .update({
          ai_analyzed: true,
          ai_intent: "RESPUESTA_AUTOMATICA",
          ai_requires_human: false,
          ai_summary: "Respuesta automática (fuera de oficina). No se considera interés comercial.",
          ai_recommended_action: "Reprogramar el seguimiento para más adelante.",
        })
        .eq("id", savedId);
    }
    return { processed: true, companyId, messageId: savedId, action: "AUTO_REPLY" };
  }

  // Contexto acotado del hilo: solo lo necesario para entender, sin mandar todo.
  let threadSummary = "";
  if (message.conversationId) {
    try {
      const previous = await getConversationMessages(message.conversationId, 6);
      threadSummary = previous
        .filter((item) => item.id !== message.id)
        .slice(0, 5)
        .map((item) => {
          const who = item.from?.emailAddress?.address ?? "?";
          const when = item.receivedDateTime?.slice(0, 10) ?? "";
          return `- ${when} ${who}: ${(item.bodyPreview ?? "").slice(0, 200)}`;
        })
        .join("\n");
    } catch {
      threadSummary = "";
    }
  }

  const analysis = await analyzeIncomingEmail({
    companyId,
    threadSummary,
    incomingMessage: body.slice(0, 4000),
  });

  if (!analysis.ok || !analysis.data) {
    await notifySalesEvent({
      priority: "ALTA",
      title: "Respuesta recibida sin analizar",
      detail: `${fromEmail}: ${subject}. Motivo: ${analysis.error ?? "desconocido"}`,
      companyId,
    });
    return { processed: true, companyId, messageId: savedId, action: "SAVED_NO_ANALYSIS" };
  }

  const data = analysis.data;

  if (savedId) {
    await supabase
      .from("sales_messages")
      .update({
        ai_analyzed: true,
        ai_intent: data.intent,
        ai_confidence: data.confidence,
        ai_summary: data.summary,
        ai_recommended_action: data.recommended_action,
        ai_requires_human: data.requires_human,
        ai_reason: data.reason,
      })
      .eq("id", savedId);
  }

  // Actualizamos el estado solo cuando el análisis es confiable.
  if (companyId && data.confidence >= 0.8) {
    await supabase
      .from("sales_companies")
      .update({ status: data.lead_status as SalesStatus, potential: data.potential })
      .eq("id", companyId);

    await logSalesEvent({
      companyId,
      type: SALES_EVENT_TYPES.EMAIL_ANALYZED,
      title: `Clasificado: ${data.intent}`,
      detail: data.summary,
      actor: "ZARA",
      payload: { confidence: data.confidence },
    });
  }

  const decision = await decideAction(data);

  // Preparamos borrador salvo que la confianza sea demasiado baja.
  if (decision.action !== "NOTIFY_ONLY") {
    const draft = await draftReply({
      companyId,
      threadSummary,
      incomingMessage: body.slice(0, 4000),
      analysis: data,
    });

    if (draft.ok && draft.data) {
      await supabase.from("sales_drafts").insert({
        company_id: companyId,
        thread_id: threadId,
        in_reply_to_message_id: savedId ?? null,
        subject: draft.data.subject,
        body: draft.data.body,
        confidence: draft.data.confidence,
        requires_approval: draft.data.requires_approval || decision.action !== "AUTO_REPLY",
        status: "PENDIENTE",
      });

      if (companyId) {
        await logSalesEvent({
          companyId,
          type: SALES_EVENT_TYPES.DRAFT_CREATED,
          title: "Respuesta preparada",
          detail: decision.reason,
          actor: "ZARA",
        });
      }
    }
  }

  const highInterest = ["INTERESADO", "SOLICITA_COTIZACION", "SOLICITA_REUNION", "NEGOCIACION"];
  await notifySalesEvent({
    priority: data.requires_human || highInterest.includes(data.intent) ? "ALTA" : "NORMAL",
    title: `Respuesta de ${company?.name ?? fromEmail}`,
    detail: `${data.intent} · ${data.summary}`,
    companyId,
  });

  return { processed: true, companyId, messageId: savedId, action: decision.action };
}

import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSalesSettings } from "./settings";
import { getZaraProfile, appendSignature, buildHtmlEmail } from "./zara-identity";
import { findForbiddenClientTerms } from "./rules";
import { replyInThread, sendNewMail, type GraphMessage } from "./graph-client";
import { isOptedOut, logSalesEvent } from "./repository";
import { SALES_EVENT_TYPES } from "./types";

/**
 * Capa de envío. Concentra las barreras que deben cumplirse SIEMPRE antes de
 * que un correo salga: pausa, opt-out, modo prueba, límites y terminología.
 */

export type SendGuardResult =
  | { allowed: true; recipient: string; redirected: boolean }
  | { allowed: false; reason: string };

/** Cuántos correos comerciales se enviaron hoy y en la última hora. */
async function getSendCounts(): Promise<{ today: number; lastHour: number }> {
  try {
    const { supabase } = createSupabaseServerClient();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data } = await supabase
      .from("sales_messages")
      .select("sent_at")
      .eq("direction", "OUTBOUND")
      .gte("sent_at", dayStart.toISOString());

    const rows = data ?? [];
    const lastHour = rows.filter((row) => row.sent_at && new Date(row.sent_at) >= hourAgo).length;
    return { today: rows.length, lastHour };
  } catch {
    return { today: 0, lastHour: 0 };
  }
}

/**
 * Verifica todas las condiciones antes de enviar. En modo prueba redirige al
 * destinatario autorizado en lugar de bloquear, para poder probar el flujo.
 */
export async function checkSendGuards(input: {
  recipient: string;
  companyId?: string | null;
  isCampaign?: boolean;
}): Promise<SendGuardResult> {
  const settings = await getSalesSettings();

  if (settings.zara_paused) {
    return { allowed: false, reason: "Zara está pausada por el administrador." };
  }

  if (!input.recipient?.includes("@")) {
    return { allowed: false, reason: "El destinatario no tiene un correo válido." };
  }

  if (await isOptedOut(input.recipient)) {
    return { allowed: false, reason: "El destinatario está en la lista de no contactar." };
  }

  if (input.companyId) {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_companies")
      .select("do_not_contact, email_invalid")
      .eq("id", input.companyId)
      .maybeSingle();

    if (data?.do_not_contact) {
      return { allowed: false, reason: "La empresa está marcada como NO CONTACTAR." };
    }
    if (data?.email_invalid) {
      return { allowed: false, reason: "La dirección rebotó antes y quedó marcada como inválida." };
    }
  }

  const counts = await getSendCounts();
  if (counts.today >= settings.daily_send_limit) {
    return { allowed: false, reason: `Se alcanzó el límite diario de ${settings.daily_send_limit} envíos.` };
  }
  if (counts.lastHour >= settings.hourly_send_limit) {
    return { allowed: false, reason: `Se alcanzó el límite de ${settings.hourly_send_limit} envíos por hora.` };
  }

  // Modo prueba: nada llega a un prospecto real.
  if (settings.test_mode) {
    const testRecipient = settings.test_mode_recipient?.trim();
    if (!testRecipient) {
      return {
        allowed: false,
        reason: "Modo prueba activo pero sin destinatario de pruebas configurado.",
      };
    }
    return { allowed: true, recipient: testRecipient, redirected: true };
  }

  return { allowed: true, recipient: input.recipient, redirected: false };
}

export type SendResult = {
  ok: boolean;
  messageId?: string;
  /** Identificador que Microsoft cita en los NDR. Clave para correlacionar rebotes. */
  internetMessageId?: string;
  conversationId?: string;
  error?: string;
  redirected?: boolean;
};

/**
 * Envía un correo comercial. Si `replyToGraphMessageId` viene informado, la
 * respuesta se hace DENTRO del hilo de Outlook en vez de abrir uno nuevo.
 */
/**
 * Token de reserva. Solo el trabajador de la cola lo conoce, y sin él esta
 * función se niega a enviar: es la barrera que impide que un flujo nuevo se
 * salte la reserva global y vuelva a producir envíos simultáneos.
 */
const QUEUE_DISPATCH_TOKEN = Symbol.for("zyteron.sales-ai.queue-dispatch");

export type DispatchTicket = { readonly token: symbol; readonly queueItemId: string };

/** Solo queue-worker debe crear tickets. */
export function createDispatchTicket(queueItemId: string): DispatchTicket {
  return { token: QUEUE_DISPATCH_TOKEN, queueItemId };
}

export async function sendCommercialEmail(input: {
  companyId?: string | null;
  threadId?: string | null;
  recipient: string;
  subject: string;
  body: string;
  replyToGraphMessageId?: string | null;
  replyAll?: boolean;
  isCampaign?: boolean;
  actor?: string;
  /** Obligatorio: acredita que el envío viene de una reserva válida de la cola. */
  ticket: DispatchTicket;
}): Promise<SendResult> {
  if (input.ticket?.token !== QUEUE_DISPATCH_TOKEN) {
    return {
      ok: false,
      error:
        "Envío rechazado: todo correo debe salir por la cola con una reserva válida. " +
        "Usa enqueueSend en vez de llamar directamente al envío.",
    };
  }

  const guard = await checkSendGuards({
    recipient: input.recipient,
    companyId: input.companyId,
    isCampaign: input.isCampaign,
  });

  if (!guard.allowed) {
    return { ok: false, error: guard.reason };
  }

  const profile = await getZaraProfile();

  // Control de terminología: nada que mencione IA sale hacia el cliente.
  const forbidden = findForbiddenClientTerms(input.body);
  if (forbidden.length > 0) {
    return {
      ok: false,
      error: `El texto contiene terminología no permitida hacia clientes: ${forbidden.join(", ")}.`,
    };
  }

  const prefix = guard.redirected ? `[PRUEBA · destinatario real: ${input.recipient}]\n\n` : "";

  // Se envía en HTML para que la firma con logo se vea correctamente. El texto
  // plano se conserva para guardarlo en el historial y para la vista previa.
  const plainBody = appendSignature(input.body, profile);
  const htmlBody = buildHtmlEmail(`${prefix}${input.body}`, profile);

  try {
    let sent: GraphMessage;

    if (input.replyToGraphMessageId && !guard.redirected) {
      sent = await replyInThread({
        messageId: input.replyToGraphMessageId,
        body: htmlBody,
        isHtml: true,
        replyAll: input.replyAll,
      });
    } else {
      sent = await sendNewMail({
        to: [guard.recipient],
        subject: input.subject,
        body: htmlBody,
        isHtml: true,
      });
    }

    const { supabase } = createSupabaseServerClient();
    await supabase.from("sales_messages").insert({
      thread_id: input.threadId ?? null,
      company_id: input.companyId ?? null,
      graph_message_id: sent.id,
      graph_internet_message_id: sent.internetMessageId ?? null,
      direction: "OUTBOUND",
      from_email: profile.mailboxAddress,
      from_name: profile.displayName,
      to_emails: [input.recipient],
      subject: input.subject,
      body_preview: plainBody.slice(0, 250),
      body_text: plainBody,
      sent_at: new Date().toISOString(),
    });

    if (input.companyId) {
      await supabase
        .from("sales_companies")
        .update({ last_interaction_at: new Date().toISOString() })
        .eq("id", input.companyId);

      await logSalesEvent({
        companyId: input.companyId,
        type: SALES_EVENT_TYPES.EMAIL_SENT,
        title: `Correo enviado: ${input.subject}`,
        detail: guard.redirected
          ? `MODO PRUEBA · redirigido a ${guard.recipient}`
          : `Enviado a ${input.recipient}`,
        actor: input.actor ?? "ZARA",
        isAutomated: !input.actor,
      });
    }

    return {
      ok: true,
      messageId: sent.id,
      internetMessageId: sent.internetMessageId,
      conversationId: sent.conversationId,
      redirected: guard.redirected,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al enviar el correo.";

    if (input.companyId) {
      await logSalesEvent({
        companyId: input.companyId,
        type: SALES_EVENT_TYPES.ERROR,
        title: "Fallo al enviar correo",
        detail: message,
        actor: "ZARA",
      });
    }

    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Rebotes
// ---------------------------------------------------------------------------

export { detectBounce } from "./rules";

export async function markEmailInvalid(companyId: string, detail: string) {
  try {
    const { supabase } = createSupabaseServerClient();
    await supabase.from("sales_companies").update({ email_invalid: true }).eq("id", companyId);

    // Un correo que rebota no puede recibir seguimientos.
    await supabase
      .from("sales_followups")
      .update({ status: "CANCELADO", cancel_reason: "Correo inválido (rebote)" })
      .eq("company_id", companyId)
      .eq("status", "PENDIENTE");

    await logSalesEvent({
      companyId,
      type: SALES_EVENT_TYPES.ERROR,
      title: "Correo inválido: rebote permanente",
      detail,
      actor: "SYSTEM",
    });
  } catch {
    // best-effort
  }
}

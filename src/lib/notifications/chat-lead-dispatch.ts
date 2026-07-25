import { siteConfig } from "@/config/site";
import { sendLeadAlertEmail } from "@/lib/notifications/lead-alert";

/**
 * Despacho de avisos cuando la IA del chat capta un interés/cotización.
 *
 * Objetivo: dejar SIEMPRE registro de lo que pasa (logs) y enviar avisos por
 * correo (Resend) y WhatsApp (Meta Cloud API, con respaldo Twilio) si están
 * configurados. Nunca lanza: si algo falta, lo registra como "skipped".
 */

export type ChatLeadPayload = {
  leadId: string;
  name: string;
  contact: string;
  email: string | null;
  phone: string | null;
  projectType: string;
  summary: string;
  budget?: string | null;
  isQuote: boolean;
  createdAtIso: string;
};

type ChannelResult = "sent" | "skipped" | "failed";

export type DispatchReport = {
  email: ChannelResult;
  whatsapp: ChannelResult;
  detail: Record<string, string>;
};

function env(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

function log(kind: string, data: Record<string, unknown>) {
  // Registro técnico visible en los logs de Render.
  try {
    console.log(`[chat-lead] ${kind}`, JSON.stringify(data));
  } catch {
    console.log(`[chat-lead] ${kind}`);
  }
}

function buildMessageText(p: ChatLeadPayload) {
  const lines = [
    p.isQuote
      ? "Nueva SOLICITUD DE COTIZACIÓN desde el chat con IA"
      : "Nuevo interés de cliente desde el chat con IA",
    `Nombre: ${p.name}`,
    `Contacto: ${p.contact}`,
    `Proyecto: ${p.projectType}`,
  ];
  if (p.budget) lines.push(`Presupuesto: ${p.budget}`);
  lines.push(`Resumen: ${p.summary}`);
  lines.push(`Fecha: ${new Date(p.createdAtIso).toLocaleString("es-CL")}`);
  lines.push(`Panel: ${siteConfig.url}/admin/contactos`);
  return lines.join("\n");
}

// -- Correo (Resend) --------------------------------------------------------

async function sendEmail(p: ChatLeadPayload): Promise<{ result: ChannelResult; detail: string }> {
  if (!env("RESEND_API_KEY")) {
    log("email:skipped", { reason: "no RESEND_API_KEY", leadId: p.leadId });
    return { result: "skipped", detail: "no RESEND_API_KEY" };
  }

  // Reutilizamos la plantilla HTML de marca de los leads del sitio.
  const messageLines = [
    p.isQuote ? "Solicitud de cotización desde el asistente con IA." : "Interés captado desde el asistente con IA.",
    "",
    `Contacto entregado: ${p.contact}`,
    p.budget ? `Presupuesto mencionado: ${p.budget}` : "",
    "",
    p.summary,
  ].filter(Boolean);

  try {
    const outcome = await sendLeadAlertEmail({
      leadId: p.leadId,
      source: "CHAT_IA",
      submittedAtIso: p.createdAtIso,
      name: p.name,
      email: p.email || siteConfig.contact.email,
      phone: p.phone,
      service: p.projectType,
      message: messageLines.join("\n"),
      submittedFrom: "Asistente IA (chat web)",
    });

    if (outcome.sent) {
      log("email:sent", { leadId: p.leadId, id: outcome.id });
      return { result: "sent", detail: outcome.id || "resend" };
    }
    log("email:skipped", { leadId: p.leadId, reason: outcome.reason });
    return { result: "skipped", detail: outcome.reason || "no enviado" };
  } catch (err) {
    log("email:failed", { leadId: p.leadId, error: String(err) });
    return { result: "failed", detail: "exception" };
  }
}

// -- WhatsApp (Meta Cloud API, respaldo Twilio) -----------------------------

async function sendWhatsappViaMeta(
  p: ChatLeadPayload,
): Promise<{ result: ChannelResult; detail: string } | null> {
  const token = env("META_WHATSAPP_TOKEN");
  const phoneId = env("META_WHATSAPP_PHONE_ID");
  const to = env("META_WHATSAPP_TO") || siteConfig.contact.phone.replace(/\D/g, "");

  if (!token || !phoneId || !to) return null; // no configurado: probamos otro canal

  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "text",
        text: { body: buildMessageText(p) },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log("whatsapp:failed", { via: "meta", leadId: p.leadId, status: res.status, body: body.slice(0, 300) });
      return { result: "failed", detail: `meta ${res.status}` };
    }
    log("whatsapp:sent", { via: "meta", leadId: p.leadId, to });
    return { result: "sent", detail: "meta" };
  } catch (err) {
    log("whatsapp:failed", { via: "meta", leadId: p.leadId, error: String(err) });
    return { result: "failed", detail: "meta exception" };
  }
}

async function sendWhatsappViaTwilio(
  p: ChatLeadPayload,
): Promise<{ result: ChannelResult; detail: string } | null> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_WHATSAPP_FROM");
  const to = env("WHATSAPP_NOTIFY_TO") || env("TWILIO_WHATSAPP_TO");
  if (!sid || !authToken || !from || !to) return null;

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
  const basicAuth = Buffer.from(`${sid}:${authToken}`).toString("base64");
  const body = new URLSearchParams();
  body.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
  body.set("To", to.startsWith("whatsapp:") ? to : `whatsapp:${to}`);
  body.set("Body", buildMessageText(p));

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      log("whatsapp:failed", { via: "twilio", leadId: p.leadId, status: res.status });
      return { result: "failed", detail: `twilio ${res.status}` };
    }
    log("whatsapp:sent", { via: "twilio", leadId: p.leadId });
    return { result: "sent", detail: "twilio" };
  } catch (err) {
    log("whatsapp:failed", { via: "twilio", leadId: p.leadId, error: String(err) });
    return { result: "failed", detail: "twilio exception" };
  }
}

async function sendWhatsapp(p: ChatLeadPayload): Promise<{ result: ChannelResult; detail: string }> {
  const meta = await sendWhatsappViaMeta(p);
  if (meta) return meta;
  const twilio = await sendWhatsappViaTwilio(p);
  if (twilio) return twilio;
  log("whatsapp:skipped", { reason: "no config (meta/twilio)", leadId: p.leadId });
  return { result: "skipped", detail: "no config" };
}

// -- Orquestador ------------------------------------------------------------

export async function dispatchChatLeadAlert(p: ChatLeadPayload): Promise<DispatchReport> {
  log("captured", {
    leadId: p.leadId,
    name: p.name,
    contact: p.contact,
    projectType: p.projectType,
    isQuote: p.isQuote,
  });

  const [email, whatsapp] = await Promise.all([sendEmail(p), sendWhatsapp(p)]);

  const report: DispatchReport = {
    email: email.result,
    whatsapp: whatsapp.result,
    detail: { email: email.detail, whatsapp: whatsapp.detail },
  };
  log("dispatch:done", { leadId: p.leadId, ...report });
  return report;
}

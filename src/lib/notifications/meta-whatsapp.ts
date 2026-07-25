/**
 * Envío de mensajes de WhatsApp por Meta Cloud API (WhatsApp Business Platform).
 * Usado por el agente de WhatsApp con IA para responder a los clientes.
 */

function env(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

export function isMetaWhatsappConfigured() {
  return Boolean(env("META_WHATSAPP_TOKEN") && env("META_WHATSAPP_PHONE_ID"));
}

export type MetaSendResult = { ok: boolean; id?: string; error?: string };

/** Envía un mensaje de texto y devuelve el resultado detallado (con id de Meta). */
export async function sendMetaWhatsappMessage(to: string, body: string): Promise<MetaSendResult> {
  const token = env("META_WHATSAPP_TOKEN");
  const phoneId = env("META_WHATSAPP_PHONE_ID");
  const recipient = String(to || "").replace(/\D/g, "");
  const text = String(body || "").slice(0, 4000);

  if (!token || !phoneId || !recipient || !text) {
    return { ok: false, error: "Falta configuración de Meta o datos del mensaje." };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { preview_url: false, body: text },
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { messages?: Array<{ id?: string }>; error?: { message?: string } }
      | null;
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      console.error("[whatsapp] error enviando:", msg);
      return { ok: false, error: msg };
    }
    return { ok: true, id: data?.messages?.[0]?.id };
  } catch (err) {
    console.error("[whatsapp] excepción enviando:", err);
    return { ok: false, error: "Excepción de red al enviar." };
  }
}

/** Compat: envío de texto simple que devuelve boolean. */
export async function sendMetaWhatsappText(to: string, body: string): Promise<boolean> {
  const result = await sendMetaWhatsappMessage(to, body);
  return result.ok;
}

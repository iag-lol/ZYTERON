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

/** Envía un mensaje de texto a un número (formato internacional sin +). */
export async function sendMetaWhatsappText(to: string, body: string): Promise<boolean> {
  const token = env("META_WHATSAPP_TOKEN");
  const phoneId = env("META_WHATSAPP_PHONE_ID");
  const recipient = String(to || "").replace(/\D/g, "");
  const text = String(body || "").slice(0, 4000);

  if (!token || !phoneId || !recipient || !text) {
    console.warn("[whatsapp-agent] envío omitido: falta configuración o datos.");
    return false;
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
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[whatsapp-agent] error enviando:", res.status, detail.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp-agent] excepción enviando:", err);
    return false;
  }
}

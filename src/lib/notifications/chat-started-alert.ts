import { sendMetaWhatsappText } from "@/lib/notifications/meta-whatsapp";
import { siteConfig } from "@/config/site";

/**
 * Aviso al dueño por WhatsApp cuando un visitante INICIA una conversación en el
 * chat web (su primer mensaje). Fire-and-forget: nunca bloquea la respuesta.
 */

function env(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

export async function notifyOwnerChatStarted(firstMessage: string): Promise<void> {
  const to = env("META_WHATSAPP_TO") || siteConfig.contact.phone.replace(/\D/g, "");
  if (!to) return;

  const snippet = String(firstMessage || "").slice(0, 300).trim();
  const body =
    `Nueva conversación iniciada en el chat web de Zyteron.\n\n` +
    `El visitante escribió: "${snippet}"\n\n` +
    `Hora: ${new Date().toLocaleString("es-CL")}\n` +
    `Revisa el panel: ${siteConfig.url}/admin`;

  try {
    const ok = await sendMetaWhatsappText(to, body);
    console.log(`[chat-start] aviso WhatsApp al dueño: ${ok ? "enviado" : "no enviado"}`);
  } catch (err) {
    console.error("[chat-start] error avisando por WhatsApp:", err);
  }
}

/**
 * Registro en memoria de los últimos eventos del webhook de WhatsApp.
 * Sirve para diagnosticar por qué "no llega nada": si Meta llama o no, y qué
 * pasa con cada mensaje. Se pierde al redeploy (no es persistente a propósito).
 */

export type WebhookEvent = {
  at: string;
  kind: string; // 'verify_ok' | 'verify_fail' | 'post_received' | 'message_stored' | 'message_dup' | 'error' | ...
  detail?: string;
};

declare global {
  var zyteronWhatsappWebhookLog: WebhookEvent[] | undefined;
}

const LOG = globalThis.zyteronWhatsappWebhookLog ?? [];
globalThis.zyteronWhatsappWebhookLog = LOG;

export function logWebhook(kind: string, detail?: string) {
  LOG.unshift({ at: new Date().toISOString(), kind, detail: detail?.slice(0, 300) });
  if (LOG.length > 40) LOG.length = 40;
  // También a consola de Render.
  console.log(`[whatsapp-webhook] ${kind}${detail ? ` · ${detail}` : ""}`);
}

export function getWebhookLog(): WebhookEvent[] {
  return [...LOG];
}

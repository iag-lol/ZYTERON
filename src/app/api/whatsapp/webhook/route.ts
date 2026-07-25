import { NextResponse } from "next/server";
import { respondToWhatsappMessage } from "@/lib/ai/whatsapp-agent";
import { sendMetaWhatsappText } from "@/lib/notifications/meta-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

/**
 * Verificación del webhook por Meta (WhatsApp Business Platform).
 * Configura en Meta: Callback URL = https://TU-DOMINIO/api/whatsapp/webhook
 * y Verify Token = el valor de WHATSAPP_VERIFY_TOKEN.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = readEnv("WHATSAPP_VERIFY_TOKEN");

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/**
 * Recepción de mensajes entrantes. Responde con IA como vendedor humano.
 * Devuelve 200 siempre (Meta reintenta ante errores) y procesa de forma segura.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const entries = (payload as { entry?: unknown[] })?.entry;
    if (!Array.isArray(entries)) return NextResponse.json({ ok: true });

    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] })?.changes;
      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        const value = (change as { value?: Record<string, unknown> })?.value;
        if (!value) continue;

        const messages = value.messages as
          | Array<{ from?: string; type?: string; text?: { body?: string } }>
          | undefined;
        if (!Array.isArray(messages) || messages.length === 0) continue;

        const contacts = value.contacts as
          | Array<{ profile?: { name?: string } }>
          | undefined;
        const profileName = contacts?.[0]?.profile?.name;

        for (const message of messages) {
          if (message.type !== "text") continue;
          const from = String(message.from || "").replace(/\D/g, "");
          const text = message.text?.body?.trim();
          if (!from || !text) continue;

          // Generamos la respuesta con IA y la enviamos por WhatsApp.
          const reply = await respondToWhatsappMessage({ waId: from, profileName, text });
          if (reply) {
            await sendMetaWhatsappText(from, reply);
          }
        }
      }
    }
  } catch (err) {
    console.error("[whatsapp-webhook] error procesando:", err);
  }

  return NextResponse.json({ ok: true });
}

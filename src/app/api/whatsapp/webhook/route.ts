import { NextResponse } from "next/server";
import {
  upsertConversationByPhone,
  insertInboundMessage,
  insertOutboundMessage,
  updateMessage,
  updateMessageStatusByMetaId,
  touchConversation,
} from "@/lib/whatsapp/store";
import { generateAiReply } from "@/lib/whatsapp/agent";
import { sendMetaWhatsappMessage } from "@/lib/notifications/meta-whatsapp";
import { notifyOwnerChatStarted } from "@/lib/notifications/chat-started-alert";
import { logWebhook } from "@/lib/whatsapp/webhook-log";
import { sendAdminPushNotification } from "@/lib/notifications/admin-web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

/** Verificación del webhook por Meta. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = readEnv("WHATSAPP_VERIFY_TOKEN");

  if (mode === "subscribe" && expected && token === expected && challenge) {
    logWebhook("verify_ok", "Meta verificó el webhook correctamente.");
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  logWebhook(
    "verify_fail",
    !expected ? "Falta WHATSAPP_VERIFY_TOKEN en el servidor." : "El verify token no coincide.",
  );
  return new Response("Forbidden", { status: 403 });
}

/** Recepción de mensajes y estados. Responde 200 de inmediato y procesa aparte. */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    logWebhook("error", "POST con cuerpo no-JSON.");
    return NextResponse.json({ ok: true });
  }
  logWebhook("post_received", "Meta envió un evento al webhook.");
  // Procesamiento en segundo plano (Render mantiene el proceso vivo).
  void processPayload(payload).catch((err) => logWebhook("error", String(err)));
  return NextResponse.json({ ok: true });
}

type IncomingMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  audio?: { id?: string; mime_type?: string };
  video?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
  location?: { latitude?: number; longitude?: number };
  context?: { id?: string };
};

type StatusEvent = { id?: string; status?: string };

function describeMessage(m: IncomingMessage): { type: string; content: string; mediaId?: string; mimeType?: string; fileName?: string } {
  switch (m.type) {
    case "text":
      return { type: "text", content: m.text?.body ?? "" };
    case "image":
      return { type: "image", content: m.image?.caption ?? "[imagen]", mediaId: m.image?.id, mimeType: m.image?.mime_type };
    case "audio":
      return { type: "audio", content: "[audio]", mediaId: m.audio?.id, mimeType: m.audio?.mime_type };
    case "video":
      return { type: "video", content: m.video?.caption ?? "[video]", mediaId: m.video?.id, mimeType: m.video?.mime_type };
    case "document":
      return {
        type: "document",
        content: m.document?.caption ?? m.document?.filename ?? "[documento]",
        mediaId: m.document?.id,
        mimeType: m.document?.mime_type,
        fileName: m.document?.filename,
      };
    case "location":
      return {
        type: "location",
        content: m.location ? `Ubicación: ${m.location.latitude}, ${m.location.longitude}` : "[ubicación]",
      };
    default:
      return { type: m.type || "unknown", content: "[mensaje no soportado]" };
  }
}

async function processPayload(payload: unknown) {
  const entries = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      if (!value) continue;

      // 1) Estados de mensajes salientes (sent/delivered/read/failed)
      const statuses = value.statuses as StatusEvent[] | undefined;
      if (Array.isArray(statuses)) {
        for (const st of statuses) {
          if (st.id && st.status) {
            await updateMessageStatusByMetaId(st.id, st.status).catch(() => {});
          }
        }
      }

      // 2) Mensajes entrantes
      const messages = value.messages as IncomingMessage[] | undefined;
      if (!Array.isArray(messages) || messages.length === 0) continue;

      const contacts = value.contacts as Array<{ profile?: { name?: string } }> | undefined;
      const profileName = contacts?.[0]?.profile?.name;

      for (const message of messages) {
        const from = String(message.from || "").replace(/\D/g, "");
        if (!from) continue;

        const conv = await upsertConversationByPhone({ phone: from, profileName });
        if (!conv) {
          logWebhook("error", `No se pudo crear/leer la conversación de +${from}. ¿Corriste whatsapp_inbox.sql?`);
          continue;
        }

        const desc = describeMessage(message);
        const { inserted, message: storedMessage } = await insertInboundMessage({
          conversationId: conv.id,
          metaMessageId: message.id,
          replyTo: message.context?.id,
          messageType: desc.type,
          content: desc.content,
          mediaId: desc.mediaId,
          mimeType: desc.mimeType,
          fileName: desc.fileName,
        });
        if (!inserted) {
          logWebhook("message_dup", `Mensaje duplicado de +${from} (ignorado).`);
          continue;
        }
        logWebhook("message_stored", `Mensaje de +${from}: ${desc.content.slice(0, 60)}`);

        // ¿Primera interacción? avisamos al dueño (una vez).
        const isFirst = !conv.last_message_at;

        await touchConversation({
          conversationId: conv.id,
          lastMessage: desc.content,
          lastMessageType: desc.type,
          incrementUnread: true,
          extendWindow: true,
        });

        await sendAdminPushNotification({
          title: `Nuevo WhatsApp: ${profileName || `+${from}`}`,
          body: desc.content.slice(0, 180) || "Nuevo mensaje recibido",
          href: `/admin/whatsapp?conversation=${conv.id}`,
          tag: `whatsapp-${storedMessage?.id || message.id || conv.id}`,
          kind: "whatsapp",
          createdAt: storedMessage?.created_at || new Date().toISOString(),
          eventId: `whatsapp:${storedMessage?.id || message.id || conv.id}`,
        }).catch((error) => console.error("[admin-push] aviso de WhatsApp fallido:", error));

        if (isFirst) {
          void notifyOwnerChatStarted(`WhatsApp de +${from}: ${desc.content}`).catch(() => {});
        }

        // 3) IA según el modo de la conversación
        if (conv.mode === "human") continue; // solo humano
        if (desc.type !== "text") continue; // por ahora la IA solo responde texto

        const reply = await generateAiReply({ ...conv, profile_name: profileName ?? conv.profile_name });
        if (!reply) continue;

        if (conv.mode === "assisted") {
          // Borrador: se guarda pero NO se envía.
          await insertOutboundMessage({
            conversationId: conv.id,
            senderType: "ai",
            content: reply,
            status: "draft",
          });
          continue;
        }

        // Modo 'ai': enviar automáticamente.
        const outbound = await insertOutboundMessage({
          conversationId: conv.id,
          senderType: "ai",
          content: reply,
          status: "sending",
        });
        const sent = await sendMetaWhatsappMessage(from, reply);
        if (outbound) {
          await updateMessage(outbound.id, {
            status: sent.ok ? "sent" : "failed",
            meta_message_id: sent.id ?? null,
            error_message: sent.ok ? null : sent.error ?? "Error al enviar",
          });
        }
        if (sent.ok) {
          await touchConversation({
            conversationId: conv.id,
            lastMessage: reply,
            lastMessageType: "text",
            incrementUnread: false,
            extendWindow: false,
          });
        }
      }
    }
  }
}

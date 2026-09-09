import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import {
  getConversation,
  insertOutboundMessage,
  updateMessage,
  touchConversation,
  isWindowOpen,
} from "@/lib/whatsapp/store";
import { sendMetaWhatsappMessage } from "@/lib/notifications/meta-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
  type: z.enum(["text"]).default("text"),
});

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const { conversationId, message } = parsed.data;

  const conv = await getConversation(conversationId);
  if (!conv) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });

  // Ventana de 24h: fuera de ella, Meta rechaza texto libre (requiere plantilla).
  if (!isWindowOpen(conv)) {
    return NextResponse.json(
      {
        error:
          "La ventana de 24 horas está cerrada. Solo se pueden enviar plantillas aprobadas hasta que el cliente vuelva a escribir.",
        code: "window_closed",
      },
      { status: 409 },
    );
  }

  const userId = "session" in auth ? auth.session.user.id : "legacy-admin";

  // 1) Optimistic: guardamos con estado 'sending'.
  const outbound = await insertOutboundMessage({
    conversationId,
    senderType: "human",
    content: message,
    status: "sending",
    sentByUserId: userId,
  });
  if (!outbound) return NextResponse.json({ error: "No se pudo registrar el mensaje." }, { status: 500 });

  // 2) Enviamos por Meta.
  const sent = await sendMetaWhatsappMessage(conv.phone, message);

  // 3) Actualizamos estado.
  await updateMessage(outbound.id, {
    status: sent.ok ? "sent" : "failed",
    meta_message_id: sent.id ?? null,
    error_message: sent.ok ? null : sent.error ?? "Error al enviar",
  });

  if (sent.ok) {
    await touchConversation({
      conversationId,
      lastMessage: message,
      lastMessageType: "text",
      incrementUnread: false,
      extendWindow: false,
    });
  }

  return NextResponse.json({
    ok: sent.ok,
    messageId: outbound.id,
    status: sent.ok ? "sent" : "failed",
    error: sent.ok ? undefined : sent.error,
  });
}

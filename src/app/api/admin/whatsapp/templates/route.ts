import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { listWhatsappTemplates, sendApprovedTemplate } from "@/lib/whatsapp/templates";
import {
  getConversation,
  insertOutboundMessage,
  updateMessage,
  touchConversation,
} from "@/lib/whatsapp/store";
const schema = z
  .object({
    requestId: z.uuid(),
    conversationId: z.uuid(),
    name: z.string().min(1).max(512),
    language: z.string().min(2).max(20),
    values: z.record(z.string(), z.string().max(1000)),
    consentAcknowledged: z.literal(true),
  })
  .strict();
export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  try {
    return NextResponse.json(
      { templates: await listWhatsappTemplates() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "META_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revisa la plantilla y confirma que el cliente autorizó el seguimiento." },
      { status: 400 },
    );
  const data = parsed.data,
    conv = await getConversation(data.conversationId);
  if (!conv) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        conversation: conv.id,
        name: data.name,
        language: data.language,
        values: Object.fromEntries(Object.entries(data.values).sort()),
      }),
    )
    .digest("hex");
  const db = createSupabaseServerClient().supabase;
  const { data: existing } = await db
    .from("whatsapp_messages")
    .select("id,conversation_id,status,request_hash")
    .eq("client_request_id", data.requestId)
    .maybeSingle();
  if (existing) {
    if (existing.conversation_id !== conv.id || existing.request_hash !== requestHash)
      return NextResponse.json(
        { error: "Esta solicitud ya pertenece a otro mensaje." },
        { status: 409 },
      );
    return NextResponse.json(
      {
        ok: ["sent", "delivered", "read"].includes(existing.status),
        id: existing.id,
        error: ["sent", "delivered", "read"].includes(existing.status)
          ? undefined
          : "El envío ya está registrado. Revisa el historial antes de repetirlo.",
      },
      { status: ["sent", "delivered", "read"].includes(existing.status) ? 200 : 409 },
    );
  }
  const message = await insertOutboundMessage({
    conversationId: conv.id,
    senderType: "human",
    content: `Plantilla: ${data.name} (${data.language})`,
    status: "sending",
    messageType: "template",
    requestId: data.requestId,
    requestHash,
    sentByUserId: auth.actorId || "legacy-admin",
  });
  if (!message)
    return NextResponse.json({ error: "No se pudo registrar el envío." }, { status: 500 });
  try {
    const sent = await sendApprovedTemplate(conv.phone, data.name, data.language, data.values);
    await updateMessage(message.id, {
      status: "sent",
      meta_message_id: sent.id,
      content: sent.preview,
    });
    await touchConversation({
      conversationId: conv.id,
      lastMessage: sent.preview,
      lastMessageType: "template",
      incrementUnread: false,
      extendWindow: false,
    });
    return NextResponse.json({ ok: true, id: message.id });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "META_UNAVAILABLE";
    const known = /^(META_\d+|APPROVED_TEMPLATE_REQUIRED)/.test(detail);
    await updateMessage(message.id, {
      status: known ? "failed" : "unknown",
      error_message: known
        ? detail
        : "Envío sin confirmar. Revisa el historial antes de repetirlo.",
    });
    return NextResponse.json(
      {
        error: known
          ? detail
          : "No fue posible confirmar el envío. Revisa el historial antes de repetirlo.",
      },
      { status: 502 },
    );
  }
}

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Acceso a las tablas del módulo WhatsApp con service role (bypassa RLS).
 * Todas las escrituras del módulo pasan por aquí.
 */

export type ConversationMode = "ai" | "human" | "assisted";
export type ConversationStatus = "open" | "closed" | "archived";
export type LeadStatus =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "cotizacion_enviada"
  | "negociacion"
  | "ganado"
  | "perdido";

export type WaConversation = {
  id: string;
  phone: string;
  customer_name: string | null;
  profile_name: string | null;
  last_message: string | null;
  last_message_type: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: string;
  mode: string;
  assigned_user_id: string | null;
  lead_status: string;
  priority: string;
  email: string | null;
  company: string | null;
  industry: string | null;
  requested_service: string | null;
  estimated_budget: number | null;
  deadline: string | null;
  notes: string | null;
  tags: string[];
  lead_id: string | null;
  window_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WaMessage = {
  id: string;
  conversation_id: string;
  meta_message_id: string | null;
  reply_to_message_id: string | null;
  direction: "in" | "out";
  sender_type: "customer" | "ai" | "human";
  message_type: string;
  content: string | null;
  media_id: string | null;
  media_url: string | null;
  mime_type: string | null;
  file_name: string | null;
  status: string;
  error_message: string | null;
  sent_by_user_id: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

const CONV = "whatsapp_conversations";
const MSG = "whatsapp_messages";
const NOTES = "whatsapp_notes";
const QUICK = "whatsapp_quick_replies";

function db() {
  return createSupabaseServerClient().supabase.schema("public");
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Crea o actualiza la conversación por teléfono (al recibir un mensaje). */
export async function upsertConversationByPhone(input: {
  phone: string;
  profileName?: string | null;
}): Promise<WaConversation | null> {
  const supabase = db();
  const phone = input.phone.replace(/\D/g, "");

  const { data: existing } = await supabase
    .from(CONV)
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (input.profileName && !existing.profile_name) patch.profile_name = input.profileName;
    if (Object.keys(patch).length > 0) {
      await supabase.from(CONV).update(patch).eq("id", existing.id);
    }
    return existing as WaConversation;
  }

  const { data, error } = await supabase
    .from(CONV)
    .insert({
      phone,
      profile_name: input.profileName ?? null,
      customer_name: input.profileName ?? null,
      mode: "ai",
      status: "open",
      lead_status: "nuevo",
    })
    .select("*")
    .single();
  if (error) {
    console.error("[whatsapp] upsertConversation error:", error.message);
    return null;
  }
  return data as WaConversation;
}

export async function getConversation(id: string): Promise<WaConversation | null> {
  const { data } = await db().from(CONV).select("*").eq("id", id).maybeSingle();
  return (data as WaConversation) ?? null;
}

/** Inserta un mensaje entrante (evita duplicados por meta_message_id). */
export async function insertInboundMessage(input: {
  conversationId: string;
  metaMessageId?: string | null;
  replyTo?: string | null;
  messageType: string;
  content?: string | null;
  mediaId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<{ inserted: boolean; message: WaMessage | null }> {
  const supabase = db();

  if (input.metaMessageId) {
    const { data: dup } = await supabase
      .from(MSG)
      .select("id")
      .eq("meta_message_id", input.metaMessageId)
      .maybeSingle();
    if (dup) return { inserted: false, message: null };
  }

  const { data, error } = await supabase
    .from(MSG)
    .insert({
      conversation_id: input.conversationId,
      meta_message_id: input.metaMessageId ?? null,
      reply_to_message_id: input.replyTo ?? null,
      direction: "in",
      sender_type: "customer",
      message_type: input.messageType,
      content: input.content ?? null,
      media_id: input.mediaId ?? null,
      mime_type: input.mimeType ?? null,
      file_name: input.fileName ?? null,
      status: "received",
    })
    .select("*")
    .single();
  if (error) {
    console.error("[whatsapp] insertInbound error:", error.message);
    return { inserted: false, message: null };
  }
  return { inserted: true, message: data as WaMessage };
}

export async function insertOutboundMessage(input: {
  conversationId: string;
  senderType: "ai" | "human";
  content: string;
  status?: string;
  sentByUserId?: string | null;
  messageType?: string;
}): Promise<WaMessage | null> {
  const { data, error } = await db()
    .from(MSG)
    .insert({
      conversation_id: input.conversationId,
      direction: "out",
      sender_type: input.senderType,
      message_type: input.messageType ?? "text",
      content: input.content,
      status: input.status ?? "sending",
      sent_by_user_id: input.sentByUserId ?? null,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[whatsapp] insertOutbound error:", error.message);
    return null;
  }
  return data as WaMessage;
}

export async function updateMessage(
  id: string,
  patch: Partial<Pick<WaMessage, "status" | "meta_message_id" | "error_message" | "delivered_at" | "read_at">>,
): Promise<void> {
  await db().from(MSG).update(patch).eq("id", id);
}

/** Actualiza estado por meta_message_id (para webhooks de status). */
export async function updateMessageStatusByMetaId(
  metaMessageId: string,
  status: string,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "delivered") patch.delivered_at = new Date().toISOString();
  if (status === "read") patch.read_at = new Date().toISOString();
  await db().from(MSG).update(patch).eq("meta_message_id", metaMessageId);
}

/** Actualiza el resumen de la conversación tras un mensaje. */
export async function touchConversation(input: {
  conversationId: string;
  lastMessage: string;
  lastMessageType: string;
  incrementUnread?: boolean;
  extendWindow?: boolean;
}): Promise<void> {
  const supabase = db();
  const { data: conv } = await supabase
    .from(CONV)
    .select("unread_count")
    .eq("id", input.conversationId)
    .maybeSingle();
  const unread = (conv?.unread_count ?? 0) + (input.incrementUnread ? 1 : 0);

  const patch: Record<string, unknown> = {
    last_message: input.lastMessage.slice(0, 500),
    last_message_type: input.lastMessageType,
    last_message_at: new Date().toISOString(),
    unread_count: unread,
  };
  if (input.extendWindow) {
    patch.window_expires_at = new Date(Date.now() + WINDOW_MS).toISOString();
  }
  await supabase.from(CONV).update(patch).eq("id", input.conversationId);
}

export async function listRecentMessages(conversationId: string, limit = 30): Promise<WaMessage[]> {
  const { data } = await db()
    .from(MSG)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data as WaMessage[]) ?? [];
}

export function isWindowOpen(conv: Pick<WaConversation, "window_expires_at">): boolean {
  if (!conv.window_expires_at) return false;
  return new Date(conv.window_expires_at).getTime() > Date.now();
}

// -- Consultas y gestión para el panel --------------------------------------

export async function listConversations(limit = 100): Promise<WaConversation[]> {
  const { data } = await db()
    .from(CONV)
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as WaConversation[]) ?? [];
}

const CONV_UPDATABLE = new Set([
  "customer_name",
  "email",
  "company",
  "industry",
  "requested_service",
  "estimated_budget",
  "deadline",
  "notes",
  "tags",
  "mode",
  "status",
  "lead_status",
  "priority",
  "assigned_user_id",
  "lead_id",
]);

export async function updateConversation(
  id: string,
  patch: Record<string, unknown>,
): Promise<WaConversation | null> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (CONV_UPDATABLE.has(k)) clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return getConversation(id);
  const { data, error } = await db().from(CONV).update(clean).eq("id", id).select("*").single();
  if (error) {
    console.error("[whatsapp] updateConversation error:", error.message);
    return null;
  }
  return data as WaConversation;
}

export async function markConversationRead(id: string): Promise<void> {
  const supabase = db();
  await supabase.from(CONV).update({ unread_count: 0 }).eq("id", id);
  await supabase
    .from(MSG)
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("direction", "in")
    .neq("status", "read");
}

export type WaNote = {
  id: string;
  conversation_id: string;
  user_id: string | null;
  note: string;
  created_at: string;
};

export async function addNote(conversationId: string, note: string, userId?: string | null): Promise<WaNote | null> {
  const { data, error } = await db()
    .from(NOTES)
    .insert({ conversation_id: conversationId, note: note.slice(0, 4000), user_id: userId ?? null })
    .select("*")
    .single();
  if (error) return null;
  return data as WaNote;
}

export async function listNotes(conversationId: string): Promise<WaNote[]> {
  const { data } = await db()
    .from(NOTES)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });
  return (data as WaNote[]) ?? [];
}

export type WaQuickReply = {
  id: string;
  title: string;
  shortcut: string | null;
  content: string;
  is_active: boolean;
  created_at: string;
};

export async function listQuickReplies(): Promise<WaQuickReply[]> {
  const { data } = await db().from(QUICK).select("*").eq("is_active", true).order("title");
  return (data as WaQuickReply[]) ?? [];
}

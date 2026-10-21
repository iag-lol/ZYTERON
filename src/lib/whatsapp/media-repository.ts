import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mediaFileName, mediaKind, type MediaMime } from "./media-policy";
import type { MediaRecord, MediaRepository } from "./media-workflow";
export function mediaRepository(): MediaRepository {
  const db = createSupabaseServerClient().supabase;
  const check = (error: unknown) => {
    if (error) throw Error("MEDIA_PERSISTENCE_UNAVAILABLE");
  };
  return {
    async conversation(id) {
      const { data, error } = await db
        .from("whatsapp_conversations")
        .select("id,phone,window_expires_at")
        .eq("id", id)
        .maybeSingle();
      check(error);
      return data;
    },
    async claim(input, hash) {
      const { data, error } = await db
        .from("whatsapp_messages")
        .insert({
          conversation_id: input.conversationId,
          direction: "out",
          sender_type: "human",
          message_type: mediaKind(input.file.type as MediaMime),
          content: input.caption,
          mime_type: input.file.type,
          file_name: mediaFileName(input.file.name, input.file.type as MediaMime),
          status: "sending",
          sent_by_user_id: input.actorId,
          client_request_id: input.requestId,
          request_hash: hash,
        })
        .select("*")
        .single();
      if (!error && data) return { record: data as MediaRecord, created: true };
      if (error?.code !== "23505") {
        check(error);
        throw Error("MEDIA_CLAIM_UNAVAILABLE");
      }
      const { data: existing, error: readError } = await db
        .from("whatsapp_messages")
        .select("*")
        .eq("client_request_id", input.requestId)
        .single();
      check(readError);
      if (!existing) throw Error("MEDIA_CLAIM_UNAVAILABLE");
      return { record: existing as MediaRecord, created: false };
    },
    async patch(id, patch, onlySending) {
      let query = db.from("whatsapp_messages").update(patch).eq("id", id);
      if (onlySending) query = query.eq("status", "sending");
      const { error } = await query;
      check(error);
    },
    async touch(id, summary, type) {
      const { error } = await db
        .from("whatsapp_conversations")
        .update({
          last_message: summary.slice(0, 500),
          last_message_type: type,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", id);
      check(error);
    },
    async message(conversationId, messageId) {
      const { data, error } = await db
        .from("whatsapp_messages")
        .select(
          "id,conversation_id,request_hash,status,media_id,message_type,file_name,mime_type,content",
        )
        .eq("id", messageId)
        .eq("conversation_id", conversationId)
        .maybeSingle();
      check(error);
      return data as MediaRecord | null;
    },
  };
}

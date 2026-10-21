import { createHash } from "node:crypto";
import {
  checkMediaBytes,
  checkMediaFile,
  MediaError,
  mediaFileName,
  mediaKind,
} from "./media-policy";
import { MetaMediaError, type createMetaMediaClient } from "./meta-media";
export type MediaRecord = {
  id: string;
  conversation_id: string;
  request_hash: string | null;
  status: string;
  media_id: string | null;
  message_type: string;
  file_name: string | null;
  mime_type: string | null;
  content: string | null;
};
export type MediaInput = {
  conversationId: string;
  requestId: string;
  caption: string;
  actorId: string;
  file: File;
  bytes: Uint8Array;
};
export type MediaRepository = {
  conversation(
    id: string,
  ): Promise<{ id: string; phone: string; window_expires_at: string | null } | null>;
  claim(input: MediaInput, hash: string): Promise<{ record: MediaRecord; created: boolean }>;
  patch(id: string, patch: Record<string, unknown>, onlySending?: boolean): Promise<void>;
  touch(id: string, summary: string, type: string): Promise<void>;
  message(conversationId: string, messageId: string): Promise<MediaRecord | null>;
};
export async function sendMedia(
  input: MediaInput,
  repo: MediaRepository,
  meta: ReturnType<typeof createMetaMediaClient>,
) {
  const mime = checkMediaFile(input.file);
  checkMediaBytes(input.bytes, mime);
  const conv = await repo.conversation(input.conversationId);
  if (!conv) throw new MediaError("Conversación no encontrada.", 404);
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        conversation: conv.id,
        actor: input.actorId,
        caption: input.caption,
        name: mediaFileName(input.file.name, mime),
        mime,
      }),
    )
    .update(input.bytes)
    .digest("hex");
  // La restricción UNIQUE de client_request_id decide qué solicitud puede enviar.
  const { record, created } = await repo.claim(input, hash);
  if (record.conversation_id !== conv.id || record.request_hash !== hash)
    throw new MediaError("Esta solicitud pertenece a otro archivo o conversación.", 409);
  const result = (status: string, error?: string) => ({
    ok: ["sent", "delivered", "read"].includes(status),
    messageId: record.id,
    status,
    ...(error ? { error } : {}),
  });
  if (!created)
    return result(
      record.status,
      ["sent", "delivered", "read"].includes(record.status)
        ? undefined
        : "El envío ya está registrado. Revisa su estado en el historial antes de repetirlo.",
    );
  let sendingToClient = false;
  let sentId: string | undefined;
  try {
    if (
      Date.parse(conv.window_expires_at || "") <= Date.now() ||
      !Number.isFinite(Date.parse(conv.window_expires_at || ""))
    )
      throw new MediaError(
        "La ventana de 24 horas está cerrada. Usa una plantilla aprobada para retomar el contacto.",
        409,
      );
    const mediaId = await meta.upload(input.bytes, mime, input.file.name);
    await repo.patch(record.id, { media_id: mediaId });
    // La carga puede durar varios segundos: la ventana se valida de nuevo antes de enviar.
    const fresh = await repo.conversation(conv.id);
    if (
      !fresh ||
      fresh.phone !== conv.phone ||
      !(Date.parse(fresh.window_expires_at || "") > Date.now())
    )
      throw new MediaError(
        "La conversación cambió o cerró su ventana. El archivo no se envió.",
        409,
      );
    sendingToClient = true;
    sentId = await meta.send(conv.phone, mediaId, mime, input.file.name, input.caption);
    await repo.patch(
      record.id,
      { status: "sent", meta_message_id: sentId, error_message: null },
      true,
    );
  } catch (error) {
    const uncertain =
      sendingToClient &&
      (Boolean(sentId) || !(error instanceof MetaMediaError && error.definitive));
    const status = uncertain ? "unknown" : "failed";
    const detail = uncertain
      ? "Envío sin confirmar. Revisa el historial antes de repetirlo."
      : error instanceof MediaError
        ? error.message
        : "No se pudo preparar el archivo. No se envió al cliente.";
    await repo
      .patch(
        record.id,
        { status, error_message: detail, ...(sentId ? { meta_message_id: sentId } : {}) },
        true,
      )
      .catch(() => {});
    return result(status, detail);
  }
  // Un fallo del resumen no convierte un envío confirmado en un envío fallido.
  await repo
    .touch(
      conv.id,
      input.caption || (mediaKind(mime) === "image" ? "[imagen]" : input.file.name),
      mediaKind(mime),
    )
    .catch(() => {});
  return result("sent");
}

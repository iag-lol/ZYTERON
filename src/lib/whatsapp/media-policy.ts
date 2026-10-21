export const IMAGE_LIMIT = 5 * 1024 * 1024;
export const DOCUMENT_LIMIT = 20 * 1024 * 1024;
export const MULTIPART_LIMIT = DOCUMENT_LIMIT + 64 * 1024;
export const MEDIA_ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";
export type MediaMime = "image/jpeg" | "image/png" | "application/pdf";
export class MediaError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function mediaKind(mime: MediaMime) {
  return mime === "application/pdf" ? "document" : "image";
}
export function mediaFileName(name: string, mime: MediaMime) {
  const base =
    name
      .split(/[\\/]/)
      .pop()
      ?.toWellFormed()
      .replace(/[\u0000-\u001f\u007f"<>]/g, "")
      .trim()
      .slice(0, 140) || "";
  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  return base && new RegExp(`\\.${ext === "jpg" ? "jpe?g" : ext}$`, "i").test(base)
    ? base
    : `archivo.${ext}`;
}
export function checkMediaFile(file: { type: string; size: number; name: string }): MediaMime {
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type))
    throw new MediaError("Selecciona una imagen JPG/PNG o un documento PDF.");
  const mime = file.type as MediaMime;
  const limit = mime === "application/pdf" ? DOCUMENT_LIMIT : IMAGE_LIMIT;
  if (!file.size || file.size > limit)
    throw new MediaError(
      `El archivo debe contener datos y pesar como máximo ${limit / 1024 / 1024} MB.`,
      413,
    );
  const extension =
    mime === "image/jpeg" ? /\.jpe?g$/i : mime === "image/png" ? /\.png$/i : /\.pdf$/i;
  if (!extension.test(file.name))
    throw new MediaError("La extensión y el tipo del archivo no coinciden.");
  return mime;
}
export function checkMediaBytes(bytes: Uint8Array, mime: string): asserts mime is MediaMime {
  const starts = (values: number[]) => values.every((value, i) => bytes[i] === value);
  const valid =
    mime === "image/png"
      ? bytes.length >= 24 &&
        starts([137, 80, 78, 71, 13, 10, 26, 10]) &&
        String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
      : mime === "image/jpeg"
        ? bytes.length >= 4 && starts([255, 216, 255])
        : mime === "application/pdf" &&
          new TextDecoder().decode(bytes.slice(0, 8)).match(/^%PDF-\d\.\d/) !== null;
  if (!valid)
    throw new MediaError(
      "El contenido del archivo no corresponde a una imagen JPG/PNG o PDF válido.",
    );
  const limit = mime === "application/pdf" ? DOCUMENT_LIMIT : IMAGE_LIMIT;
  if (bytes.byteLength > limit) throw new MediaError("El archivo supera el tamaño permitido.", 413);
}
export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  timeoutMs = 30_000,
) {
  if (!body) throw new MediaError("El archivo está vacío.");
  const reader = body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, timeoutMs);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new MediaError("La lectura del archivo agotó el tiempo de espera.", 408);
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new MediaError("El archivo supera el tamaño permitido.", 413);
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
export function mediaEndpoint(conversationId: string, messageId: string) {
  return `/api/admin/whatsapp/messages/${encodeURIComponent(messageId)}/media?conversationId=${encodeURIComponent(conversationId)}`;
}

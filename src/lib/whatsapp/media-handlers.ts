import { z } from "zod";
import { mediaCapacity } from "./media-capacity";
import { MediaError, mediaFileName, MULTIPART_LIMIT, readBoundedBody } from "./media-policy";
import { sendMedia, type MediaRepository } from "./media-workflow";
import type { createMetaMediaClient } from "./meta-media";
const inputSchema = z.object({
  conversationId: z.string().uuid(),
  requestId: z.string().uuid(),
  caption: z.string().trim().max(1024),
});
const idsSchema = z.object({ conversationId: z.string().uuid(), messageId: z.string().uuid() });
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
};
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: privateHeaders });
export function createMediaHandlers(deps: {
  authorize(req: Request): Promise<{ error?: Response; actorId?: string | null }>;
  repository(): MediaRepository;
  meta(): ReturnType<typeof createMetaMediaClient>;
}) {
  const acquire = mediaCapacity();
  const failure = (error: unknown) =>
    json(
      {
        error:
          error instanceof MediaError
            ? error.message
            : "No fue posible acceder al archivo. Puedes reintentar.",
      },
      error instanceof MediaError ? error.status : 503,
    );
  return {
    async POST(req: Request) {
      const auth = await deps.authorize(req);
      if (auth.error) return auth.error;
      let release: (() => void) | undefined;
      try {
        release = await acquire(3);
        const contentType = req.headers.get("content-type") || "";
        if (!/^multipart\/form-data;.*boundary=/i.test(contentType))
          throw new MediaError("Selecciona el archivo que deseas adjuntar.");
        if (Number(req.headers.get("content-length")) > MULTIPART_LIMIT)
          throw new MediaError("El archivo supera el tamaño permitido.", 413);
        const bytes = await readBoundedBody(req.body, MULTIPART_LIMIT);
        const form = await new Response(new Uint8Array(bytes), {
          headers: { "Content-Type": contentType },
        })
          .formData()
          .catch(() => {
            throw new MediaError("No fue posible leer el archivo adjunto.");
          });
        if (
          Array.from(form.keys()).some(
            (key) => !["conversationId", "requestId", "caption", "file"].includes(key),
          ) ||
          ["conversationId", "requestId", "caption", "file"].some(
            (key) => form.getAll(key).length !== 1,
          )
        )
          throw new MediaError("Los datos del adjunto son inválidos.");
        const parsed = inputSchema.safeParse({
          conversationId: form.get("conversationId"),
          requestId: form.get("requestId"),
          caption: form.get("caption"),
        });
        const file = form.get("file");
        if (!parsed.success || !(file instanceof File))
          throw new MediaError("Revisa la conversación y el archivo adjunto.");
        const result = await sendMedia(
          {
            ...parsed.data,
            actorId: auth.actorId || "legacy-admin",
            file,
            bytes: new Uint8Array(await file.arrayBuffer()),
          },
          deps.repository(),
          deps.meta(),
        );
        return json(result, result.ok ? 200 : 409);
      } catch (error) {
        return failure(error);
      } finally {
        release?.();
      }
    },
    async GET(req: Request, messageId: string) {
      const auth = await deps.authorize(req);
      if (auth.error) return auth.error;
      let release: (() => void) | undefined;
      try {
        const parsed = idsSchema.safeParse({
          messageId,
          conversationId: new URL(req.url).searchParams.get("conversationId"),
        });
        if (!parsed.success) throw new MediaError("Identificador de archivo inválido.");
        const record = await deps
          .repository()
          .message(parsed.data.conversationId, parsed.data.messageId);
        if (!record || !record.media_id)
          throw new MediaError("Este mensaje no tiene un archivo recuperable vinculado.", 404);
        if (!["image", "document"].includes(record.message_type))
          throw new MediaError("Este formato todavía no está disponible en el panel.", 415);
        release = await acquire(record.message_type === "document" ? 3 : 1);
        const { bytes, mime } = await deps.meta().download(record.media_id);
        if (
          (record.mime_type && record.mime_type !== mime) ||
          (record.message_type === "image" && !mime.startsWith("image/")) ||
          (record.message_type === "document" && mime !== "application/pdf")
        )
          throw new MediaError(
            "El archivo no coincide con el formato registrado en este mensaje.",
            502,
          );
        const name = mediaFileName(record.file_name || "", mime);
        return new Response(new Uint8Array(bytes), {
          headers: {
            ...privateHeaders,
            "Content-Type": mime,
            "Content-Length": String(bytes.length),
            "Content-Disposition": `${new URL(req.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${mime === "application/pdf" ? "documento.pdf" : mime === "image/png" ? "imagen.png" : "imagen.jpg"}"; filename*=UTF-8''${encodeURIComponent(name).replace(/'/g, "%27")}`,
            "Content-Security-Policy": "default-src 'none'; sandbox",
          },
        });
      } catch (error) {
        return failure(error);
      } finally {
        release?.();
      }
    },
  };
}

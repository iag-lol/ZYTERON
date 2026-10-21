import { createHash } from "node:crypto";
import {
  checkMediaBytes,
  DOCUMENT_LIMIT,
  IMAGE_LIMIT,
  MediaError,
  mediaFileName,
  mediaKind,
  readBoundedBody,
  type MediaMime,
} from "./media-policy";

const env = (name: string) =>
  String(process.env[name] || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
export class MetaMediaError extends MediaError {
  constructor(
    message: string,
    public definitive: boolean,
    status = 502,
  ) {
    super(message, status);
  }
}
export function trustedMediaUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MediaError("Meta devolvió una dirección de archivo inválida.", 502);
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "lookaside.fbsbx.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !url.pathname.startsWith("/whatsapp_business/attachments/")
  )
    throw new MediaError("Meta devolvió una dirección de archivo no permitida.", 502);
  return url.href;
}
export function createMetaMediaClient(options: {
  token: string;
  phoneId: string;
  fetch?: typeof fetch;
}) {
  const request = options.fetch || fetch;
  const headers = { Authorization: `Bearer ${options.token}` };
  const configured = () => {
    if (!options.token || !/^\d{5,30}$/.test(options.phoneId))
      throw new MetaMediaError("WhatsApp no tiene configurado el acceso a archivos.", true, 503);
  };
  const graph = async (path: string, init: RequestInit = {}) => {
    configured();
    let response: Response;
    try {
      response = await request(`https://graph.facebook.com/v21.0/${path}`, {
        ...init,
        headers: { ...headers, ...init.headers },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      throw new MetaMediaError("No fue posible confirmar la respuesta de WhatsApp.", false);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new MetaMediaError(
        `WhatsApp rechazó la operación (código ${Number(data?.error?.code) || response.status}).`,
        response.status < 500,
      );
    if (!data) throw new MetaMediaError("WhatsApp no confirmó la operación.", false);
    return data;
  };
  return {
    async upload(bytes: Uint8Array, mime: MediaMime, name: string) {
      checkMediaBytes(bytes, mime);
      const form = new FormData();
      form.set("messaging_product", "whatsapp");
      form.set("type", mime);
      form.set(
        "file",
        new Blob([new Uint8Array(bytes)], { type: mime }),
        mediaFileName(name, mime),
      );
      const data = await graph(`${options.phoneId}/media`, { method: "POST", body: form });
      if (!/^\d{5,30}$/.test(data.id || ""))
        throw new MetaMediaError("WhatsApp no confirmó la carga del archivo.", false);
      return data.id as string;
    },
    async send(to: string, mediaId: string, mime: MediaMime, name: string, caption: string) {
      const type = mediaKind(mime);
      const data = await graph(`${options.phoneId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to.replace(/\D/g, ""),
          type,
          [type]: {
            id: mediaId,
            ...(caption ? { caption } : {}),
            ...(type === "document" ? { filename: mediaFileName(name, mime) } : {}),
          },
        }),
      });
      const id = data.messages?.[0]?.id;
      if (typeof id !== "string" || !id)
        throw new MetaMediaError("WhatsApp no confirmó el identificador del envío.", false);
      return id;
    },
    async download(mediaId: string) {
      if (!/^\d{5,30}$/.test(mediaId))
        throw new MediaError("El mensaje no tiene un archivo válido vinculado.", 404);
      const data = await graph(`${mediaId}?phone_number_id=${options.phoneId}`);
      const mime = data.mime_type as string;
      if (!["image/png", "image/jpeg", "application/pdf"].includes(mime))
        throw new MediaError("Este formato todavía no tiene vista previa en el panel.", 415);
      const limit = mime === "application/pdf" ? DOCUMENT_LIMIT : IMAGE_LIMIT;
      if (Number(data.file_size) > limit)
        throw new MediaError("El archivo supera el tamaño admitido por el panel.", 413);
      const url = trustedMediaUrl(data.url || "");
      const response = await request(url, {
        headers,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok)
        throw new MediaError(
          "WhatsApp no permite recuperar este archivo ahora. Puedes reintentar.",
          502,
        );
      if (Number(response.headers.get("content-length")) > limit) {
        await response.body?.cancel();
        throw new MediaError("El archivo supera el tamaño admitido por el panel.", 413);
      }
      const bytes = await readBoundedBody(response.body, limit);
      checkMediaBytes(bytes, mime);
      if (
        data.sha256 &&
        createHash("sha256").update(bytes).digest("base64") !== data.sha256 &&
        createHash("sha256").update(bytes).digest("hex") !== data.sha256
      )
        throw new MediaError("No fue posible verificar la integridad del archivo.", 502);
      return { bytes, mime };
    },
  };
}
export function metaMediaClient() {
  return createMetaMediaClient({
    token: env("META_WHATSAPP_TOKEN"),
    phoneId: env("META_WHATSAPP_PHONE_ID"),
  });
}

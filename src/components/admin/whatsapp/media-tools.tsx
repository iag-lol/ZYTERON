"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, RefreshCw, Send, X } from "lucide-react";
import { checkMediaFile, MEDIA_ACCEPT, mediaEndpoint } from "@/lib/whatsapp/media-policy";

type MessageMedia = {
  id: string;
  conversation_id: string;
  message_type: string;
  file_name?: string | null;
  mime_type?: string | null;
};
export function MessageMedia({ message }: { message: MessageMedia }) {
  const [attempt, setAttempt] = useState(0),
    [failed, setFailed] = useState(false);
  const url = mediaEndpoint(message.conversation_id, message.id);
  if (message.message_type === "image")
    return (
      <div className="wa-media-card">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir imagen en tamaño completo"
          className="wa-image-frame"
        >
          {/* La URL mantiene la autorización en el servidor y reserva espacio antes de cargar. */}
          {!failed && (
            // Las imágenes privadas requieren la cookie administrativa en cada solicitud.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={attempt}
              src={`${url}&attempt=${attempt}`}
              alt={message.file_name || "Imagen de la conversación"}
              loading="lazy"
              width={260}
              height={200}
              onError={() => setFailed(true)}
            />
          )}
          {failed && <span>No fue posible recuperar la imagen ahora.</span>}
        </a>
        <div className="wa-media-actions">
          {failed && (
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
            >
              <RefreshCw size={13} /> Reintentar
            </button>
          )}
          <a href={`${url}&download=1`}>
            <Download size={13} /> Descargar imagen
          </a>
        </div>
      </div>
    );
  const supported = !message.mime_type || message.mime_type === "application/pdf";
  return (
    <div className="wa-document-card">
      <FileText size={28} />
      <div>
        <strong>{message.file_name || "Documento PDF"}</strong>
        <small>Archivo de la conversación</small>
        {supported ? (
          <div className="wa-media-actions">
            <a href={url} target="_blank" rel="noopener noreferrer">
              Abrir PDF
            </a>
            <a href={`${url}&download=1`}>
              <Download size={13} /> Descargar
            </a>
          </div>
        ) : (
          <small>La apertura de este formato todavía no está disponible. Se admiten PDF.</small>
        )}
      </div>
    </div>
  );
}

export function MediaComposer({
  conversationId,
  disabled,
  textBusy,
  caption,
  onCaptionChange,
  onResult,
  onStart,
  onState,
}: {
  conversationId: string;
  disabled: boolean;
  textBusy: boolean;
  caption: string;
  onCaptionChange(value: string): void;
  onResult(): void;
  onStart(): void;
  onState(state: { hasFile: boolean; busy: boolean; uncertain: boolean }): void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const picker = useRef<HTMLInputElement>(null),
    locked = useRef(false),
    requestId = useRef(""),
    mounted = useRef(true);
  // Un reintento incierto conserva exactamente el archivo y texto originales.
  const pending = useRef<{ file: File; caption: string; requestId: string } | null>(null);
  useEffect(() => {
    onState({ hasFile: Boolean(file), busy, uncertain });
  }, [file, busy, uncertain, onState]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreview("");
    };
  }, [file]);
  const choose = (selected?: File) => {
    if (!selected || locked.current || uncertain) return;
    try {
      checkMediaFile(selected);
      setFile(selected);
      setError("");
      requestId.current = crypto.randomUUID();
      pending.current = null;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Archivo inválido.");
    }
  };
  const send = async () => {
    if (!file || locked.current || textBusy || (disabled && !uncertain)) return;
    if (!uncertain && caption.trim().length > 1024) {
      setError("El texto del adjunto admite hasta 1024 caracteres.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    onStart();
    const attempt = pending.current || {
      file,
      caption: caption.trim(),
      requestId: requestId.current || crypto.randomUUID(),
    };
    pending.current = attempt;
    const form = new FormData();
    form.set("conversationId", conversationId);
    form.set("requestId", attempt.requestId);
    form.set("caption", attempt.caption);
    form.set("file", attempt.file);
    try {
      const response = await fetch("/api/admin/whatsapp/media", { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        status?: string;
        messageId?: string;
        error?: string;
      } | null;
      if (!mounted.current) return;
      onResult();
      if (response.ok && data?.ok) {
        setFile(null);
        setUncertain(false);
        pending.current = null;
        onCaptionChange("");
      } else {
        const unknown =
          (uncertain && !data?.status) ||
          data?.status === "unknown" ||
          data?.status === "sending" ||
          (!data?.status && response.status >= 500);
        setUncertain(unknown);
        setError(data?.error || "No fue posible confirmar el envío. Revisa el historial.");
        if (!unknown) {
          pending.current = null;
          requestId.current = crypto.randomUUID();
        }
      }
    } catch {
      if (mounted.current) {
        setUncertain(true);
        setError(
          "La conexión se interrumpió. Comprueba el estado del mismo envío antes de intentar otro.",
        );
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <div className="wa-attachment-composer">
      <input
        ref={picker}
        aria-label="Seleccionar imagen o PDF"
        className="sr-only"
        type="file"
        accept={MEDIA_ACCEPT}
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
        disabled={disabled || busy || textBusy || uncertain}
      />
      <button
        type="button"
        className="wa-attach-button"
        disabled={disabled || busy || textBusy || uncertain}
        onClick={() => picker.current?.click()}
      >
        <Paperclip size={15} /> Adjuntar imagen o PDF
      </button>
      <small>JPG/PNG hasta 5 MB · PDF hasta 20 MB</small>
      {file && (
        <div className="wa-attachment-preview">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} width={60} height={60} alt="Vista previa del adjunto" />
          ) : (
            <FileText size={30} />
          )}
          <div>
            <strong>{file.name}</strong>
            <small>
              {file.size < 1024 * 1024
                ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                : `${(file.size / 1024 / 1024).toLocaleString("es-CL", { maximumFractionDigits: 2 })} MB`}{" "}
              ·{" "}
              {uncertain
                ? "Envío pendiente de comprobación"
                : "Listo para enviar con el texto de arriba"}
            </small>
          </div>
          {!uncertain && (
            <button
              type="button"
              disabled={busy}
              aria-label="Quitar adjunto"
              onClick={() => {
                setFile(null);
                setError("");
                pending.current = null;
              }}
            >
              <X size={17} />
            </button>
          )}
          {uncertain && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setUncertain(false);
                pending.current = null;
                onCaptionChange("");
                setError(
                  "El envío anterior sigue sin confirmar en el historial. No se repetirá automáticamente.",
                );
              }}
            >
              Continuar sin repetir el adjunto
            </button>
          )}
          <button
            type="button"
            className="wa-attachment-send"
            disabled={(disabled && !uncertain) || busy || textBusy}
            onClick={() => void send()}
          >
            {busy ? (
              <Loader2 className="animate-spin" size={15} />
            ) : uncertain ? (
              <RefreshCw size={15} />
            ) : (
              <Send size={15} />
            )}
            {busy ? "Procesando…" : uncertain ? "Comprobar envío" : "Enviar adjunto"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="wa-attachment-error">
          {error}
        </p>
      )}
    </div>
  );
}

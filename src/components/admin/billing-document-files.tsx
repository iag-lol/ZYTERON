"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileText, UploadCloud } from "lucide-react";
import type { BillingDocument, BillingTarget } from "@/lib/payments/billing-document-policy";
import s from "./billing-document-files.module.css";
type Listing = {
  userId: string;
  files: BillingDocument[];
  available: { id: string; title: string; fileName: string | null }[];
};
export function AdminBillingDocumentFiles({
  clientId,
  targetType,
  targetSource,
  targetId,
  canUpload,
}: BillingTarget & { clientId: string; canUpload: boolean }) {
  const [data, setData] = useState<Listing | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [title, setTitle] = useState(""),
    [existing, setExisting] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const url = `/api/portal/admin/clients/${encodeURIComponent(clientId)}/billing-documents?${new URLSearchParams({ targetType, targetSource, targetId })}`;
  const load = useCallback(async () => {
    const response = await fetch(url, { cache: "no-store" });
    const value = await response.json();
    if (!response.ok) throw Error(value.error || "No fue posible consultar las facturas.");
    setData(value);
  }, [url]);
  useEffect(() => {
    setData(null);
    setError("");
    setNotice("");
    void load().catch((e) => setError(e.message));
  }, [load]);
  async function save(upload: boolean) {
    if (busy || !data || (upload ? !file : !existing)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let response: Response;
      if (upload) {
        const form = new FormData();
        form.set("file", file!);
        form.set("title", title.trim() || `Factura · ${file!.name}`.slice(0, 180));
        form.set("category", "FACTURA");
        form.set("billingTargetType", targetType);
        form.set("billingTargetSource", targetSource);
        form.set("billingTargetId", targetId);
        response = await fetch(
          `/api/portal/admin/users/${encodeURIComponent(data.userId)}/documents`,
          { method: "POST", body: form },
        );
      } else
        response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ targetType, targetSource, targetId, documentId: existing }),
        });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "No fue posible guardar la factura.");
      await load();
      setFile(null);
      setTitle("");
      setExisting("");
      if (input.current) input.current.value = "";
      setNotice("Factura vinculada. Disponible en el portal del cliente según sus permisos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible guardar la factura.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.root} aria-label="Facturas adjuntas">
      <header>
        <FileText size={21} />
        <div>
          <h3>Factura {targetType === "PAYMENT" ? "del pago" : "del cobro"}</h3>
          <p>PDF asociado a este registro y disponible para su cliente.</p>
        </div>
      </header>
      {data?.files.map((document) => (
        <article className={s.file} key={document.id}>
          <div>
            <b>{document.title}</b>
            <small>{document.fileName}</small>
          </div>
          <div className={s.actions}>
            <a
              href={`${url}&documentId=${encodeURIComponent(document.documentId)}&inline=1`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} />
              Ver PDF
            </a>
            <a href={`${url}&documentId=${encodeURIComponent(document.documentId)}`}>
              <Download size={14} />
              Descargar
            </a>
          </div>
        </article>
      ))}
      {data && !data.files.length && (
        <p className={s.empty}>Este registro aún no tiene una factura adjunta.</p>
      )}
      {canUpload && data && (
        <>
          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault();
              void save(true);
            }}
          >
            <label>
              Título de la factura
              <input
                maxLength={180}
                placeholder="Ej. Factura N° 123"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={s.upload}>
              <UploadCloud size={22} />
              <span>
                <b>{file?.name || "Seleccionar factura en PDF"}</b>
                <small>Archivo PDF de hasta 20 MB</small>
              </span>
              <input
                ref={input}
                type="file"
                accept="application/pdf,.pdf"
                disabled={busy}
                onChange={(e) => {
                  const next = e.target.files?.[0] || null;
                  setFile(next);
                  setError("");
                  if (next && next.size > 20 * 1024 * 1024) {
                    setFile(null);
                    setError("La factura supera el máximo de 20 MB.");
                  }
                }}
              />
            </label>
            <button type="submit" disabled={busy || !file}>
              <UploadCloud size={15} />
              {busy ? "Guardando…" : "Subir y vincular factura"}
            </button>
          </form>
          {data.available.length > 0 && (
            <details className={s.existing}>
              <summary>Vincular un PDF ya cargado</summary>
              <label>
                Documento del cliente
                <select
                  value={existing}
                  onChange={(e) => setExisting(e.target.value)}
                  disabled={busy}
                >
                  <option value="">Seleccionar documento…</option>
                  {data.available.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} · {d.fileName}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy || !existing} onClick={() => void save(false)}>
                Vincular a este {targetType === "PAYMENT" ? "pago" : "cobro"}
              </button>
            </details>
          )}
        </>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
    </section>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Download, FileCheck2, X } from "lucide-react";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { civil, money } from "./production-model";
import styles from "./client-contracts.module.css";

const labels: Record<string, string> = {
  DRAFT: "Borrador para revisión",
  IN_REVIEW: "En revisión",
  PENDING_SIGNATURE: "Pendiente de firma",
  SIGNED: "Firmado",
  ACTIVE: "Activo",
  EXPIRING: "Próximo a vencer",
  EXPIRED: "Vencido",
  TERMINATED: "Finalizado",
  CANCELLED: "Cancelado",
  NOT_CONFIGURED: "Sin firma registrada",
  NOT_STARTED: "Sin inicio registrado",
  REQUESTED: "Firma solicitada",
  EFFECTIVE: "Vigente",
};
type Contract = PortalData["contracts"][number];
export function ClientContracts({
  contracts,
  query = "",
}: {
  contracts: Contract[];
  query?: string;
}) {
  const [selected, setSelected] = useState<Contract | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<{ url?: string; error?: string } | null>(null);
  useEffect(() => {
    if (!selected) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void fetch(`${selected.documentUrl}?inline=1`, {
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.headers.get("content-type")?.startsWith("application/pdf"))
          throw new Error("No se pudo abrir el PDF. Puedes volver a intentarlo o descargarlo.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ url: objectUrl });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setPreview({ error: error.message });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected]);
  const visible = contracts.filter((c) =>
    `${c.number} ${c.title}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  if (!visible.length) return null;
  return (
    <>
      <section className={styles.grid} aria-label="Contratos de tu empresa">
        {visible.map((c) => (
          <article className={styles.card} key={c.id}>
            <div className={styles.top}>
              <span className={styles.icon}>
                <FileCheck2 size={22} />
              </span>
              <span className={c.review ? styles.review : styles.status}>
                {c.review ? "Borrador para revisión" : labels[c.status] || c.status}
              </span>
            </div>
            <small className={styles.number}>
              {c.number} · VERSIÓN {c.version}
            </small>
            <h2>{c.title}</h2>
            <dl className={styles.details}>
              <div>
                <dt>Periodo del contrato</dt>
                <dd>
                  {c.start ? civil(c.start.slice(0, 10)) : "Por definir"} —{" "}
                  {c.end ? civil(c.end.slice(0, 10)) : "Indefinido"}
                </dd>
              </div>
              <div>
                <dt>Importe contractual</dt>
                <dd>{money(c.total, c.currency)}</dd>
              </div>
              <div>
                <dt>Firma</dt>
                <dd>{labels[c.signature] || c.signature}</dd>
              </div>
            </dl>
            {c.review && (
              <p className={styles.note}>
                Documento disponible para revisar. Su publicación no acredita firma ni activación.
              </p>
            )}
            <div className={styles.actions}>
              <button
                className="button primary"
                onClick={() => {
                  setPreview(null);
                  setSelected(c);
                }}
              >
                Ver contrato <ArrowUpRight size={16} />
              </button>
              <a className="button secondary" href={c.documentUrl} download>
                Descargar PDF <Download size={16} />
              </a>
            </div>
          </article>
        ))}
      </section>
      {selected && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby="contract-viewer-title"
          onCancel={() => setSelected(null)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <header className={styles.viewerHeader}>
            <div>
              <small>
                {selected.number} · VERSIÓN {selected.version}
              </small>
              <h2 id="contract-viewer-title">{selected.title}</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar contrato"
              onClick={() => setSelected(null)}
            >
              <X size={21} />
            </button>
          </header>
          {selected.review && (
            <p className={styles.viewerNotice}>Borrador para revisión · Sin firma registrada</p>
          )}
          {preview?.url ? (
            <iframe
              title={`PDF del contrato ${selected.number}`}
              src={preview.url}
              className={styles.pdf}
            />
          ) : (
            <div className={styles.loading} role={preview?.error ? "alert" : "status"}>
              {preview?.error || "Preparando el contrato…"}
            </div>
          )}
          <footer className={styles.viewerFooter}>
            <span>Documento compartido exclusivamente con tu empresa.</span>
            <a className="button primary" href={selected.documentUrl} download>
              Descargar PDF <Download size={16} />
            </a>
          </footer>
        </dialog>
      )}
    </>
  );
}

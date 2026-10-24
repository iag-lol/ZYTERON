import { Download, ExternalLink, FileCheck2, FileClock } from "lucide-react";
import type { BillingDocument } from "@/lib/payments/billing-document-policy";
import { civil } from "./production-model";
import s from "./invoice-files.module.css";
export function InvoiceFiles({
  files,
  enabled = true,
}: {
  files: readonly BillingDocument[];
  enabled?: boolean;
}) {
  return (
    <section className={s.root} aria-label="Facturas del registro">
      <header>
        <div className={s.icon}>
          {files.length ? <FileCheck2 size={23} /> : <FileClock size={23} />}
        </div>
        <div>
          <p>DOCUMENTACIÓN TRIBUTARIA</p>
          <h4>
            {files.length
              ? "Tu factura"
              : enabled
                ? "Factura pendiente de adjuntar"
                : "Factura no disponible en el portal"}
          </h4>
        </div>
      </header>
      {files.length ? (
        files.map((file) => (
          <article key={file.documentId} className={s.file}>
            <span className={s.pdf}>PDF</span>
            <div className={s.description}>
              <strong>{file.title}</strong>
              <small>{file.fileName}</small>
              <span>
                Adjunta el {civil(file.uploadedAt)}
                {file.size
                  ? ` · ${file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(file.size / 1024))} KB`}`
                  : ""}
              </span>
            </div>
            <div className={s.actions}>
              <a
                href={`/api/portal/billing-documents/${encodeURIComponent(file.id)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={15} />
                Ver factura
              </a>
              <a href={`/api/portal/billing-documents/${encodeURIComponent(file.id)}?download=1`}>
                <Download size={15} />
                Descargar PDF
              </a>
            </div>
          </article>
        ))
      ) : (
        <p className={s.empty}>
          {enabled
            ? "La factura aparecerá aquí cuando sea adjuntada por administración. Podrás verla o descargarla desde esta ventana."
            : "Consulta al equipo de Zyteron para revisar el acceso a los documentos de tu cuenta."}
        </p>
      )}
    </section>
  );
}

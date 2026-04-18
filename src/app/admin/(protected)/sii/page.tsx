import Link from "next/link";
import { AlertTriangle, FileBadge2, Landmark, Plus, ReceiptText, ShieldCheck } from "lucide-react";
import { currencyCLP } from "@/lib/admin/quote";
import { ZYTERON_SII } from "@/lib/company";
import { getTaxDocuments } from "@/lib/admin/repository";

export default async function SiiPage() {
  const documents = (await getTaxDocuments()).slice().sort((a, b) => (b.issueDate || "").localeCompare(a.issueDate || ""));
  const totalBilled = documents.reduce((acc, document) => acc + (document.totalAmount || 0), 0);
  const pendingDocuments = documents.filter((document) => !document.status || document.status === "Pendiente").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Centro tributario</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">SII · boletas y facturas</h1>
          <p className="mt-1 text-sm text-slate-500">{documents.length} documentos registrados · {currencyCLP(totalBilled)} documentados</p>
        </div>
        <Link href="/admin/sii/nuevo" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Registrar documento
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Estado de la empresa emisora</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Razón social</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{ZYTERON_SII.issuerName}</p>
              <p className="mt-1 text-sm text-slate-500">RUT {ZYTERON_SII.issuerRut}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Entorno actual</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{ZYTERON_SII.environment}</p>
              <p className="mt-1 text-sm text-slate-500">Configurable desde variables y credenciales reales.</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Advertencia operativa</p>
                <p className="mt-1 leading-6">
                  Este módulo deja trazabilidad interna y control documental. La emisión tributaria real ante SII requiere certificado digital,
                  CAF/folios autorizados, habilitación del contribuyente y la integración certificada correspondiente.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          {[
            { label: "Documentos", value: documents.length, helper: "Boletas y facturas", icon: FileBadge2 },
            { label: "Pendientes", value: pendingDocuments, helper: "Sin cierre tributario", icon: ReceiptText },
            { label: "Documentado", value: currencyCLP(totalBilled), helper: "Monto total", icon: ShieldCheck },
          ].map((card) => (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
                <card.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-2xl font-extrabold text-slate-900">{card.value}</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
            </div>
          ))}
        </section>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <span>Documento</span>
          <span>Tipo / folio</span>
          <span>Fechas</span>
          <span>Estado</span>
          <span>Total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {documents.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">Sin documentos tributarios registrados.</div>
          ) : (
            documents.map((document) => (
              <div key={document.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{document.notes || "Documento tributario"}</p>
                  <p className="mt-1 text-xs text-slate-500">{document.paymentStatus || "Sin estado de pago"}</p>
                </div>
                <div className="text-slate-600">
                  <p>{document.type || "Factura"}</p>
                  <p className="text-xs text-slate-400">N° {document.documentNumber || document.siiFolio || "Pendiente"}</p>
                </div>
                <div className="text-slate-600">
                  <p>{document.issueDate || "Sin emisión"}</p>
                  <p className="text-xs text-slate-400">Vence {document.dueDate || "—"}</p>
                </div>
                <div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{document.status || "Pendiente"}</span></div>
                <div className="font-semibold text-slate-900">{currencyCLP(document.totalAmount || 0)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, FileEdit, Mail, MapPin, Phone, ReceiptText } from "lucide-react";
import { currencyCLP } from "@/lib/admin/quote";
import { getQuoteById } from "@/lib/admin/repository";
import { QuoteSendEmailButton } from "@/components/admin/quote-send-email-button";

type Params = {
  params: Promise<{ id: string }>;
};

function infoRow(label: string, value?: string | null) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || "—"}</p>
    </div>
  );
}

export default async function CotizacionDetallePage({ params }: Params) {
  const { id } = await params;
  const quote = await getQuoteById(id);

  if (!quote) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/cotizaciones"
            className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Ficha comercial
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{quote.displayNumber}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Cliente {quote.company || quote.name} · Estado {quote.status || "PENDING"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/cotizaciones/${quote.id}/editar`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileEdit className="h-4 w-4" />
            Editar
          </Link>
          <a
            href={quote.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </a>
          <QuoteSendEmailButton quoteId={quote.id} hasEmail={Boolean(quote.email)} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Detalle cotizado</h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[2.4fr_0.8fr_1fr_0.8fr_1fr] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Concepto</span>
              <span>Cant.</span>
              <span>Precio unit.</span>
              <span>Desc.</span>
              <span>Total</span>
            </div>
            <div className="divide-y divide-slate-100">
              {quote.meta.items.map((item) => {
                const total =
                  item.qty * item.unitPrice - item.qty * item.unitPrice * ((item.discountPct || 0) / 100);
                return (
                  <div
                    key={`${quote.id}-${item.id ?? item.description}`}
                    className="grid grid-cols-[2.4fr_0.8fr_1fr_0.8fr_1fr] gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.description}</p>
                      <p className="text-xs text-slate-500">{item.detail || item.unit || "Servicio"}</p>
                    </div>
                    <span className="text-slate-700">{item.qty}</span>
                    <span className="text-slate-700">{currencyCLP(item.unitPrice)}</span>
                    <span className="text-slate-700">{item.discountPct || 0}%</span>
                    <span className="font-semibold text-slate-900">{currencyCLP(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">Notas</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {quote.meta.notes || "Sin notas adicionales."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">Términos</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {quote.meta.terms || "Sin términos registrados."}
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Cliente</h2>
            <div className="mt-4 space-y-4">
              {infoRow("Nombre", quote.name)}
              {infoRow("Empresa", quote.company)}
              {infoRow("RUT", quote.meta.clientRut)}
              {infoRow("Contacto", quote.meta.clientContact)}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {quote.email || "Sin email"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {quote.phone || "Sin teléfono"}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {[quote.meta.clientAddress, quote.meta.clientCity].filter(Boolean).join(", ") || "Sin dirección"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <h2 className="text-base font-bold">Resumen financiero</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-300">
                <span>Subtotal</span>
                <span>{currencyCLP(quote.meta.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Descuento</span>
                <span>-{currencyCLP(quote.meta.totalDescuento)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>IVA</span>
                <span>{currencyCLP(quote.meta.iva)}</span>
              </div>
              <div className="border-t border-white/10 pt-3 text-base font-bold text-white">
                <div className="flex items-center justify-between">
                  <span>Total</span>
                  <span>{currencyCLP(quote.totalAmount)}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-300" />
                Emisión {new Date(quote.issuedAt).toLocaleDateString("es-CL")}
              </p>
              <p className="mt-2">Validez {quote.meta.validityDays || "30 días"} · Pago {quote.meta.paymentMethod || "Transferencia"}</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

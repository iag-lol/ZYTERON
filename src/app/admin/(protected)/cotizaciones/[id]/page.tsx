import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardCheck, ClipboardPlus, Download, ExternalLink, FileEdit, Mail, MapPin, Phone, ReceiptText } from "lucide-react";
import { currencyCLP } from "@/lib/admin/quote";
import { getQuoteById, getWorkOrderByQuoteId } from "@/lib/admin/repository";
import { QuoteSendEmailButton } from "@/components/admin/quote-send-email-button";
import { isManualQuote } from "@/lib/admin/work-orders";
import { CopySummaryButton } from "@/components/admin/copy-summary-button";
import { QuoteRequestIntegrationButton } from "@/components/admin/quote-request-integration-button";
import {
  BINARY_CHOICE_LABELS,
  INTEGRATION_STATUS_LABELS,
  isQuoteRequestMeta,
  requestStageLabel,
  whatsappPublicLink,
} from "@/lib/quote-requests";

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
  const [quote, workOrder] = await Promise.all([getQuoteById(id), getWorkOrderByQuoteId(id)]);

  if (!quote) {
    notFound();
  }

  const isRequestQuote = isQuoteRequestMeta(quote.meta);
  const canGenerateOt = isManualQuote(quote) && ["PENDING", "SENT"].includes(String(quote.status || "").toUpperCase());
  const requestSummaryText = isRequestQuote
    ? [
        `Código: ${quote.meta.quoteCode || quote.displayNumber}`,
        `Tipo: ${quote.meta.projectTypeLabel || "Solicitud web"}`,
        `Cliente: ${quote.meta.contactName || quote.name || "Sin nombre"}`,
        `Empresa: ${quote.meta.contactCompany || quote.meta.businessName || quote.company || "Sin empresa"}`,
        `WhatsApp: ${quote.meta.contactWhatsapp || quote.phone || "Sin WhatsApp"}`,
        `Email: ${quote.meta.contactEmail || quote.email || "Sin email"}`,
        `Presupuesto: ${quote.meta.budgetRangeLabel || "No definido"}`,
        `Urgencia: ${quote.meta.urgencyLabel || "No definida"}`,
        `Plazo: ${quote.meta.deadlineLabel || "No definido"}`,
        "",
        "Resumen:",
        quote.meta.shortSummary || "Sin resumen",
      ].join("\n")
    : "";

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
              {isRequestQuote ? "Solicitud web" : "Ficha comercial"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{quote.meta.quoteCode || quote.displayNumber}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Cliente {quote.meta.contactCompany || quote.company || quote.name} · Estado {isRequestQuote ? requestStageLabel(quote.meta.requestStage) : quote.status || "PENDING"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isRequestQuote ? (
            <>
              <a
                href={whatsappPublicLink(quote.meta.contactWhatsappE164 || quote.meta.contactWhatsapp || quote.phone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Phone className="h-4 w-4" />
                Abrir WhatsApp
              </a>
              <CopySummaryButton text={requestSummaryText} />
              <QuoteRequestIntegrationButton channel="email" quoteId={quote.id} />
              <QuoteRequestIntegrationButton channel="whatsapp" quoteId={quote.id} />
            </>
          ) : workOrder ? (
            <Link
              href="/admin/ordenes-trabajo"
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
            >
              <ClipboardCheck className="h-4 w-4" />
              OT vinculada
            </Link>
          ) : canGenerateOt ? (
            <form action="/admin/ordenes-trabajo/generar" method="post">
              <input type="hidden" name="quoteId" value={quote.id} />
              <input type="hidden" name="source" value="MANUAL_QUOTE" />
              <input type="hidden" name="redirectTo" value="/admin/cotizaciones" />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              >
                <ClipboardPlus className="h-4 w-4" />
                Generar OT
              </button>
            </form>
          ) : null}
          {!isRequestQuote ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        {isRequestQuote ? (
          <section className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Resumen de la solicitud</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tipo de proyecto</p>
                  <p className="mt-2 text-lg font-extrabold text-slate-900">{quote.meta.projectTypeLabel || "Solicitud web"}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{quote.meta.shortSummary || "Sin resumen adicional."}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Prioridad</p>
                  <p className="mt-2 text-lg font-extrabold text-slate-900">{quote.meta.priority || "Media"}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Presupuesto {quote.meta.budgetRangeLabel || "no definido"} · plazo {quote.meta.deadlineLabel || "no definido"} · urgencia {quote.meta.urgencyLabel || "no definida"}.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {quote.meta.projectAnswers?.map((answer) => (
                  <div key={answer.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-bold text-slate-900">{answer.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{answer.value}</p>
                  </div>
                ))}
                {quote.meta.projectComment ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-bold text-slate-900">Comentario breve</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{quote.meta.projectComment}</p>
                  </div>
                ) : null}
                {quote.meta.additionalMessage ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-bold text-slate-900">Mensaje adicional</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{quote.meta.additionalMessage}</p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Negocio</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  infoRow("Negocio", quote.meta.businessName),
                  infoRow("Rubro", quote.meta.businessRubro),
                  infoRow("Ciudad o región", quote.meta.businessCity),
                  infoRow("Tiene web", BINARY_CHOICE_LABELS[(quote.meta.hasWebsite as "si" | "no" | "no-se") || "no-se"]),
                  infoRow("Tiene logo", BINARY_CHOICE_LABELS[(quote.meta.hasLogo as "si" | "no" | "no-se") || "no-se"]),
                  infoRow("Tiene dominio", BINARY_CHOICE_LABELS[(quote.meta.hasDomain as "si" | "no" | "no-se") || "no-se"]),
                  infoRow("Tiene textos e imágenes", BINARY_CHOICE_LABELS[(quote.meta.hasContent as "si" | "no" | "no-se") || "no-se"]),
                ].map((node, index) => (
                  <div key={index}>{node}</div>
                ))}
              </div>
            </section>
          </section>
        ) : (
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
        )}

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Cliente</h2>
            <div className="mt-4 space-y-4">
              {infoRow("Nombre", quote.meta.contactName || quote.name)}
              {infoRow("Empresa", quote.meta.contactCompany || quote.company)}
              {infoRow("RUT", quote.meta.clientRut)}
              {infoRow("Contacto", quote.meta.clientContact)}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {quote.meta.contactEmail || quote.email || "Sin email"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {quote.meta.contactWhatsapp || quote.phone || "Sin teléfono"}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {[quote.meta.clientAddress, quote.meta.clientCity || quote.meta.businessCity].filter(Boolean).join(", ") || "Sin dirección"}
                  </p>
                  {isRequestQuote && quote.meta.currentWebsite ? (
                    <a
                      href={quote.meta.currentWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-blue-700 transition-colors hover:text-blue-900"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver sitio actual
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {isRequestQuote ? (
            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-blue-900 shadow-sm">
              <h2 className="text-base font-bold">Seguimiento interno</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-blue-800">
                  <span>Etapa</span>
                  <span>{requestStageLabel(quote.meta.requestStage)}</span>
                </div>
                <div className="flex items-center justify-between text-blue-800">
                  <span>Correo</span>
                  <span>{INTEGRATION_STATUS_LABELS[(quote.meta.emailStatus as "pending" | "sent" | "failed") || "pending"]}</span>
                </div>
                <div className="flex items-center justify-between text-blue-800">
                  <span>WhatsApp</span>
                  <span>{INTEGRATION_STATUS_LABELS[(quote.meta.whatsappStatus as "pending" | "sent" | "failed") || "pending"]}</span>
                </div>
                <div className="flex items-center justify-between text-blue-800">
                  <span>Prioridad</span>
                  <span>{quote.meta.priority || "Media"}</span>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-blue-800">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  Recibida {new Date(quote.meta.submittedAt || quote.issuedAt).toLocaleDateString("es-CL")}
                </p>
                <p className="mt-2">Presupuesto {quote.meta.budgetRangeLabel || "no definido"} · plazo {quote.meta.deadlineLabel || "no definido"}</p>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-blue-900 shadow-sm">
              <h2 className="text-base font-bold">Resumen financiero</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-blue-800">
                  <span>Subtotal</span>
                  <span>{currencyCLP(quote.meta.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-blue-800">
                  <span>Descuento</span>
                  <span>-{currencyCLP(quote.meta.totalDescuento)}</span>
                </div>
                <div className="flex items-center justify-between text-blue-800">
                  <span>IVA</span>
                  <span>{currencyCLP(quote.meta.iva)}</span>
                </div>
                <div className="border-t border-blue-200 pt-3 text-base font-bold text-blue-900">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span>{currencyCLP(quote.totalAmount)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-blue-800">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  Emisión {new Date(quote.issuedAt).toLocaleDateString("es-CL")}
                </p>
                <p className="mt-2">Validez {quote.meta.validityDays || "30 días"} · Pago {quote.meta.paymentMethod || "Transferencia"}</p>
              </div>
            </section>
          )}

          {isRequestQuote && quote.meta.errorLog?.length ? (
            <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <h2 className="text-base font-bold text-rose-700">Log de integración</h2>
              <div className="mt-4 space-y-2 text-sm text-rose-700">
                {quote.meta.errorLog.slice(-5).map((line) => (
                  <p key={line} className="rounded-xl border border-rose-200 bg-white px-3 py-2">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

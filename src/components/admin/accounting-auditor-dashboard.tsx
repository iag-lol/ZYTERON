import Link from "next/link";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  Download,
  FileText,
  Landmark,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { AccountingAlert, AccountingDashboardData, AccountingTransaction } from "@/lib/admin/accounting";

type Props = {
  data: AccountingDashboardData;
};

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function transactionStatusClass(status?: string | null) {
  switch (status) {
    case "PAGADO":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "ANULADO":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "OBSERVADO":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function alertClass(alert: AccountingAlert) {
  switch (alert.severity) {
    case "CRITICAL":
      return "border-rose-200 bg-rose-50";
    case "WARNING":
      return "border-amber-200 bg-amber-50";
    default:
      return "border-blue-200 bg-blue-50";
  }
}

function companyLabel(transaction: AccountingTransaction) {
  return transaction.receiver_name || transaction.issuer_name || "Sin contraparte";
}

export function AccountingAuditorDashboard({ data }: Props) {
  const xlsxHref = `/admin/contador-auditor/export/xlsx?period=${data.selectedPeriod}`;
  const pdfHref = `/admin/contador-auditor/export/pdf?period=${data.selectedPeriod}`;

  return (
    <div className="space-y-8">
      {!data.schemaReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El modulo esta listo en frontend, pero aun no detecta datos contables en Supabase. Ejecuta
          <span className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-[12px] text-amber-900">
            supabase/accounting_auditor_bootstrap.sql
          </span>
          para habilitar tablas, vistas y exportes oficiales.
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Modulo financiero auditable</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Contador Auditor Inteligente</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Control centralizado de ingresos, egresos, F29, respaldo documental, trazabilidad por proyecto y alertas operativas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={xlsxHref}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Descargar XLSX
          </a>
          <a
            href={pdfHref}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            Descargar PDF
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {data.availablePeriods.map((period) => {
            const active = period === data.selectedPeriod;
            return (
              <Link
                key={period}
                href={`/admin/contador-auditor?period=${period}`}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {period}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Ingresos del periodo",
            value: currency(Number(data.summary.income_total || 0)),
            helper: `${data.summary.income_count || 0} documentos`,
            icon: WalletCards,
            iconBg: "bg-blue-50 text-blue-700",
          },
          {
            label: "Egresos del periodo",
            value: currency(Number(data.summary.expense_total || 0)),
            helper: `${data.summary.expense_count || 0} movimientos`,
            icon: ReceiptText,
            iconBg: "bg-rose-50 text-rose-700",
          },
          {
            label: "Balance IVA",
            value: currency(Number(data.summary.iva_balance || 0)),
            helper: `Debito ${currency(Number(data.summary.iva_debito || 0))}`,
            icon: Landmark,
            iconBg: "bg-amber-50 text-amber-700",
          },
          {
            label: "Pendiente",
            value: currency(Number(data.summary.pending_total || 0)),
            helper: `${data.alerts.length} alertas abiertas`,
            icon: AlertTriangle,
            iconBg: "bg-slate-100 text-slate-700",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-extrabold text-slate-900">{card.value}</p>
            <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900">Estado tributario del periodo</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Periodo</p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">{data.selectedPeriod}</p>
              <p className="mt-1 text-sm text-slate-500">
                {data.summary.declared_in_sii ? "Declarado en SII" : "Pendiente de declaracion"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bloqueo contable</p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">{data.summary.locked ? "Inmutable" : "Abierto"}</p>
              <p className="mt-1 text-sm text-slate-500">
                {data.summary.locked ? "No admite nuevas modificaciones." : "Aun permite registros y ajustes."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Declarado el</p>
              <p className="mt-2 text-base font-bold text-slate-900">{formatDate(data.summary.declared_at)}</p>
              <p className="mt-1 text-sm text-slate-500">Registro oficial del cierre mensual.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">F29</p>
              {data.summary.f29_document_url ? (
                <a
                  href={data.summary.f29_document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  Descargar formulario
                </a>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-900">Sin respaldo cargado</p>
              )}
              <p className="mt-1 text-sm text-slate-500">Adjunto oficial del periodo declarado.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <h2 className="text-base font-bold text-slate-900">Alertas inteligentes</h2>
          </div>
          <div className="space-y-3">
            {data.alerts.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                No hay alertas abiertas para este periodo.
              </div>
            ) : (
              data.alerts.slice(0, 6).map((alert) => (
                <article key={alert.alert_key} className={`rounded-2xl border px-4 py-3 ${alertClass(alert)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{alert.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 ring-1 ring-slate-200">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {alert.module} · {formatDate(alert.created_at)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Libro contable digital</h2>
            <p className="text-xs text-slate-500">Movimientos del periodo con montos, contraparte y respaldo.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {data.transactions.length} registros
          </span>
        </div>

        {data.transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">No hay transacciones registradas para este periodo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left">Documento</th>
                  <th className="px-6 py-3 text-left">Contraparte</th>
                  <th className="px-6 py-3 text-left">Categoria</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-left">Respaldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{transaction.document_number || transaction.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(transaction.document_date)}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{companyLabel(transaction)}</td>
                    <td className="px-6 py-4 text-slate-600">{transaction.category}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${transactionStatusClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{currency(Number(transaction.total || 0))}</td>
                    <td className="px-6 py-4">
                      {transaction.document_url ? (
                        <a
                          href={transaction.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900"
                        >
                          Descargar
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Sin archivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-orange-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Trazabilidad de proyectos</h2>
                <p className="text-xs text-slate-500">Cotizacion, OT, facturacion y pago por proyecto.</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {data.projectTraceability.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data.projectTraceability.slice(0, 8).map((project) => (
              <article key={project.project_id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{project.project_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {project.client_name || "Sin cliente"} · OT {project.ot_number || "Pendiente"} · Cot. {project.quote_id || "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    {project.project_status || "COTIZADO"}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estimado</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{currency(Number(project.estimated_total || 0))}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Facturado</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{currency(Number(project.invoiced_total || 0))}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pagado</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{currency(Number(project.paid_total || 0))}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Respaldo documental</h2>
                <p className="text-xs text-slate-500">Archivos del periodo disponibles para descarga.</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {data.documents.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data.documents.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">No hay documentos cargados en este periodo.</div>
            ) : (
              data.documents.slice(0, 8).map((document) => (
                <article key={document.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{document.file_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {document.document_kind} · {document.project_name || "Sin proyecto"} · {formatDate(document.document_date || document.created_at)}
                      </p>
                    </div>
                    {document.public_url ? (
                      <a
                        href={document.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Sin URL publica</span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

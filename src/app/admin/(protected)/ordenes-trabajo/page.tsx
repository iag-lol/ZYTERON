import Link from "next/link";
import { BriefcaseBusiness, CheckCircle2, FilePlus2, FileText, ShieldAlert, XCircle } from "lucide-react";
import { getQuotes, getWorkOrders } from "@/lib/admin/repository";
import {
  isManualQuote,
  isWebCheckoutQuote,
  normalizeWorkOrderStatus,
  workOrderDisplayClient,
  workOrderStatusLabel,
  workOrderStatusStyles,
} from "@/lib/admin/work-orders";

type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "CLOSED" | "CANCELLED";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sourceLabel(value?: string | null) {
  return String(value || "").toUpperCase() === "WEB_ORDER" ? "Venta web" : "Cotización manual";
}

function sourceStyles(value?: string | null) {
  return String(value || "").toUpperCase() === "WEB_ORDER"
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-violet-200 bg-violet-50 text-violet-700";
}

function normalizeFilter(value?: string): StatusFilter {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "COMPLETED" || normalized === "CLOSED" || normalized === "CANCELLED") {
    return normalized;
  }
  return "ALL";
}

type PageProps = {
  searchParams?:
    | {
        status?: string;
        ot_created?: string;
        ot_error?: string;
        ot_schema_missing?: string;
        ot_status_error?: string;
        ot_exists?: string;
        ot_not_found?: string;
        ot_invalid_quote?: string;
        ot_permission_error?: string;
      }
    | Promise<{
        status?: string;
        ot_created?: string;
        ot_error?: string;
        ot_schema_missing?: string;
        ot_status_error?: string;
        ot_exists?: string;
        ot_not_found?: string;
        ot_invalid_quote?: string;
        ot_permission_error?: string;
      }>;
};

export default async function OrdenesTrabajoPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const activeFilter = normalizeFilter(query?.status);

  const [quotes, workOrders] = await Promise.all([getQuotes(), getWorkOrders()]);
  const quotesById = new Map(quotes.map((quote) => [quote.id, quote]));

  const manualPendingQuotes = quotes
    .filter((quote) => isManualQuote(quote))
    .filter((quote) => {
      const status = String(quote.status || "").toUpperCase();
      return status === "PENDING" || status === "SENT";
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const webQuotes = quotes
    .filter((quote) => isWebCheckoutQuote(quote))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const workOrdersSorted = workOrders
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const visibleWorkOrders =
    activeFilter === "ALL"
      ? workOrdersSorted
      : workOrdersSorted.filter((order) => {
          const status = normalizeWorkOrderStatus(order.status);
          if (activeFilter === "ACTIVE") {
            return status === "ACTIVE" || status === "IN_PROGRESS";
          }
          return status === activeFilter;
        });

  const activeCount = workOrdersSorted.filter((order) => {
    const status = normalizeWorkOrderStatus(order.status);
    return status === "ACTIVE" || status === "IN_PROGRESS";
  }).length;
  const completedCount = workOrdersSorted.filter((order) => normalizeWorkOrderStatus(order.status) === "COMPLETED").length;
  const closedCount = workOrdersSorted.filter((order) => normalizeWorkOrderStatus(order.status) === "CLOSED").length;
  const cancelledCount = workOrdersSorted.filter((order) => normalizeWorkOrderStatus(order.status) === "CANCELLED").length;

  const budgetTotal = visibleWorkOrders.reduce((acc, order) => acc + (order.budget || 0), 0);

  return (
    <div className="space-y-8">
      {query?.ot_created === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Orden de trabajo generada correctamente.
        </div>
      ) : null}
      {query?.ot_exists === "1" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Ya existe una orden de trabajo para esa cotización.
        </div>
      ) : null}
      {query?.ot_schema_missing === "1" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo acceder a WorkOrder. Revisa que la tabla exista (bootstrap SQL) y que esté visible con permisos de escritura.
        </div>
      ) : null}
      {query?.ot_permission_error === "1" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No hay permisos para crear OT en WorkOrder. Revisa service role key o políticas RLS.
        </div>
      ) : null}
      {query?.ot_error === "1" || query?.ot_status_error === "1" || query?.ot_not_found === "1" || query?.ot_invalid_quote === "1" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo completar la operación de orden de trabajo. Verifica estado/cotización e inténtalo nuevamente.
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Operación técnica</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Órdenes de trabajo</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de ejecución para cotizaciones manuales y ventas web.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Presupuesto visible</p>
          <p className="text-lg font-extrabold text-slate-900">{currency(budgetTotal)}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Activas", value: activeCount, icon: BriefcaseBusiness, tone: "text-amber-700 bg-amber-100" },
          { label: "Terminadas", value: completedCount, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
          { label: "Cerradas", value: closedCount, icon: FileText, tone: "text-slate-700 bg-slate-200" },
          { label: "Canceladas", value: cancelledCount, icon: XCircle, tone: "text-rose-700 bg-rose-100" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{card.value}</p>
            <p className="text-xs font-semibold text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FilePlus2 className="h-4.5 w-4.5 text-violet-600" />
            <h2 className="text-sm font-bold text-slate-900">Generar OT desde cotización pendiente</h2>
          </div>
          <form action="/admin/ordenes-trabajo/generar" method="post" className="space-y-3">
            <select
              name="quoteId"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            >
              <option value="">Selecciona cotización manual pendiente...</option>
              {manualPendingQuotes.map((quote) => (
                <option key={quote.id} value={quote.id}>
                  {quote.displayNumber} · {quote.company || quote.name || quote.email} · {currency(quote.totalAmount || 0)}
                </option>
              ))}
            </select>
            <input type="hidden" name="source" value="MANUAL_QUOTE" />
            <input type="hidden" name="redirectTo" value="/admin/ordenes-trabajo" />
            <button
              type="submit"
              disabled={manualPendingQuotes.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FilePlus2 className="h-4 w-4" />
              Crear OT manual
            </button>
          </form>
          {manualPendingQuotes.length === 0 ? (
            <p className="mt-2 text-[12px] text-slate-500">No hay cotizaciones manuales pendientes disponibles.</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Generar OT desde venta web</h2>
          </div>
          <form action="/admin/ordenes-trabajo/generar" method="post" className="space-y-3">
            <select
              name="quoteId"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecciona pedido web...</option>
              {webQuotes.map((quote) => (
                <option key={quote.id} value={quote.id}>
                  WEB-{quote.id.slice(0, 8).toUpperCase()} · {quote.name || quote.email} · {currency(quote.totalAmount || 0)}
                </option>
              ))}
            </select>
            <input type="hidden" name="source" value="WEB_ORDER" />
            <input type="hidden" name="redirectTo" value="/admin/ordenes-trabajo" />
            <button
              type="submit"
              disabled={webQuotes.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FilePlus2 className="h-4 w-4" />
              Crear OT web
            </button>
          </form>
          {webQuotes.length === 0 ? (
            <p className="mt-2 text-[12px] text-slate-500">No hay ventas web disponibles para crear OT.</p>
          ) : null}
        </section>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "ALL", label: "Todas", count: workOrdersSorted.length },
            { key: "ACTIVE", label: "Activas", count: activeCount },
            { key: "COMPLETED", label: "Terminadas", count: completedCount },
            { key: "CLOSED", label: "Cerradas", count: closedCount },
            { key: "CANCELLED", label: "Canceladas", count: cancelledCount },
          ].map((filter) => {
            const href = filter.key === "ALL" ? "/admin/ordenes-trabajo" : `/admin/ordenes-trabajo?status=${filter.key}`;
            const active = activeFilter === filter.key;
            return (
              <Link
                key={filter.key}
                href={href}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">{filter.count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Control operativo de OT</h2>
            <p className="text-xs text-slate-400">{visibleWorkOrders.length} registros en vista actual</p>
          </div>
        </div>

        {visibleWorkOrders.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-200" />
            <p className="mt-3 text-base font-semibold text-slate-500">Sin órdenes de trabajo</p>
            <p className="mt-1 text-sm text-slate-400">Genera una OT desde cotización manual o venta web.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.2fr_1.4fr_1fr_0.9fr_1fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-6 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <span>OT</span>
              <span>Cliente / alcance</span>
              <span>Origen</span>
              <span>Presupuesto</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleWorkOrders.map((order) => {
                const client = workOrderDisplayClient(order, quotesById);
                const status = normalizeWorkOrderStatus(order.status);
                const linkedQuote = order.quoteId ? quotesById.get(order.quoteId) : null;

                return (
                  <div key={order.id} className="grid grid-cols-[1.2fr_1.4fr_1fr_0.9fr_1fr_auto] gap-3 px-6 py-4 hover:bg-slate-50">
                    <div>
                      <p className="font-mono text-[12px] font-bold text-slate-800">{order.code}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Creada {dateLabel(order.createdAt)}</p>
                      <p className="text-[11px] text-slate-500">Entrega {dateLabel(order.dueDate)}</p>
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{client.name}</p>
                      <p className="text-[11px] text-slate-500">{client.email || "Sin email"}</p>
                      <p className="text-[11px] text-slate-500">{order.title}</p>
                    </div>

                    <div>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${sourceStyles(order.source)}`}>
                        {sourceLabel(order.source)}
                      </span>
                      {linkedQuote ? (
                        <p className="mt-2 text-[11px] text-slate-500">{linkedQuote.displayNumber}</p>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{currency(order.budget || 0)}</p>
                      <p className="text-[11px] text-slate-500">{order.estimatedHours || 0} h estimadas</p>
                    </div>

                    <div>
                      <form action={`/admin/ordenes-trabajo/${order.id}/estado`} method="post" className="flex items-center gap-1.5">
                        <select
                          name="status"
                          defaultValue={status}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="ACTIVE">Activa</option>
                          <option value="IN_PROGRESS">En progreso</option>
                          <option value="COMPLETED">Terminada</option>
                          <option value="CLOSED">Cerrada</option>
                          <option value="CANCELLED">Cancelada</option>
                        </select>
                        <input type="hidden" name="redirectTo" value={activeFilter === "ALL" ? "/admin/ordenes-trabajo" : `/admin/ordenes-trabajo?status=${activeFilter}`} />
                        <button
                          type="submit"
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${workOrderStatusStyles(status)}`}
                        >
                          {workOrderStatusLabel(status)}
                        </button>
                      </form>
                    </div>

                    <div className="flex items-start gap-2">
                      <a
                        href={order.pdfUrl || `/admin/ordenes-trabajo/${order.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        PDF
                      </a>
                      {linkedQuote ? (
                        <Link
                          href={`/admin/cotizaciones/${linkedQuote.id}`}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Cotización
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

import { getAdminSnapshot } from "@/lib/admin-data";
import {
  ArrowUpRight,
  BarChart2,
  ClipboardCheck,
  ClipboardPlus,
  Download,
  FileEdit,
  FileText,
  Phone,
  Plus,
  Target,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { QuoteSendEmailButton } from "@/components/admin/quote-send-email-button";
import { QuoteRequestIntegrationButton } from "@/components/admin/quote-request-integration-button";
import { QuoteDeleteButton } from "@/components/admin/quote-delete-button";
import { getWorkOrders } from "@/lib/admin/repository";
import { isManualQuote } from "@/lib/admin/work-orders";
import {
  INTEGRATION_STATUS_LABELS,
  isQuoteRequestMeta,
  requestStageLabel,
  whatsappPublicLink,
} from "@/lib/quote-requests";
import { AutoSubmitSelect } from "@/components/admin/auto-submit-select";

type QuoteStatus = "PENDING" | "SENT" | "WON" | "LOST";
type QuoteStatusFilter = "ALL" | QuoteStatus;

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string; ring: string }> = {
  PENDING: { label: "Pendiente", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  SENT: { label: "Enviada", dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  WON: { label: "Ganada", dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  LOST: { label: "Pérdida", dot: "bg-rose-400", bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
};

const avatarColors = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function normalizeQuoteStatus(status?: string | null): QuoteStatus {
  const value = String(status || "").trim().toUpperCase();
  if (value === "SENT" || value === "WON" || value === "LOST") return value;
  return "PENDING";
}

function normalizeQuoteStatusFilter(status?: string | null): QuoteStatusFilter {
  const value = String(status || "").trim().toUpperCase();
  if (value === "PENDING" || value === "SENT" || value === "WON" || value === "LOST") return value;
  return "ALL";
}

function buildReturnUrl(input: {
  status: QuoteStatusFilter;
  query: string;
  projectType: string;
  urgency: string;
}) {
  const params = new URLSearchParams();
  if (input.status !== "ALL") params.set("status", input.status);
  if (input.query) params.set("query", input.query);
  if (input.projectType) params.set("project_type", input.projectType);
  if (input.urgency) params.set("urgency", input.urgency);
  const query = params.toString();
  return query ? `/admin/cotizaciones?${query}` : "/admin/cotizaciones";
}

function matchesSearch(values: Array<string | null | undefined>, search: string) {
  if (!search) return true;
  const normalized = search.trim().toLowerCase();
  return values.some((value) => String(value || "").toLowerCase().includes(normalized));
}

type PageProps = {
  searchParams?:
    | {
        status?: string;
        query?: string;
        project_type?: string;
        urgency?: string;
        status_error?: string;
        email_sent?: string;
        email_error?: string;
        email_id?: string;
        email_event?: string;
        ot_created?: string;
        ot_error?: string;
        ot_exists?: string;
        ot_invalid_quote?: string;
        ot_not_found?: string;
        ot_schema_missing?: string;
        ot_permission_error?: string;
      }
    | Promise<{
        status?: string;
        query?: string;
        project_type?: string;
        urgency?: string;
        status_error?: string;
        email_sent?: string;
        email_error?: string;
        email_id?: string;
        email_event?: string;
        ot_created?: string;
        ot_error?: string;
        ot_exists?: string;
        ot_invalid_quote?: string;
        ot_not_found?: string;
        ot_schema_missing?: string;
        ot_permission_error?: string;
      }>;
};

export default async function CotizacionesPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const activeFilter = normalizeQuoteStatusFilter(query?.status);
  const searchText = String(query?.query || "").trim();
  const projectTypeFilter = String(query?.project_type || "").trim().toLowerCase();
  const urgencyFilter = String(query?.urgency || "").trim().toLowerCase();
  const statusError = query?.status_error === "1";
  const emailSent = query?.email_sent === "1";
  const emailError = query?.email_error ? decodeURIComponent(query.email_error) : "";
  const emailId = query?.email_id ? String(query.email_id) : "";
  const emailEvent = query?.email_event ? String(query.email_event) : "";
  const otCreated = query?.ot_created === "1";
  const otError = query?.ot_error === "1";
  const otExists = query?.ot_exists === "1";
  const otInvalidQuote = query?.ot_invalid_quote === "1";
  const otNotFound = query?.ot_not_found === "1";
  const otSchemaMissing = query?.ot_schema_missing === "1";
  const otPermissionError = query?.ot_permission_error === "1";

  const [data, workOrders] = await Promise.all([getAdminSnapshot(), getWorkOrders()]);
  const manualQuotes = data.quotes
    .filter((quote) => isManualQuote(quote))
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const requestQuotes = manualQuotes.filter((quote) => isQuoteRequestMeta(quote.meta));
  const standardQuotes = manualQuotes.filter((quote) => !isQuoteRequestMeta(quote.meta));

  const workOrderByQuote = new Map(
    workOrders
      .filter((order) => String(order.source || "").toUpperCase() === "MANUAL_QUOTE")
      .filter((order) => Boolean(order.quoteId))
      .map((order) => [String(order.quoteId), order]),
  );

  const quotes = manualQuotes.filter((q) => {
    const statusMatch = activeFilter === "ALL" || normalizeQuoteStatus(q.status) === activeFilter;
    if (!statusMatch) return false;

    const meta = q.meta;
    const request = isQuoteRequestMeta(meta);

    if (projectTypeFilter) {
      if (!request || String(meta.projectType || "").toLowerCase() !== projectTypeFilter) return false;
    }

    if (urgencyFilter) {
      if (!request || String(meta.urgency || "").toLowerCase() !== urgencyFilter) return false;
    }

    return matchesSearch(
      [
        q.displayNumber,
        q.name,
        q.company,
        q.email,
        q.phone,
        request ? meta.quoteCode : "",
        request ? meta.projectTypeLabel : "",
        request ? meta.contactCompany : "",
        request ? meta.contactWhatsapp : "",
      ],
      searchText,
    );
  });

  const pipelineValue = manualQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const wonValue = manualQuotes
    .filter((q) => normalizeQuoteStatus(q.status) === "WON")
    .reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const pending = manualQuotes.filter((q) => normalizeQuoteStatus(q.status) === "PENDING").length;
  const sent = manualQuotes.filter((q) => normalizeQuoteStatus(q.status) === "SENT").length;
  const won = manualQuotes.filter((q) => normalizeQuoteStatus(q.status) === "WON").length;
  const lost = manualQuotes.filter((q) => normalizeQuoteStatus(q.status) === "LOST").length;
  const filteredPipelineValue = quotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const filteredWonValue = quotes
    .filter((q) => normalizeQuoteStatus(q.status) === "WON")
    .reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const winRate = manualQuotes.length ? Math.round((won / manualQuotes.length) * 100) : 0;
  const returnTo = buildReturnUrl({
    status: activeFilter,
    query: searchText,
    projectType: projectTypeFilter,
    urgency: urgencyFilter,
  });

  const stats = [
    {
      label: "Pipeline total",
      value: currency(pipelineValue),
      sub: `${manualQuotes.length} registros activos`,
      icon: BarChart2,
      iconBg: "bg-blue-500",
      shadow: "shadow-blue-500/30",
    },
    {
      label: "Solicitudes web",
      value: requestQuotes.length,
      sub: `${standardQuotes.length} cotizaciones manuales`,
      icon: ClipboardCheck,
      iconBg: "bg-cyan-500",
      shadow: "shadow-cyan-500/30",
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      sub: `${won} ganadas de ${manualQuotes.length}`,
      icon: Target,
      iconBg: "bg-violet-500",
      shadow: "shadow-violet-500/30",
    },
    {
      label: "Ingresos ganados",
      value: currency(wonValue),
      sub: `${won} cotizaciones WON`,
      icon: DollarSign,
      iconBg: "bg-emerald-500",
      shadow: "shadow-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-8">
      {statusError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo actualizar el estado o etapa del registro. Inténtalo nuevamente.
        </div>
      ) : null}
      {emailSent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Cotización enviada correctamente por correo con PDF adjunto.
          {emailId ? (
            <span className="ml-1 text-emerald-800">
              ID: <strong>{emailId}</strong>
              {emailEvent ? ` · estado inicial: ${emailEvent}` : ""}
            </span>
          ) : null}
        </div>
      ) : null}
      {emailError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {emailError}
        </div>
      ) : null}
      {otCreated ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Orden de trabajo creada desde cotización manual.
        </div>
      ) : null}
      {otExists ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Esa cotización ya tiene una orden de trabajo asociada.
        </div>
      ) : null}
      {otSchemaMissing ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo acceder a WorkOrder. Verifica bootstrap SQL y permisos de escritura para OT.
        </div>
      ) : null}
      {otPermissionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No hay permisos de escritura para WorkOrder. Revisa la service role key o políticas RLS.
        </div>
      ) : null}
      {otError || otInvalidQuote || otNotFound ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo generar la orden de trabajo. Debe ser una cotización manual pendiente o enviada.
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Pipeline comercial</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Cotizaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            {manualQuotes.length} registros · {requestQuotes.length} solicitudes web · {standardQuotes.length} cotizaciones manuales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ordenes-trabajo"
            className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-100"
          >
            <ClipboardCheck className="h-4 w-4" />
            Ver OT
          </Link>
          <Link
            href="/admin/cotizaciones/nueva"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nueva cotización
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg} shadow-lg ${s.shadow}`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-400">{s.label}</p>
              <p className="mt-1 text-[11px] text-slate-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pendientes", count: pending, color: "border-amber-300 bg-amber-50", text: "text-amber-700" },
          { label: "Enviadas", count: sent, color: "border-blue-300 bg-blue-50", text: "text-blue-700" },
          { label: "Ganadas", count: won, color: "border-emerald-300 bg-emerald-50", text: "text-emerald-700" },
          { label: "Pérdidas", count: lost, color: "border-rose-300 bg-rose-50", text: "text-rose-700" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-col items-center rounded-xl border-2 ${s.color} px-4 py-3 text-center`}
          >
            <p className={`text-2xl font-extrabold ${s.text}`}>{s.count}</p>
            <p className={`text-[11px] font-semibold ${s.text}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "ALL", label: "Todas", count: manualQuotes.length },
            { key: "PENDING", label: "Pendiente", count: pending },
            { key: "SENT", label: "Enviada", count: sent },
            { key: "WON", label: "Ganada", count: won },
            { key: "LOST", label: "Pérdida", count: lost },
          ].map((filter) => {
            const isActive = activeFilter === filter.key;
            const href = buildReturnUrl({
              status: filter.key as QuoteStatusFilter,
              query: searchText,
              projectType: projectTypeFilter,
              urgency: urgencyFilter,
            });
            return (
              <Link
                key={filter.key}
                href={href}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
                  {filter.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" method="get">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input type="hidden" name="status" value={activeFilter === "ALL" ? "" : activeFilter} />
          <input
            name="query"
            defaultValue={searchText}
            placeholder="Buscar por nombre, empresa, email, WhatsApp o código"
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <select
            name="project_type"
            defaultValue={projectTypeFilter}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todos los tipos</option>
            <option value="web-basica">Web básica</option>
            <option value="web-profesional">Web profesional</option>
            <option value="tienda-online">Tienda online</option>
            <option value="sistema-web">Sistema web</option>
            <option value="automatizacion">Automatización</option>
            <option value="soporte-ti">Soporte TI</option>
            <option value="no-seguro">No estoy seguro</option>
          </select>
          <select
            name="urgency"
            defaultValue={urgencyFilter}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todas las urgencias</option>
            <option value="bajo">Bajo</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Listado de cotizaciones</h2>
            <p className="text-xs text-slate-400">
              Ordenadas por fecha · más recientes primero · filtro:{" "}
              <span className="font-semibold text-slate-600">
                {activeFilter === "ALL" ? "todas" : statusConfig[activeFilter].label.toLowerCase()}
              </span>
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
            {quotes.length} registros
          </span>
        </div>

        {quotes.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-200" />
            <p className="mt-3 text-base font-semibold text-slate-500">Sin cotizaciones</p>
            <p className="mt-1 text-sm text-slate-400">
              {activeFilter === "ALL"
                ? "Aún no hay registros para mostrar con esos filtros."
                : "No hay cotizaciones para el estado seleccionado."}
            </p>
            <Link
              href="/admin/cotizaciones/nueva"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Nueva cotización
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {quotes.map((q) => {
                const meta = q.meta;
                const isRequest = isQuoteRequestMeta(meta);
                const displayStage = isRequest ? requestStageLabel(meta.requestStage) : statusConfig[normalizeQuoteStatus(q.status)].label;

                return (
                  <div key={q.id} className="space-y-4 px-5 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">
                          {isRequest ? meta.contactCompany || meta.businessName || q.company || q.name : q.company || q.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{meta.quoteCode || q.displayNumber} · {isRequest ? meta.contactEmail || q.email : q.email}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {displayStage}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Solicitud</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{isRequest ? meta.projectTypeLabel || "Solicitud web" : "Cotización manual"}</p>
                        <p className="mt-1 text-sm text-slate-500">{isRequest ? meta.budgetRangeLabel || "Sin presupuesto" : currency(q.totalAmount || 0)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Integraciones</p>
                        <p className="mt-1 text-sm text-slate-700">
                          Correo: {isRequest ? INTEGRATION_STATUS_LABELS[(meta.emailStatus as "pending" | "sent" | "failed") || "pending"] : "N/A"}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          WhatsApp: {isRequest ? INTEGRATION_STATUS_LABELS[(meta.whatsappStatus as "pending" | "sent" | "failed") || "pending"] : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isRequest ? (
                        <>
                          <a
                            href={whatsappPublicLink(meta.contactWhatsappE164 || meta.contactWhatsapp || q.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700"
                          >
                            <Phone className="h-4 w-4" />
                            WhatsApp
                          </a>
                          <QuoteRequestIntegrationButton channel="email" quoteId={q.id} />
                          <QuoteRequestIntegrationButton channel="whatsapp" quoteId={q.id} />
                        </>
                      ) : (
                        <>
                          <QuoteSendEmailButton quoteId={q.id} hasEmail={Boolean(q.email)} />
                          <Link
                            href={`/admin/cotizaciones/${q.id}/editar`}
                            className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700"
                          >
                            Editar
                          </Link>
                        </>
                      )}
                      <Link
                        href={`/admin/cotizaciones/${q.id}`}
                        className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700"
                      >
                        Ver detalle
                      </Link>
                      <QuoteDeleteButton quoteId={q.id} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <div className="grid grid-cols-[2fr_1.6fr_1.3fr_1.1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Cliente</span>
                <span>Solicitud</span>
                <span>Seguimiento</span>
                <span>Integraciones</span>
                <span>Acciones</span>
              </div>

              <div className="divide-y divide-slate-100">
                {quotes.map((q, idx) => {
                  const statusKey = normalizeQuoteStatus(q.status);
                  const cfg = statusConfig[statusKey];
                  const avatarBg = avatarColors[idx % avatarColors.length];
                  const existingOt = workOrderByQuote.get(q.id);
                  const canGenerateOt = statusKey === "PENDING" || statusKey === "SENT";
                  const meta = q.meta;
                  const isRequest = isQuoteRequestMeta(meta);

                  return (
                    <div
                      key={q.id}
                      className="grid grid-cols-[2fr_1.6fr_1.3fr_1.1fr_auto] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${avatarBg} text-[11px] font-bold text-white`}
                        >
                          {initials(q.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-slate-900">
                            {isRequest ? meta.contactCompany || meta.businessName || q.company || q.name || "Sin nombre" : q.company || q.name || "Sin nombre"}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {meta.quoteCode || q.displayNumber} · {isRequest ? meta.contactEmail || q.email : q.email}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[13px] text-slate-600">
                          {q.createdAt
                            ? new Date(q.createdAt).toLocaleDateString("es-CL", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-slate-800">
                          {isRequest ? meta.projectTypeLabel || "Solicitud web" : "Cotización manual"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {isRequest ? `${meta.budgetRangeLabel || "Sin presupuesto"} · ${meta.urgencyLabel || "Sin urgencia"}` : currency(q.totalAmount || 0)}
                        </p>
                      </div>

                      <div>
                        {isRequest ? (
                          <form action={`/admin/cotizaciones/${q.id}/workflow`} method="post" className="flex items-center gap-1.5">
                            <AutoSubmitSelect
                              name="stage"
                              defaultValue={meta.requestStage || "NUEVA"}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              aria-label={`Etapa de ${meta.quoteCode || q.displayNumber}`}
                            >
                              <option value="NUEVA">Nueva</option>
                              <option value="REVISADA">Revisada</option>
                              <option value="CONTACTADO">Contactado</option>
                              <option value="EN_PROPUESTA">En propuesta</option>
                              <option value="CERRADA">Cerrada</option>
                              <option value="PERDIDA">Perdida</option>
                              <option value="ARCHIVADA">Archivada</option>
                            </AutoSubmitSelect>
                            <input type="hidden" name="redirectTo" value={returnTo} />
                          </form>
                        ) : (
                          <form action={`/admin/cotizaciones/${q.id}/estado`} method="post" className="flex items-center gap-1.5">
                            <AutoSubmitSelect
                              name="status"
                              defaultValue={normalizeQuoteStatus(q.status)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 ${cfg.bg} ${cfg.text} ${cfg.ring} focus:border-blue-400 focus:ring-blue-100`}
                              aria-label={`Estado de ${q.displayNumber}`}
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="SENT">Enviada</option>
                              <option value="WON">Ganada</option>
                              <option value="LOST">Pérdida</option>
                            </AutoSubmitSelect>
                            <input type="hidden" name="redirectTo" value={returnTo} />
                          </form>
                        )}
                      </div>

                      <div>
                        {isRequest ? (
                          <div className="space-y-1 text-[11px] text-slate-500">
                            <p>
                              Correo:{" "}
                              <span className="font-semibold text-slate-700">
                                {INTEGRATION_STATUS_LABELS[(meta.emailStatus as "pending" | "sent" | "failed") || "pending"]}
                              </span>
                            </p>
                            <p>
                              WhatsApp:{" "}
                              <span className="font-semibold text-slate-700">
                                {INTEGRATION_STATUS_LABELS[(meta.whatsappStatus as "pending" | "sent" | "failed") || "pending"]}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-[13px] font-bold text-slate-900">{currency(q.totalAmount || 0)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isRequest ? (
                          <>
                            <a
                              href={whatsappPublicLink(meta.contactWhatsappE164 || meta.contactWhatsapp || q.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                              title="Abrir WhatsApp"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <QuoteRequestIntegrationButton channel="email" quoteId={q.id} compact />
                            <QuoteRequestIntegrationButton channel="whatsapp" quoteId={q.id} compact />
                          </>
                        ) : existingOt ? (
                          <Link
                            href="/admin/ordenes-trabajo"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100"
                            title={`OT ${existingOt.code}`}
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                          </Link>
                        ) : canGenerateOt ? (
                          <form action="/admin/ordenes-trabajo/generar" method="post">
                            <input type="hidden" name="quoteId" value={q.id} />
                            <input type="hidden" name="source" value="MANUAL_QUOTE" />
                            <input type="hidden" name="redirectTo" value={returnTo} />
                            <button
                              type="submit"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100"
                              title="Generar orden de trabajo"
                            >
                              <ClipboardPlus className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        ) : null}
                        {!isRequest ? (
                          <>
                            <a
                              href={q.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                              title="Descargar PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <QuoteSendEmailButton quoteId={q.id} hasEmail={Boolean(q.email)} compact />
                            <Link
                              href={`/admin/cotizaciones/${q.id}/editar`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                              title="Editar cotización"
                            >
                              <FileEdit className="h-3.5 w-3.5" />
                            </Link>
                          </>
                        ) : null}
                        <Link
                          href={`/admin/cotizaciones/${q.id}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                          title="Ver cotización"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                        <QuoteDeleteButton quoteId={q.id} compact />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
              <p className="text-[11px] text-slate-400">
                {quotes.length} cotizaciones · Pipeline:{" "}
                <span className="font-semibold text-slate-600">{currency(filteredPipelineValue)}</span>
                {" "}· Ganadas:{" "}
                <span className="font-semibold text-emerald-600">{currency(filteredWonValue)}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

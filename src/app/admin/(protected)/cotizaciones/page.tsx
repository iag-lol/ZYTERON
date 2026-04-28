import { getAdminSnapshot } from "@/lib/admin-data";
import {
  ArrowUpRight,
  BarChart2,
  Download,
  FileEdit,
  FileText,
  Mail,
  Plus,
  TrendingUp,
  Target,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

type QuoteStatus = "PENDING" | "SENT" | "WON" | "LOST";
type QuoteStatusFilter = "ALL" | QuoteStatus;

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function initials(name?: string) {
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
  SENT:    { label: "Enviada",   dot: "bg-blue-400",  bg: "bg-blue-50",  text: "text-blue-700",  ring: "ring-blue-200"  },
  WON:     { label: "Ganada",    dot: "bg-emerald-400",bg: "bg-emerald-50",text: "text-emerald-700",ring: "ring-emerald-200" },
  LOST:    { label: "Pérdida",   dot: "bg-rose-400",  bg: "bg-rose-50",  text: "text-rose-700",  ring: "ring-rose-200"  },
};

const avatarColors = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
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

type PageProps = {
  searchParams?:
    | {
        status?: string;
        status_error?: string;
        email_sent?: string;
        email_error?: string;
        email_id?: string;
        email_event?: string;
      }
    | Promise<{
        status?: string;
        status_error?: string;
        email_sent?: string;
        email_error?: string;
        email_id?: string;
        email_event?: string;
      }>;
};

export default async function CotizacionesPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const activeFilter = normalizeQuoteStatusFilter(query?.status);
  const statusError = query?.status_error === "1";
  const emailSent = query?.email_sent === "1";
  const emailError = query?.email_error ? decodeURIComponent(query.email_error) : "";
  const emailId = query?.email_id ? String(query.email_id) : "";
  const emailEvent = query?.email_event ? String(query.email_event) : "";
  const data = await getAdminSnapshot();
  const allQuotes = data.quotes
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const quotes = activeFilter === "ALL"
    ? allQuotes
    : allQuotes.filter((q) => normalizeQuoteStatus(q.status) === activeFilter);

  const pipelineValue = allQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const wonValue = allQuotes
    .filter((q) => normalizeQuoteStatus(q.status) === "WON")
    .reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const pending = allQuotes.filter((q) => normalizeQuoteStatus(q.status) === "PENDING").length;
  const sent = allQuotes.filter((q) => normalizeQuoteStatus(q.status) === "SENT").length;
  const won = allQuotes.filter((q) => normalizeQuoteStatus(q.status) === "WON").length;
  const lost = allQuotes.filter((q) => normalizeQuoteStatus(q.status) === "LOST").length;
  const filteredPipelineValue = quotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const filteredWonValue = quotes
    .filter((q) => normalizeQuoteStatus(q.status) === "WON")
    .reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const winRate = data.metrics.conversion.winRate;
  const returnTo = activeFilter === "ALL" ? "/admin/cotizaciones" : `/admin/cotizaciones?status=${activeFilter}`;

  const stats = [
    {
      label: "Pipeline total",
      value: currency(pipelineValue),
      sub: `${allQuotes.length} cotizaciones activas`,
      icon: BarChart2,
      iconBg: "bg-blue-500",
      shadow: "shadow-blue-500/30",
    },
    {
      label: "Ingresos ganados",
      value: currency(wonValue),
      sub: `${won} cotizaciones WON`,
      icon: DollarSign,
      iconBg: "bg-emerald-500",
      shadow: "shadow-emerald-500/30",
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      sub: `${won} ganadas de ${allQuotes.length}`,
      icon: Target,
      iconBg: "bg-violet-500",
      shadow: "shadow-violet-500/30",
    },
    {
      label: "En proceso",
      value: pending + sent,
      sub: `${pending} pendientes · ${sent} enviadas`,
      icon: TrendingUp,
      iconBg: "bg-amber-500",
      shadow: "shadow-amber-500/30",
    },
  ];

  return (
    <div className="space-y-8">
      {statusError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo actualizar el estado de la cotización. Inténtalo nuevamente.
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Pipeline comercial
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Cotizaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            {allQuotes.length} cotizaciones · {currency(pipelineValue)} en pipeline
          </p>
        </div>
        <Link
          href="/admin/cotizaciones/nueva"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva cotización
        </Link>
      </div>

      {/* Stats */}
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

      {/* Status distribution */}
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
            { key: "ALL", label: "Todas", count: allQuotes.length },
            { key: "PENDING", label: "Pendiente", count: pending },
            { key: "SENT", label: "Enviada", count: sent },
            { key: "WON", label: "Ganada", count: won },
            { key: "LOST", label: "Pérdida", count: lost },
          ].map((filter) => {
            const isActive = activeFilter === filter.key;
            const href = filter.key === "ALL"
              ? "/admin/cotizaciones"
              : `/admin/cotizaciones?status=${filter.key}`;
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

      {/* Quotes table */}
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
                ? "Crea la primera cotización para comenzar."
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
            {/* Table header */}
            <div className="grid grid-cols-[2.2fr_1.4fr_1.8fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Cliente</span>
              <span>Fecha</span>
              <span>Estado</span>
              <span>Total</span>
              <span>Acciones</span>
            </div>

            <div className="divide-y divide-slate-100">
              {quotes.map((q, idx) => {
                const statusKey = normalizeQuoteStatus(q.status);
                const cfg = statusConfig[statusKey];
                const avatarBg = avatarColors[idx % avatarColors.length];
                return (
                  <div
                    key={q.id}
                    className="grid grid-cols-[2.2fr_1.4fr_1.8fr_1fr_auto] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    {/* Client */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${avatarBg} text-[11px] font-bold text-white`}
                      >
                        {initials(q.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {q.company || q.name || "Sin nombre"}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {q.displayNumber} · {q.email}
                        </p>
                      </div>
                    </div>

                    {/* Date */}
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
                    </div>

                    {/* Status */}
                    <div>
                      <form action={`/admin/cotizaciones/${q.id}/estado`} method="post" className="flex items-center gap-1.5">
                        <select
                          name="status"
                          defaultValue={normalizeQuoteStatus(q.status)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          aria-label={`Estado de ${q.displayNumber}`}
                        >
                          <option value="PENDING">Pendiente</option>
                          <option value="SENT">Enviada</option>
                          <option value="WON">Ganada</option>
                          <option value="LOST">Pérdida</option>
                        </select>
                        <input type="hidden" name="redirectTo" value={returnTo} />
                        <button
                          type="submit"
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 transition-colors ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          Guardar
                        </button>
                      </form>
                    </div>

                    {/* Total */}
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{currency(q.totalAmount || 0)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={q.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        title="Descargar PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <form action={`/admin/cotizaciones/${q.id}/enviar`} method="post">
                        <input type="hidden" name="redirectTo" value={returnTo} />
                        <button
                          type="submit"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Enviar email con cotización adjunta"
                          disabled={!q.email}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                      </form>
                      <Link
                        href={`/admin/cotizaciones/${q.id}/editar`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        title="Editar cotización"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/admin/cotizaciones/${q.id}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        title="Ver cotización"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
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

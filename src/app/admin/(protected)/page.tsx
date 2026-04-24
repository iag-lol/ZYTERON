import { getAdminSnapshot } from "@/lib/admin-data";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock4,
  FileText,
  TrendingUp,
  Users,
  CalendarClock,
  DollarSign,
  Target,
  BriefcaseBusiness,
  MessagesSquare,
  Landmark,
} from "lucide-react";
import Link from "next/link";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  PENDING: { label: "Pendiente", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700" },
  SENT: { label: "Enviada", dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-700" },
  WON: { label: "Ganada", dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700" },
  LOST: { label: "Perdida", dot: "bg-rose-400", bg: "bg-rose-50", text: "text-rose-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-700" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function shortId(value?: string | null, size = 10) {
  const safe = String(value || "").trim();
  if (!safe) return "—";
  return safe.length > size ? `${safe.slice(0, size)}...` : safe;
}

export default async function AdminDashboard() {
  const data = await getAdminSnapshot();
  const { metrics, charts, quotes, visits, leads } = data;
  const leadBaseCount = metrics.conversion.leadBase;
  const leadBaseEstimated = metrics.conversion.leadBaseEstimated;

  const now = new Date();
  const nextVisit = visits.find((v) => v.date && new Date(v.date) >= now);
  const upcomingVisits = visits.filter((v) => v.date && new Date(v.date) >= now);

  const maxRevenue = Math.max(1, ...charts.revenueByMonth.map((m) => m.value));

  const kpis = [
    {
      label: leadBaseEstimated ? "Base embudo (estimada)" : "Leads totales",
      value: leadBaseCount,
      sub: `${pct(metrics.conversion.quoteRate)} pasan a cotización${leadBaseEstimated ? " (sin leads históricos)" : ""}`,
      icon: Users,
      iconBg: "bg-blue-500",
      iconShadow: "shadow-blue-500/30",
      trend: metrics.conversion.quoteRate > 0 ? "up" : "neutral",
    },
    {
      label: "Cotizaciones",
      value: metrics.totals.quotes,
      sub: currency(metrics.money.pipelineValue) + " en pipeline",
      icon: FileText,
      iconBg: "bg-violet-500",
      iconShadow: "shadow-violet-500/30",
      trend: "neutral",
    },
    {
      label: "Visitas técnicas",
      value: metrics.totals.visits,
      sub: `${upcomingVisits.length} próximas`,
      icon: CalendarClock,
      iconBg: "bg-amber-500",
      iconShadow: "shadow-amber-500/30",
      trend: "neutral",
    },
    {
      label: "Ventas cerradas",
      value: metrics.totals.sales,
      sub: `Win rate ${pct(metrics.conversion.winRate)}`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500",
      iconShadow: "shadow-emerald-500/30",
      trend: metrics.conversion.winRate > 0 ? "up" : "neutral",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Panel de control
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">
            Dashboard operacional
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Métricas en tiempo real · Supabase ·{" "}
            {new Date(metrics.lastUpdated).toLocaleString("es-CL", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/visitas/nueva"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow"
          >
            <Clock4 className="h-4 w-4 text-slate-500" />
            Agendar visita
          </Link>
          <Link
            href="/admin/cotizaciones/nueva"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            Nueva cotización
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.iconBg} shadow-lg ${kpi.iconShadow}`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
              {kpi.trend === "up" && (
                <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  activo
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-slate-900">{kpi.value}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">{kpi.label}</p>
              <p className="mt-1.5 text-[11px] text-slate-500">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Proyectos",
            value: metrics.totals.projects,
            helper: "Operaciones activas y planificadas",
            icon: BriefcaseBusiness,
          },
          {
            label: "Solicitudes",
            value: metrics.totals.requests,
            helper: "Requerimientos del cliente",
            icon: MessagesSquare,
          },
          {
            label: "Documentos SII",
            value: metrics.totals.taxDocuments,
            helper: "Boletas / facturas registradas",
            icon: Landmark,
          },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <item.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{item.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{item.label}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Navegación web</h2>
              <p className="text-xs text-slate-400">Contador de visitas, IPs y rutas visitadas</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
              Hoy: {metrics.web.todayVisits}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Visitas web", value: metrics.web.totalVisits },
              { label: "IPs únicas", value: metrics.web.uniqueIps },
              { label: "Sesiones", value: metrics.web.uniqueSessions },
              { label: "Ingreso / visita", value: currency(metrics.web.revenuePerVisit) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-lg font-extrabold text-slate-900">{item.value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Rutas más visitadas</p>
              </div>
              <div className="divide-y divide-slate-100">
                {metrics.web.topPaths.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-slate-500">Aún sin datos de navegación.</p>
                ) : (
                  metrics.web.topPaths.map((item) => (
                    <div key={item.path} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <p className="truncate font-semibold text-slate-700">{item.path}</p>
                      <p className="shrink-0 text-slate-500">{item.visits} visitas · {item.uniqueIps} IP</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Última navegación por IP</p>
              </div>
              <div className="divide-y divide-slate-100">
                {metrics.web.recentNavigations.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-slate-500">Aún sin registros.</p>
                ) : (
                  metrics.web.recentNavigations.map((nav, idx) => (
                    <div key={`${nav.path}-${nav.createdAt}-${idx}`} className="px-4 py-2.5 text-xs">
                      <p className="truncate font-semibold text-slate-700">{nav.path}</p>
                      <p className="mt-0.5 text-slate-500">
                        IP: {shortId(nav.ip, 18)} · Equipo: {shortId(nav.ipHash, 12)} · Sesión: {shortId(nav.sessionId, 10)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Salud de datos</p>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            <p>Leads reales: <span className="font-bold text-slate-900">{metrics.totals.leads}</span></p>
            <p>Base de embudo usada: <span className="font-bold text-slate-900">{leadBaseCount}</span></p>
            <p>Modo estimado: <span className="font-bold text-slate-900">{leadBaseEstimated ? "Sí" : "No"}</span></p>
          </div>
          {leadBaseEstimated ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              No hay leads históricos legibles, por eso el embudo usa cotizaciones como base temporal.
            </p>
          ) : null}
        </div>
      </div>

      {/* Revenue + Pipeline row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Ingresos por mes</h2>
              <p className="text-xs text-slate-400">Últimos 6 meses · ventas registradas</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">
              <DollarSign className="h-4 w-4 text-blue-500" />
              {currency(metrics.money.revenue)}
            </div>
          </div>
          {/* Bar chart */}
          <div className="flex h-48 items-end gap-2">
            {charts.revenueByMonth.map((item, idx) => {
              const heightPct = Math.max(3, (item.value / maxRevenue) * 100);
              const isLast = idx === charts.revenueByMonth.length - 1;
              return (
                <div key={item.label} className="group relative flex flex-1 flex-col items-center gap-1.5">
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg group-hover:block whitespace-nowrap z-10">
                    {currency(item.value)}
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                  {/* Bar */}
                  <div className="flex w-full flex-col items-stretch justify-end" style={{ height: "100%" }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        isLast
                          ? "bg-gradient-to-t from-blue-700 to-blue-400"
                          : "bg-gradient-to-t from-slate-300 to-slate-200"
                      } ${isLast ? "" : "group-hover:from-blue-500 group-hover:to-blue-300"}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Revenue summary */}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-[11px] text-slate-400">Pipeline total</p>
              <p className="text-sm font-bold text-slate-900">{currency(metrics.money.pipelineValue)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Ingresos</p>
              <p className="text-sm font-bold text-slate-900">{currency(metrics.money.revenue)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Ticket promedio</p>
              <p className="text-sm font-bold text-slate-900">{currency(metrics.money.avgTicket)}</p>
            </div>
          </div>
        </div>

        {/* Pipeline funnel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Embudo de conversión</h2>
            <p className="text-xs text-slate-400">% relativo al total de leads</p>
          </div>
          <div className="space-y-4">
            {[
              {
                label: leadBaseEstimated ? "Base embudo" : "Leads",
                value: leadBaseCount,
                pct: leadBaseCount > 0 ? 100 : 0,
                color: "bg-blue-500",
                text: "text-blue-700",
                bg: "bg-blue-50",
              },
              {
                label: "Cotizaciones",
                value: metrics.totals.quotes,
                pct: metrics.conversion.quoteRate,
                color: "bg-violet-500",
                text: "text-violet-700",
                bg: "bg-violet-50",
              },
              {
                label: "Visitas",
                value: metrics.totals.visits,
                pct: metrics.conversion.visitRate,
                color: "bg-amber-500",
                text: "text-amber-700",
                bg: "bg-amber-50",
              },
              {
                label: "Ventas",
                value: metrics.totals.sales,
                pct: metrics.conversion.winRate,
                color: "bg-emerald-500",
                text: "text-emerald-700",
                bg: "bg-emerald-50",
              },
            ].map((step) => (
              <div key={step.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">{step.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${step.text}`}>{pct(step.pct)}</span>
                    <span className="text-[11px] text-slate-400">{step.value}</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${step.color}`}
                    style={{ width: `${Math.max(2, step.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <p className="text-xs font-semibold text-slate-700">Win Rate total</p>
            </div>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{pct(metrics.conversion.winRate)}</p>
            <p className="text-[11px] text-slate-400">{metrics.totals.sales} ventas / {metrics.totals.quotes} cotizaciones</p>
          </div>
        </div>
      </div>

      {/* Quotes + Visits row */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Recent quotes */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cotizaciones recientes</h2>
              <p className="text-xs text-slate-400">{quotes.length} registros en Supabase</p>
            </div>
            <Link
              href="/admin/cotizaciones"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver todas
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {quotes.length === 0 && (
              <div className="px-6 py-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Sin cotizaciones aún</p>
              </div>
            )}
            {quotes.slice(0, 7).map((q) => (
              <div key={q.id} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-slate-50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                  {initials(q.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-900">
                    {q.name || "Sin nombre"}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{q.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <StatusBadge status={q.status || "PENDING"} />
                  <p className="text-[13px] font-bold text-slate-900">{currency(q.total || 0)}</p>
                  <Link
                    href={`/admin/cotizaciones/${q.id}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming visits */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Próximas visitas</h2>
              <p className="text-xs text-slate-400">{upcomingVisits.length} agendadas</p>
            </div>
            <Link
              href="/admin/visitas"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver todas
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {nextVisit && (
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                  Próxima visita
                </p>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-emerald-900">
                {new Date(nextVisit.date!).toLocaleString("es-CL", {
                  weekday: "long",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {upcomingVisits.length === 0 && (
              <div className="px-6 py-8 text-center">
                <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Sin visitas agendadas</p>
                <Link
                  href="/admin/visitas/nueva"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Agendar visita
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}
            {upcomingVisits.slice(0, 5).map((v) => (
              <div key={v.id} className="px-6 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {v.notes || "Visita técnica"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Cliente: {v.clientId || "Sin asignar"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-slate-600">
                      {v.date
                        ? new Date(v.date).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </p>
                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                      {v.status || "Programada"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 px-6 py-3">
            <Link
              href="/admin/visitas/nueva"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-600"
            >
              + Agendar nueva visita
            </Link>
          </div>
        </div>
      </div>

      {/* Leads snapshot */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Leads recientes</h2>
            <p className="text-xs text-slate-400">{leads.length} leads en Supabase · tabla Lead</p>
          </div>
          <Link
            href="/admin/contactos"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Ver contactos
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {leads.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Sin leads registrados aún</p>
          </div>
        ) : (
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 rounded-b-2xl overflow-hidden">
            {leads.slice(0, 8).map((lead) => (
              <div
                key={lead.id}
                className="bg-white px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {lead.source || "web"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lead.createdAt
                      ? new Date(lead.createdAt).toLocaleDateString("es-CL", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                  </span>
                </div>
                <p className="truncate text-sm font-bold text-slate-900">{lead.name || "Lead"}</p>
                <p className="truncate text-[11px] text-slate-500">{lead.email}</p>
                {lead.phone && (
                  <p className="mt-0.5 text-[11px] text-slate-400">{lead.phone}</p>
                )}
                {lead.status && (
                  <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                    {lead.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

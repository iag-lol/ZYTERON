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
  Activity,
  Globe,
  Wifi,
  BarChart2,
  Zap,
  AlertCircle,
  ChevronRight,
  Package,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { BarChart, FunnelStep } from "@/components/admin/dashboard-chart";

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
  PENDING: { label: "Pendiente", dot: "bg-amber-400", bg: "bg-amber-50",   text: "text-amber-700" },
  SENT:    { label: "Enviada",   dot: "bg-blue-400",  bg: "bg-blue-50",    text: "text-blue-700" },
  WON:     { label: "Ganada",    dot: "bg-emerald-400",bg:"bg-emerald-50", text: "text-emerald-700" },
  LOST:    { label: "Perdida",   dot: "bg-rose-400",  bg: "bg-rose-50",    text: "text-rose-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status, dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600",
  };
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
  return safe.length > size ? `${safe.slice(0, size)}…` : safe;
}

export default async function AdminDashboard() {
  const data = await getAdminSnapshot();
  const { metrics, charts, quotes, visits, leads } = data;
  const leadBaseCount = metrics.conversion.leadBase;
  const leadBaseEstimated = metrics.conversion.leadBaseEstimated;

  const now = new Date();
  const nextVisit = visits.find((v) => v.date && new Date(v.date) >= now);
  const upcomingVisits = visits.filter((v) => v.date && new Date(v.date) >= now);

  const lastUpdated = new Date(metrics.lastUpdated).toLocaleString("es-CL", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  const kpis = [
    {
      label: leadBaseEstimated ? "Base embudo" : "Leads totales",
      value: leadBaseCount,
      sub: `${pct(metrics.conversion.quoteRate)} pasan a cotización`,
      icon: Users,
      iconBg: "bg-blue-500",
      iconShadow: "shadow-blue-500/30",
      accent: "text-blue-600",
      border: "border-slate-200",
      trend: metrics.conversion.quoteRate > 0,
      trendLabel: pct(metrics.conversion.quoteRate),
      href: "/admin/contactos",
    },
    {
      label: "Cotizaciones",
      value: metrics.totals.quotes,
      sub: currency(metrics.money.pipelineValue) + " en pipeline",
      icon: FileText,
      iconBg: "bg-violet-500",
      iconShadow: "shadow-violet-500/30",
      accent: "text-violet-600",
      border: "border-slate-200",
      trend: false,
      trendLabel: "",
      href: "/admin/cotizaciones",
    },
    {
      label: "Visitas técnicas",
      value: metrics.totals.visits,
      sub: `${upcomingVisits.length} próximas agendadas`,
      icon: CalendarClock,
      iconBg: "bg-amber-500",
      iconShadow: "shadow-amber-500/30",
      accent: "text-amber-600",
      border: "border-slate-200",
      trend: upcomingVisits.length > 0,
      trendLabel: `${upcomingVisits.length} próximas`,
      href: "/admin/visitas",
    },
    {
      label: "Ventas cerradas",
      value: metrics.totals.sales,
      sub: `Win rate ${pct(metrics.conversion.winRate)}`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500",
      iconShadow: "shadow-emerald-500/30",
      accent: "text-emerald-600",
      border: "border-slate-200",
      trend: metrics.conversion.winRate > 0,
      trendLabel: pct(metrics.conversion.winRate),
      href: "/admin/ventas",
    },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Panel de control
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">
            Dashboard operacional
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Última actualización:{" "}
            <span className="font-medium text-slate-700">{lastUpdated}</span>
            {leadBaseEstimated && (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                modo estimado
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/visitas/nueva"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow"
          >
            <Clock4 className="h-4 w-4 text-slate-500" />
            Agendar visita
          </Link>
          <Link
            href="/admin/cotizaciones/nueva"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            Nueva cotización
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.iconBg} shadow-lg ${kpi.iconShadow}`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
              {kpi.trend && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <TrendingUp className="h-3 w-3" />
                  {kpi.trendLabel}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-4xl font-extrabold text-slate-900">{kpi.value}</p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-600">{kpi.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{kpi.sub}</p>
            </div>
            <ChevronRight className={`mt-3 h-4 w-4 ${kpi.accent} opacity-0 transition-opacity group-hover:opacity-100`} />
          </Link>
        ))}
      </div>

      {/* Secondary KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/admin/proyectos",  label: "Proyectos",      value: metrics.totals.projects,   helper: "Operaciones activas",      icon: BriefcaseBusiness, iconBg: "bg-orange-100", iconColor: "text-orange-600" },
          { href: "/admin/solicitudes",label: "Solicitudes",    value: metrics.totals.requests,   helper: "Requerimientos de cliente", icon: MessagesSquare,    iconBg: "bg-pink-100",   iconColor: "text-pink-600" },
          { href: "/admin/sii",        label: "Documentos SII", value: metrics.totals.taxDocuments,helper: "Boletas / Facturas",       icon: Landmark,          iconBg: "bg-yellow-100", iconColor: "text-yellow-700" },
          { href: "/admin/ventas",     label: "Ingresos",       value: currency(metrics.money.revenue), helper: `Ticket prom. ${currency(metrics.money.avgTicket)}`, icon: DollarSign, iconBg: "bg-emerald-100", iconColor: "text-emerald-700", isAmount: true },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate font-extrabold text-slate-900 ${item.isAmount ? "text-[15px]" : "text-[18px]"}`}>
                {item.value}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {item.label}
              </p>
              <p className="text-[11px] text-slate-400">{item.helper}</p>
            </div>
            <ArrowUpRight className={`h-4 w-4 shrink-0 ${item.iconColor} opacity-0 transition-opacity group-hover:opacity-100`} />
          </Link>
        ))}
      </div>

      {/* Revenue chart + Funnel */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Ingresos por mes</h2>
              <p className="mt-0.5 text-[12px] text-slate-400">Últimos 6 meses · ventas registradas</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">
              <DollarSign className="h-4 w-4 text-blue-500" />
              {currency(metrics.money.revenue)}
            </div>
          </div>
          <BarChart
            data={charts.revenueByMonth}
            height={160}
            formatType="currency"
            accentClass="from-blue-600 to-blue-400"
            dimClass="from-slate-200 to-slate-100"
            highlightLast={true}
          />
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
            {[
              { label: "Pipeline", value: currency(metrics.money.pipelineValue) },
              { label: "Ingresos", value: currency(metrics.money.revenue) },
              { label: "Ticket promedio", value: currency(metrics.money.avgTicket) },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[11px] text-slate-400">{item.label}</p>
                <p className="mt-0.5 text-[13px] font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Embudo de conversión</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">Tasa por etapa del pipeline</p>
          </div>
          <div className="space-y-4">
            <FunnelStep label={leadBaseEstimated ? "Base embudo" : "Leads"} value={leadBaseCount} pct={leadBaseCount > 0 ? 100 : 0} color="bg-blue-500" bgColor="bg-blue-50" textColor="text-blue-700" />
            <FunnelStep label="Cotizaciones" value={metrics.totals.quotes} pct={metrics.conversion.quoteRate} color="bg-violet-500" bgColor="bg-violet-50" textColor="text-violet-700" subLabel={`${pct(metrics.conversion.quoteRate)} conversión`} />
            <FunnelStep label="Visitas técnicas" value={metrics.totals.visits} pct={metrics.conversion.visitRate} color="bg-amber-500" bgColor="bg-amber-50" textColor="text-amber-700" subLabel={`${pct(metrics.conversion.visitRate)} de cotizaciones`} />
            <FunnelStep label="Ventas cerradas" value={metrics.totals.sales} pct={metrics.conversion.winRate} color="bg-emerald-500" bgColor="bg-emerald-50" textColor="text-emerald-700" subLabel={`Win rate ${pct(metrics.conversion.winRate)}`} />
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <p className="text-[12px] font-semibold text-slate-600">Win Rate global</p>
            </div>
            <p className="mt-1.5 text-3xl font-extrabold text-slate-900">{pct(metrics.conversion.winRate)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{metrics.totals.sales} ventas / {metrics.totals.quotes} cotizaciones</p>
          </div>
        </div>
      </div>

      {/* Web analytics + Data health */}
      <div className="grid gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Analítica web</h2>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-400">
                {metrics.web.estimated ? "Modo estimado — sin tracker activo" : "Visitas, IPs y rutas rastreadas"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700 ring-1 ring-blue-200">
              <Wifi className="h-3.5 w-3.5" />
              Hoy: {metrics.web.todayVisits}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Visitas web", value: metrics.web.totalVisits, icon: Globe },
              { label: "IPs únicas", value: metrics.web.uniqueIps, icon: Wifi },
              { label: "Sesiones", value: metrics.web.uniqueSessions, icon: Activity },
              { label: "Ingreso / visita", value: currency(metrics.web.revenuePerVisit), icon: DollarSign },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{stat.label}</p>
                <p className="mt-1.5 text-[18px] font-extrabold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Rutas más visitadas</p>
              </div>
              <div className="divide-y divide-slate-100">
                {metrics.web.topPaths.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 px-4 py-6 text-center">
                    <BarChart2 className="h-7 w-7 text-slate-300" />
                    <p className="text-[12px] text-slate-400">Sin datos aún</p>
                  </div>
                ) : metrics.web.topPaths.map((item) => (
                  <div key={item.path} className="flex items-center justify-between px-4 py-2.5 text-[12px]">
                    <p className="truncate font-semibold text-slate-700">{item.path}</p>
                    <p className="shrink-0 text-slate-400">{item.visits} vis · {item.uniqueIps} IP</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Navegación reciente</p>
              </div>
              <div className="divide-y divide-slate-100">
                {metrics.web.recentNavigations.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 px-4 py-6 text-center">
                    <Wifi className="h-7 w-7 text-slate-300" />
                    <p className="text-[12px] text-slate-400">Sin registros</p>
                  </div>
                ) : metrics.web.recentNavigations.map((nav, idx) => (
                  <div key={idx} className="px-4 py-2.5 text-[12px]">
                    <p className="truncate font-semibold text-slate-700">{nav.path}</p>
                    <p className="mt-0.5 text-slate-400">IP: {shortId(nav.ip, 18)} · Sesión: {shortId(nav.sessionId, 10)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h2 className="text-[13px] font-bold text-slate-900">Salud de datos</h2>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <p>Leads reales: <span className="font-bold text-slate-900">{metrics.totals.leads}</span></p>
            <p>Base de embudo: <span className="font-bold text-slate-900">{leadBaseCount}</span></p>
            <p>Modo estimado: <span className="font-bold text-slate-900">{leadBaseEstimated ? "Sí" : "No"}</span></p>
          </div>
          {leadBaseEstimated && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-[11px] text-amber-700">Sin leads históricos — el embudo usa cotizaciones como base temporal.</p>
              </div>
            </div>
          )}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <Link href="/admin/reportes" className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[12px] font-semibold text-blue-700 transition-all hover:bg-blue-100">
              <BarChart2 className="h-3.5 w-3.5" />
              Ver reportes completos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quotes + Visits */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cotizaciones recientes</h2>
              <p className="mt-0.5 text-[12px] text-slate-400">{quotes.length} registros · Supabase</p>
            </div>
            <Link href="/admin/cotizaciones" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
              Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {quotes.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <FileText className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">Sin cotizaciones aún</p>
              </div>
            )}
            {quotes.slice(0, 7).map((q) => (
              <div key={q.id} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-slate-50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                  {initials(q.name || "Sin nombre")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{q.name || "Sin nombre"}</p>
                  <p className="truncate text-[11px] text-slate-400">{q.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <StatusBadge status={q.status || "PENDING"} />
                  <p className="text-[13px] font-bold text-slate-900">{currency(q.total || 0)}</p>
                  <Link href={`/admin/cotizaciones/${q.id}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-6 py-3">
            <Link href="/admin/cotizaciones/nueva" className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-[12px] font-semibold text-slate-400 transition-all hover:border-blue-300 hover:text-blue-600">
              + Nueva cotización
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Próximas visitas</h2>
              <p className="mt-0.5 text-[12px] text-slate-400">{upcomingVisits.length} agendadas</p>
            </div>
            <Link href="/admin/visitas" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
              Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {nextVisit && (
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Próxima visita</p>
              </div>
              <p className="mt-0.5 capitalize text-sm font-semibold text-emerald-900">
                {new Date(nextVisit.date!).toLocaleString("es-CL", { weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {upcomingVisits.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <CalendarClock className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">Sin visitas agendadas</p>
              </div>
            )}
            {upcomingVisits.slice(0, 5).map((v) => (
              <div key={v.id} className="px-6 py-3 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{v.notes || "Visita técnica"}</p>
                    <p className="text-[11px] text-slate-400">Cliente: {v.clientId || "Sin asignar"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-semibold text-slate-600">
                      {v.date ? new Date(v.date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "—"}
                    </p>
                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {v.status || "Programada"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-6 py-3">
            <Link href="/admin/visitas/nueva" className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-[12px] font-semibold text-slate-400 transition-all hover:border-amber-300 hover:text-amber-600">
              + Agendar nueva visita
            </Link>
          </div>
        </div>
      </div>

      {/* Leads snapshot */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Leads recientes</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">{leads.length} leads · tabla Lead en Supabase</p>
          </div>
          <Link href="/admin/contactos" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
            Ver contactos <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">Sin leads registrados aún</p>
          </div>
        ) : (
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 rounded-b-2xl overflow-hidden">
            {leads.slice(0, 8).map((lead) => (
              <div key={lead.id} className="bg-white px-5 py-4 transition-colors hover:bg-slate-50">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {lead.source || "web"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "—"}
                  </span>
                </div>
                <p className="truncate text-sm font-bold text-slate-900">{lead.name || "Lead"}</p>
                <p className="truncate text-[11px] text-slate-500">{lead.email}</p>
                {lead.phone && <p className="mt-0.5 text-[11px] text-slate-400">{lead.phone}</p>}
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

      {/* Footer quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/productos",      label: "Catálogo de productos", icon: Package,      bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
          { href: "/admin/gastos",         label: "Gestión de gastos",     icon: DollarSign,   bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
          { href: "/admin/portal-clientes",label: "Portal de clientes",    icon: ShieldCheck,  bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
          { href: "/admin/control-web",    label: "Control web",           icon: Zap,          bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl border ${item.border} ${item.bg} px-4 py-3.5 transition-all hover:brightness-95`}
          >
            <item.icon className={`h-4 w-4 ${item.text}`} />
            <span className={`text-[13px] font-semibold ${item.text}`}>{item.label}</span>
            <ChevronRight className={`ml-auto h-4 w-4 ${item.text} opacity-50 transition-opacity group-hover:opacity-100`} />
          </Link>
        ))}
      </div>
    </div>
  );
}

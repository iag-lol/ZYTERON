import { getAdminSnapshot } from "@/lib/admin-data";
import {
  BarChart3,
  Target,
  DollarSign,
  Users,
  FileText,
  CalendarClock,
  ShoppingCart,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { AreaChart, BarChart, FunnelStep } from "@/components/admin/dashboard-chart";

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

export default async function ReportesPage() {
  const data = await getAdminSnapshot();
  const { metrics, charts } = data;
  const leadBaseCount = metrics.conversion.leadBase;
  const leadBaseEstimated = metrics.conversion.leadBaseEstimated;

  const maxRevenue = Math.max(1, ...charts.revenueByMonth.map((m) => m.value));
  const totalRevenue = charts.revenueByMonth.reduce((acc, m) => acc + m.value, 0);

  const thisMonth = charts.revenueByMonth.at(-1)?.value ?? 0;
  const prevMonth = charts.revenueByMonth.at(-2)?.value ?? 0;
  const monthGrowth = prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : 0;

  const lastUpdated = new Date(metrics.lastUpdated).toLocaleString("es-CL", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  const conversionKpis = [
    { label: "Leads → Cotizaciones", value: pct(metrics.conversion.quoteRate), sub: `${metrics.totals.quotes} de ${leadBaseCount}`, good: metrics.conversion.quoteRate >= 30, threshold: "≥ 30%" },
    { label: "Cotizaciones → Visitas", value: pct(metrics.conversion.visitRate), sub: `${metrics.totals.visits} de ${metrics.totals.quotes} cotizaciones`, good: metrics.conversion.visitRate >= 40, threshold: "≥ 40%" },
    { label: "Win Rate global", value: pct(metrics.conversion.winRate), sub: `${metrics.totals.sales} ventas / ${metrics.totals.quotes} cotizaciones`, good: metrics.conversion.winRate >= 20, threshold: "≥ 20%" },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Análisis & Métricas
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Reportes y análisis</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Actualizado <span className="font-medium text-slate-700">{lastUpdated}</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-[11px] text-slate-400">Este mes</p>
          <p className="text-lg font-extrabold text-slate-900">{currency(thisMonth)}</p>
          <div className="mt-1 flex items-center justify-end gap-1">
            {monthGrowth > 0 ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +{monthGrowth.toFixed(1)}% vs anterior
              </span>
            ) : monthGrowth < 0 ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                <ArrowDownRight className="h-3.5 w-3.5" />
                {monthGrowth.toFixed(1)}% vs anterior
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Minus className="h-3.5 w-3.5" />
                0% vs anterior
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Leads captados", value: metrics.totals.leads, icon: Users, iconBg: "bg-blue-500", accent: "text-blue-600", sub: "Fuentes de contacto" },
          { label: "Cotizaciones emitidas", value: metrics.totals.quotes, icon: FileText, iconBg: "bg-violet-500", accent: "text-violet-600", sub: currency(metrics.money.pipelineValue) + " pipeline" },
          { label: "Visitas realizadas", value: metrics.totals.visits, icon: CalendarClock, iconBg: "bg-amber-500", accent: "text-amber-600", sub: "Técnicas y comerciales" },
          { label: "Ventas cerradas", value: metrics.totals.sales, icon: ShoppingCart, iconBg: "bg-emerald-500", accent: "text-emerald-600", sub: `Win rate ${pct(metrics.conversion.winRate)}` },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.iconBg} shadow-sm`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
              <Activity className={`h-4 w-4 ${kpi.accent} opacity-30`} />
            </div>
            <div className="mt-4">
              <p className="text-4xl font-extrabold text-slate-900">{kpi.value}</p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-600">{kpi.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Financial summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pipeline (cotizaciones abiertas)", value: currency(metrics.money.pipelineValue), sub: `${metrics.totals.quotes} cotizaciones activas`, iconBg: "bg-blue-600", icon: BarChart3, bg: "bg-blue-600" },
          { label: "Ingresos confirmados", value: currency(metrics.money.revenue), sub: `${metrics.totals.sales} ventas cerradas`, iconBg: "bg-emerald-600", icon: DollarSign, bg: "bg-emerald-600" },
          { label: "Ticket promedio", value: currency(metrics.money.avgTicket), sub: "Por venta registrada", iconBg: "bg-violet-600", icon: Target, bg: "bg-violet-600" },
        ].map((card) => (
          <div key={card.label} className={`overflow-hidden rounded-2xl ${card.bg} p-6 text-white shadow-md`}>
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-5">
              <p className="text-2xl font-extrabold">{card.value}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-white/70">{card.label}</p>
              <p className="mt-1 text-[11px] text-white/40">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Area chart + Funnel */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue mensual</h2>
              <p className="mt-0.5 text-[12px] text-slate-400">Ingresos últimos 6 meses</p>
            </div>
            <p className="text-lg font-extrabold text-slate-900">{currency(totalRevenue)}</p>
          </div>
          <AreaChart data={charts.revenueByMonth} height={180} formatType="currency" strokeColor="#2563eb" fillId="revenue-area-light" />
          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              {monthGrowth > 0 ? (
                <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-bold text-emerald-700">
                  <ArrowUpRight className="h-3.5 w-3.5" />+{monthGrowth.toFixed(1)}%
                </div>
              ) : monthGrowth < 0 ? (
                <div className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[12px] font-bold text-rose-700">
                  <ArrowDownRight className="h-3.5 w-3.5" />{monthGrowth.toFixed(1)}%
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-bold text-slate-500">
                  <Minus className="h-3.5 w-3.5" />0%
                </div>
              )}
              <span className="text-[11px] text-slate-400">vs. mes anterior</span>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] text-slate-400">Este mes</p>
              <p className="text-[13px] font-extrabold text-slate-900">{currency(thisMonth)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Embudo de ventas</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">Tasa de conversión por etapa</p>
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

      {/* Monthly table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Detalle mensual de ingresos</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">Últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
            <TrendingUp className="h-3.5 w-3.5" />
            {currency(totalRevenue)} total
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {[...charts.revenueByMonth].reverse().map((m) => {
            const isMax = m.value === maxRevenue && m.value > 0;
            const sharePct = totalRevenue > 0 ? (m.value / totalRevenue) * 100 : 0;
            return (
              <div key={m.label} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-4 hover:bg-slate-50">
                <span className="w-10 text-[11px] font-bold uppercase tracking-widest text-slate-400">{m.label}</span>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${isMax ? "bg-blue-500" : "bg-slate-300"}`} style={{ width: `${Math.max(1, sharePct)}%` }} />
                    </div>
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] text-slate-400">{sharePct.toFixed(0)}%</span>
                </div>
                <p className={`text-[14px] font-extrabold ${m.value > 0 ? "text-slate-900" : "text-slate-300"}`}>{currency(m.value)}</p>
                {isMax ? (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 ring-1 ring-blue-200">máx.</span>
                ) : <span className="w-12" />}
              </div>
            );
          })}
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-slate-400">Total 6 meses</p>
            <p className="text-[15px] font-extrabold text-slate-900">{currency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Conversion KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {conversionKpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-extrabold text-slate-900">{kpi.value}</p>
              {kpi.good ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />bueno
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">mejorar</span>
              )}
            </div>
            <p className="mt-2 text-[12px] font-bold text-slate-600">{kpi.label}</p>
            <p className="mt-1 text-[11px] text-slate-400">{kpi.sub}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Objetivo:</span>
              <span className="text-[10px] font-semibold text-slate-500">{kpi.threshold}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${kpi.good ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${Math.min(100, parseFloat(kpi.value))}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart comparison */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900">Comparativa mensual de ingresos</h2>
          <p className="mt-0.5 text-[12px] text-slate-400">Últimos 6 meses</p>
        </div>
        <BarChart
          data={charts.revenueByMonth}
          height={200}
          formatType="currency"
          accentClass="from-blue-600 to-blue-400"
          dimClass="from-slate-200 to-slate-100"
          highlightLast={true}
        />
      </div>

      {/* Supabase checklist */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-slate-900">Estado de conexión Supabase</h2>
            <p className="text-[11px] text-slate-400">Requisitos del panel admin verificados</p>
          </div>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Variables de entorno", desc: "SUPABASE_URL y SERVICE_ROLE_KEY definidas", ok: true },
            { title: "Tabla Lead", desc: "RLS con acceso service_role para leads", ok: true },
            { title: "Tabla Quote", desc: "INSERT y SELECT habilitados", ok: true },
            { title: "Tabla Visit", desc: "Agenda con INSERT y SELECT", ok: true },
            { title: "Tabla Sale", desc: "Registro de ventas habilitado", ok: true },
            { title: "Tabla User", desc: "Directorio de clientes con SELECT", ok: true },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-white transition-colors">
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-800">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

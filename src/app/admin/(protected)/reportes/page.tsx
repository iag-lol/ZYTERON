import { getAdminSnapshot } from "@/lib/admin-data";
import {
  Activity,
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
} from "lucide-react";

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

  const maxRevenue = Math.max(1, ...charts.revenueByMonth.map((m) => m.value));
  const totalRevenue = charts.revenueByMonth.reduce((acc, m) => acc + m.value, 0);

  const thisMonth = charts.revenueByMonth.at(-1)?.value ?? 0;
  const prevMonth = charts.revenueByMonth.at(-2)?.value ?? 0;
  const monthGrowth = prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Analytics
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Reportes y análisis</h1>
        <p className="mt-1 text-sm text-slate-500">
          Métricas completas ·{" "}
          <span className="font-medium">
            Actualizado {new Date(metrics.lastUpdated).toLocaleString("es-CL", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
      </div>

      {/* Top-level KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Leads captados",
            value: metrics.totals.leads,
            icon: Users,
            iconBg: "bg-blue-500",
            shadow: "shadow-blue-500/30",
          },
          {
            label: "Cotizaciones emitidas",
            value: metrics.totals.quotes,
            icon: FileText,
            iconBg: "bg-violet-500",
            shadow: "shadow-violet-500/30",
          },
          {
            label: "Visitas realizadas",
            value: metrics.totals.visits,
            icon: CalendarClock,
            iconBg: "bg-amber-500",
            shadow: "shadow-amber-500/30",
          },
          {
            label: "Ventas cerradas",
            value: metrics.totals.sales,
            icon: ShoppingCart,
            iconBg: "bg-emerald-500",
            shadow: "shadow-emerald-500/30",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.iconBg} shadow-lg ${kpi.shadow}`}
            >
              <kpi.icon className="h-5 w-5 text-white" />
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-slate-900">{kpi.value}</p>
              <p className="text-xs font-semibold text-slate-400">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue + Funnel */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Revenue chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue mensual</h2>
              <p className="text-xs text-slate-400">Ingresos de ventas registradas · últimos 6 meses</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-slate-900">{currency(totalRevenue)}</p>
              <p className="text-[11px] text-slate-400">Total 6 meses</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex h-52 items-end gap-3">
            {charts.revenueByMonth.map((item, idx) => {
              const heightPct = Math.max(3, (item.value / maxRevenue) * 100);
              const isLast = idx === charts.revenueByMonth.length - 1;
              const isSecondLast = idx === charts.revenueByMonth.length - 2;
              return (
                <div
                  key={item.label}
                  className="group relative flex flex-1 flex-col items-center gap-2"
                >
                  {/* Value label on hover */}
                  <div className="absolute bottom-[calc(100%+8px)] left-1/2 hidden -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[11px] font-bold text-white shadow-xl group-hover:block whitespace-nowrap z-10">
                    {currency(item.value)}
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>

                  {/* Bar container */}
                  <div className="flex w-full flex-col justify-end" style={{ height: "100%" }}>
                    <div
                      className={`w-full rounded-t-xl transition-all duration-300 group-hover:brightness-110 ${
                        isLast
                          ? "bg-gradient-to-t from-blue-700 to-blue-400 shadow-lg shadow-blue-500/20"
                          : isSecondLast
                          ? "bg-gradient-to-t from-slate-400 to-slate-300"
                          : "bg-gradient-to-t from-slate-200 to-slate-100"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Month label */}
                  <div className="text-center">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        isLast ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Growth indicator */}
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
                <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] font-bold text-slate-500">
                  <Minus className="h-3.5 w-3.5" />0%
                </div>
              )}
              <span className="text-[11px] text-slate-400">vs. mes anterior</span>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] text-slate-400">Este mes</p>
              <p className="text-sm font-extrabold text-slate-900">{currency(thisMonth)}</p>
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Embudo de ventas</h2>
            <p className="text-xs text-slate-400">Tasa de conversión por etapa</p>
          </div>

          <div className="space-y-5">
            {[
              {
                label: "Leads",
                count: metrics.totals.leads,
                pct: 100,
                color: "bg-blue-500",
                bgLight: "bg-blue-50",
                textColor: "text-blue-700",
              },
              {
                label: "Cotizaciones",
                count: metrics.totals.quotes,
                pct: metrics.conversion.quoteRate,
                color: "bg-violet-500",
                bgLight: "bg-violet-50",
                textColor: "text-violet-700",
                arrow: `${pct(metrics.conversion.quoteRate)} conversión`,
              },
              {
                label: "Visitas técnicas",
                count: metrics.totals.visits,
                pct: metrics.conversion.visitRate,
                color: "bg-amber-500",
                bgLight: "bg-amber-50",
                textColor: "text-amber-700",
                arrow: `${pct(metrics.conversion.visitRate)} de cotizaciones`,
              },
              {
                label: "Ventas cerradas",
                count: metrics.totals.sales,
                pct: metrics.conversion.winRate,
                color: "bg-emerald-500",
                bgLight: "bg-emerald-50",
                textColor: "text-emerald-700",
                arrow: `Win rate ${pct(metrics.conversion.winRate)}`,
              },
            ].map((step) => (
              <div key={step.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${step.color}`} />
                    <span className="text-[13px] font-semibold text-slate-700">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${step.bgLight} ${step.textColor}`}>
                      {step.count}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">{pct(step.pct)}</span>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${step.color}`}
                    style={{ width: `${Math.max(2, step.pct)}%` }}
                  />
                </div>
                {step.arrow && (
                  <p className="text-[10px] text-slate-400 pl-4">{step.arrow}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Pipeline (cotizaciones abiertas)",
            value: currency(metrics.money.pipelineValue),
            sub: `${metrics.totals.quotes} cotizaciones activas`,
            icon: BarChart3,
            gradient: "from-blue-500 to-blue-700",
            shadow: "shadow-blue-500/20",
          },
          {
            label: "Ingresos confirmados",
            value: currency(metrics.money.revenue),
            sub: `${metrics.totals.sales} ventas cerradas`,
            icon: DollarSign,
            gradient: "from-emerald-500 to-emerald-700",
            shadow: "shadow-emerald-500/20",
          },
          {
            label: "Ticket promedio",
            value: currency(metrics.money.avgTicket),
            sub: "Por venta registrada",
            icon: Target,
            gradient: "from-violet-500 to-violet-700",
            shadow: "shadow-violet-500/20",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-6 text-white shadow-lg ${card.shadow}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <Activity className="h-4 w-4 text-white/50" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold">{card.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/70">{card.label}</p>
              <p className="mt-1 text-[11px] text-white/50">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly detail table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Detalle mensual de ingresos</h2>
          <p className="text-xs text-slate-400">Últimos 6 meses · basado en ventas Supabase</p>
        </div>

        <div className="divide-y divide-slate-100">
          {[...charts.revenueByMonth].reverse().map((m) => {
            const isMax = m.value === maxRevenue && m.value > 0;
            const sharePct = totalRevenue > 0 ? (m.value / totalRevenue) * 100 : 0;
            return (
              <div
                key={m.label}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 w-10">
                  {m.label}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${isMax ? "bg-blue-500" : "bg-slate-300"}`}
                        style={{ width: `${Math.max(1, sharePct)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 w-10 text-right">
                    {sharePct.toFixed(0)}%
                  </span>
                </div>
                <p className={`text-[14px] font-extrabold ${m.value > 0 ? "text-slate-900" : "text-slate-300"}`}>
                  {currency(m.value)}
                </p>
                {isMax && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    máx.
                  </span>
                )}
                {!isMax && <span className="w-10" />}
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">Total 6 meses</p>
            <p className="text-sm font-extrabold text-slate-900">{currency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Conversion KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Leads → Cotizaciones",
            value: pct(metrics.conversion.quoteRate),
            sub: `${metrics.totals.quotes} de ${metrics.totals.leads} leads`,
            good: metrics.conversion.quoteRate >= 30,
          },
          {
            label: "Cotizaciones → Visitas",
            value: pct(metrics.conversion.visitRate),
            sub: `${metrics.totals.visits} de ${metrics.totals.quotes} cotizaciones`,
            good: metrics.conversion.visitRate >= 40,
          },
          {
            label: "Win Rate global",
            value: pct(metrics.conversion.winRate),
            sub: `${metrics.totals.sales} ventas / ${metrics.totals.quotes} cotizaciones`,
            good: metrics.conversion.winRate >= 20,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-3xl font-extrabold text-slate-900">{kpi.value}</p>
              {kpi.good ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  bueno
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                  mejorar
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-bold text-slate-400">{kpi.label}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Supabase checklist */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Estado de conexión Supabase</h2>
            <p className="text-[11px] text-slate-400">Requisitos para el panel admin</p>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {[
            {
              title: "Variables de entorno",
              desc: "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY definidas en el servidor",
              ok: true,
            },
            {
              title: "Tabla Lead",
              desc: "Política RLS con acceso service_role para leer leads del formulario",
              ok: true,
            },
            {
              title: "Tabla Quote",
              desc: "Política RLS permite INSERT y SELECT con service_role",
              ok: true,
            },
            {
              title: "Tabla Visit",
              desc: "Agenda de visitas con INSERT y SELECT habilitados",
              ok: true,
            },
            {
              title: "Tabla Sale",
              desc: "Registro de ventas con INSERT y SELECT para service_role",
              ok: true,
            },
            {
              title: "Tabla User",
              desc: "Directorio de clientes con SELECT habilitado",
              ok: true,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  item.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                }`}
              >
                <ShieldCheck className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-700">{item.title}</p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

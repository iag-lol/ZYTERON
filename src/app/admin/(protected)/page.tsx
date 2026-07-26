import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  FileText,
  MessageCircle,
  MessagesSquare,
  Receipt,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Globe,
} from "lucide-react";
import { getAdminSnapshot } from "@/lib/admin-data";
import { AreaChart, BarChart } from "@/components/admin/dashboard-chart";

export const dynamic = "force-dynamic";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}
function compactCLP(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return currency(value);
}
function pct(value: number) {
  return `${(value || 0).toFixed(1)}%`;
}
function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `hace ${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

const quoteStatus: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  SENT: { label: "Enviada", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  WON: { label: "Ganada", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  LOST: { label: "Perdida", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

// ---------- Sub-componentes (light) ----------
function Kpi({
  label,
  value,
  helper,
  icon: Icon,
  accent,
  delta,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: typeof DollarSign;
  accent: string;
  delta?: { up: boolean; text: string };
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-[26px] font-extrabold leading-none tracking-tight text-slate-900">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
              delta.up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {delta.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta.text}
          </span>
        )}
        {helper && <p className="text-[11px] text-slate-400">{helper}</p>}
      </div>
    </div>
  );
}

function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-[12px] text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Rate({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">{pct(value)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(2, value))}%` }} />
      </div>
    </div>
  );
}

function FunnelRow({ label, value, base, color }: { label: string; value: number; base: number; color: string }) {
  const width = base > 0 ? Math.min(100, Math.max(3, (value / base) * 100)) : 3;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12.5px]">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{value.toLocaleString("es-CL")}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-lg bg-slate-100">
        <div className={`h-full rounded-lg ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const snap = await getAdminSnapshot();
  const m = snap.metrics;
  const rev = snap.charts.revenueByMonth ?? [];
  const lastRev = rev[rev.length - 1]?.value ?? 0;
  const prevRev = rev[rev.length - 2]?.value ?? 0;
  const revDelta = prevRev > 0 ? ((lastRev - prevRev) / prevRev) * 100 : 0;

  const recentQuotes = [...snap.quotes]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 6);

  const funnelBase = Math.max(m.totals.leads, m.web.totalVisits, 1);

  const quickLinks = [
    { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, cls: "bg-emerald-50 text-emerald-600" },
    { href: "/admin/asistente-ia", label: "Asistente IA", icon: Sparkles, cls: "bg-violet-50 text-violet-600" },
    { href: "/admin/cotizaciones", label: "Cotizaciones", icon: FileText, cls: "bg-blue-50 text-blue-600" },
    { href: "/admin/contactos", label: "Contactos", icon: MessagesSquare, cls: "bg-sky-50 text-sky-600" },
    { href: "/admin/contador-auditor/facturacion", label: "Facturación", icon: Receipt, cls: "bg-amber-50 text-amber-600" },
    { href: "/admin/clientes", label: "Clientes", icon: Users, cls: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Panel de control</h1>
          <p className="text-[13px] text-slate-500">Resumen comercial y de tráfico en tiempo real</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Datos en vivo · {new Date(m.lastUpdated).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Ingresos"
          value={compactCLP(m.money.revenue)}
          icon={DollarSign}
          accent="bg-emerald-50 text-emerald-600"
          delta={rev.length >= 2 ? { up: revDelta >= 0, text: `${Math.abs(revDelta).toFixed(0)}% vs mes ant.` } : undefined}
          helper={rev.length < 2 ? "Acumulado" : undefined}
        />
        <Kpi label="Pipeline abierto" value={compactCLP(m.money.pipelineValue)} icon={Target} accent="bg-blue-50 text-blue-600" helper={`${m.totals.quotes} cotizaciones`} />
        <Kpi label="Ventas cerradas" value={String(m.totals.sales)} icon={TrendingUp} accent="bg-violet-50 text-violet-600" helper={`Ticket ${compactCLP(m.money.avgTicket)}`} />
        <Kpi label="Leads captados" value={String(m.totals.leads)} icon={Users} accent="bg-amber-50 text-amber-600" helper={`${m.totals.requests} solicitudes`} />
      </div>

      {/* Ingresos + Conversión */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Ingresos por mes" subtitle="Evolución de ventas cerradas">
          {rev.length >= 2 ? (
            <AreaChart data={rev} height={220} formatType="currency" strokeColor="#2563eb" fillId="rev-area" />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-[13px] text-slate-400">
              Aún no hay suficientes datos para el gráfico.
            </div>
          )}
        </Card>

        <Card title="Tasas de conversión" subtitle="Del embudo comercial">
          <div className="space-y-4 pt-1">
            <Rate label="Lead → Cotización" value={m.conversion.quoteRate} color="bg-blue-500" />
            <Rate label="Cotización → Venta" value={m.conversion.winRate} color="bg-emerald-500" />
            <Rate label="Lead → Visita" value={m.conversion.visitRate} color="bg-violet-500" />
            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500">
              Base de {m.conversion.leadBase.toLocaleString("es-CL")} leads
              {m.conversion.leadBaseEstimated ? " (estimada)" : ""}.
            </div>
          </div>
        </Card>
      </div>

      {/* Embudo + Tráfico web */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card title="Embudo comercial" subtitle="Del interés al cierre">
          <div className="space-y-3.5 pt-1">
            <FunnelRow label="Leads" value={m.totals.leads} base={funnelBase} color="bg-blue-500" />
            <FunnelRow label="Visitas técnicas" value={m.totals.visits} base={funnelBase} color="bg-sky-500" />
            <FunnelRow label="Cotizaciones" value={m.totals.quotes} base={funnelBase} color="bg-violet-500" />
            <FunnelRow label="Ventas" value={m.totals.sales} base={funnelBase} color="bg-emerald-500" />
          </div>
        </Card>

        <Card
          title="Tráfico web"
          subtitle={`${m.web.totalVisits.toLocaleString("es-CL")} visitas · ${m.web.uniqueIps.toLocaleString("es-CL")} únicas`}
          action={
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              <Globe className="h-3.5 w-3.5" /> Hoy {m.web.todayVisits}
            </span>
          }
        >
          {m.web.topPaths.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {m.web.topPaths.slice(0, 6).map((p) => {
                const max = m.web.topPaths[0]?.visits || 1;
                return (
                  <div key={p.path}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="truncate font-medium text-slate-600">{p.path}</span>
                      <span className="ml-2 shrink-0 font-bold text-slate-900">{p.visits}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(4, (p.visits / max) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-[13px] text-slate-400">Sin datos de tráfico aún.</div>
          )}
        </Card>
      </div>

      {/* Actividad reciente + Accesos */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card
          title="Cotizaciones recientes"
          subtitle="Últimas solicitudes"
          action={
            <Link href="/admin/cotizaciones" className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-700">
              Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {recentQuotes.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-slate-400">Aún no hay cotizaciones.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentQuotes.map((q) => {
                const st = quoteStatus[String(q.status || "PENDING").toUpperCase()] ?? quoteStatus.PENDING;
                return (
                  <Link
                    key={q.id}
                    href={`/admin/cotizaciones/${q.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{q.name || "Cliente"}</p>
                      <p className="text-[11px] text-slate-400">{q.displayNumber} · {timeAgo(q.createdAt)}</p>
                    </div>
                    <span className="hidden text-right text-[13px] font-bold text-slate-800 sm:block">{currency(q.totalAmount || 0)}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${st.cls}`}>{st.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Accesos rápidos" subtitle="Ir directo a la gestión">
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${l.cls}`}>
                  <l.icon className="h-4 w-4" />
                </span>
                <span className="text-[12.5px] font-semibold text-slate-700">{l.label}</span>
              </Link>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
            <div className="rounded-lg bg-slate-50 py-2">
              <p className="text-[16px] font-extrabold text-slate-900">{m.totals.projects}</p>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Proyectos</p>
            </div>
            <div className="rounded-lg bg-slate-50 py-2">
              <p className="text-[16px] font-extrabold text-slate-900">{m.totals.visits}</p>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Visitas</p>
            </div>
            <div className="rounded-lg bg-slate-50 py-2">
              <p className="text-[16px] font-extrabold text-slate-900">{m.totals.taxDocuments}</p>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Docs SII</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ventas por mes (barras) */}
      {rev.length >= 2 && (
        <Card title="Ventas por mes" subtitle="Comparativo mensual">
          <div className="pt-2">
            <BarChart data={rev} height={160} formatType="currency" />
          </div>
        </Card>
      )}
    </div>
  );
}

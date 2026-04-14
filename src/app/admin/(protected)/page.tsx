import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getAdminSnapshot } from "@/lib/admin-data";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock4,
  FileText,
  PiggyBank,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-blue-100 text-blue-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-rose-100 text-rose-700",
};

export default async function AdminDashboard() {
  const data = await getAdminSnapshot();
  const { metrics, charts, quotes, visits, leads } = data;

  const nextVisit = visits.find((v) => v.date && new Date(v.date) >= new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel avanzado</p>
          <h1 className="text-3xl font-bold text-slate-900">Control en tiempo real</h1>
          <p className="text-sm text-slate-600">Leads, pipeline, visitas técnicas y ventas unificados con Supabase.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/visitas/nueva">
              <Clock4 className="h-4 w-4" />
              Agendar visita
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/admin/cotizaciones/nueva">
              <FileText className="h-4 w-4" />
              Nueva cotización
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Leads calificados",
            value: metrics.totals.leads,
            icon: Users,
            hint: `${metrics.conversion.quoteRate}% pasan a cotización`,
          },
          {
            label: "Cotizaciones",
            value: metrics.totals.quotes,
            icon: FileText,
            hint: currency(metrics.money.pipelineValue),
          },
          {
            label: "Visitas técnicas",
            value: metrics.totals.visits,
            icon: Clock4,
            hint: `${metrics.conversion.visitRate}% de follow-up`,
          },
          {
            label: "Ventas registradas",
            value: metrics.totals.sales,
            icon: CheckCircle2,
            hint: `Win rate ${metrics.conversion.winRate}%`,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{kpi.label}</CardTitle>
              <kpi.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-900">{kpi.value}</div>
              <p className="text-xs text-slate-500">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Money + pipeline */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Ingresos y pipeline</CardTitle>
              <p className="text-xs text-slate-500">Actualizado {new Date(metrics.lastUpdated).toLocaleString("es-CL")}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Pipeline</p>
                <p className="text-xl font-semibold text-slate-900">{currency(metrics.money.pipelineValue)}</p>
                <p className="text-[11px] text-slate-500">Cotizaciones abiertas</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Ingresos</p>
                <p className="text-xl font-semibold text-slate-900">{currency(metrics.money.revenue)}</p>
                <p className="text-[11px] text-slate-500">Ventas registradas</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Ticket promedio</p>
                <p className="text-xl font-semibold text-slate-900">{currency(metrics.money.avgTicket)}</p>
                <p className="text-[11px] text-slate-500">Supabase / ventas</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Conversión pipeline</span>
                <span>{metrics.conversion.winRate}% win rate</span>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                {charts.pipelineConversion.map((step, idx) => (
                  <div key={step.label} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{step.label}</span>
                      <span>{step.value}%</span>
                    </div>
                    <Progress value={step.value} className="mt-2 h-2" />
                    {idx < charts.pipelineConversion.length - 1 && (
                      <p className="text-[11px] text-slate-500">→ siguiente etapa</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Revenue por mes</CardTitle>
              <p className="text-xs text-slate-500">Últimos 6 meses</p>
            </div>
            <PiggyBank className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-6 items-end gap-2">
              {charts.revenueByMonth.map((item) => (
                <div key={item.label} className="text-center">
                  <div className="mx-auto h-28 w-8 rounded-lg bg-slate-100">
                    <div
                      className="w-8 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700"
                      style={{ height: `${Math.min(100, (item.value / Math.max(1, metrics.money.revenue || item.value || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-600 uppercase">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Tendencia: {currency(charts.revenueByMonth.at(-1)?.value ?? 0)} este mes.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes & timeline */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Cotizaciones recientes</CardTitle>
              <p className="text-xs text-slate-500">Top 8 por fecha de creación</p>
            </div>
            <Link href="/admin/cotizaciones" className="text-xs font-semibold text-primary">Ver todo</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotes.length === 0 && <p className="text-sm text-slate-600">Sin datos aún.</p>}
            {quotes.slice(0, 8).map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{q.name || "Cotización"}</p>
                  <p className="text-xs text-slate-500">{q.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusColor[q.status || ""] || "bg-slate-100 text-slate-700"}`}>{q.status || "PENDING"}</Badge>
                  <p className="text-sm font-semibold text-slate-900">{currency(q.total || 0)}</p>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link href={`/admin/cotizaciones/${q.id}`}>
                      Ver
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Próximas visitas</CardTitle>
              <p className="text-xs text-slate-500">Integrado con supabase Visit</p>
            </div>
            <Activity className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {visits.length === 0 && <p>Sin visitas agendadas.</p>}
            {visits.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{v.notes || "Visita técnica"}</p>
                  <p className="text-xs text-slate-500">{v.status || "Programada"}</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>{v.date ? new Date(v.date).toLocaleDateString("es-CL") : "Sin fecha"}</p>
                  {v.clientId && <p className="text-[11px] text-slate-500">Cliente {v.clientId}</p>}
                </div>
              </div>
            ))}
            {nextVisit && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Siguiente visita programada: {new Date(nextVisit.date!).toLocaleString("es-CL")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads snapshot */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">Leads recientes</CardTitle>
            <p className="text-xs text-slate-500">Últimos 6 leads registrados</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link href="/admin/clientes">
              Ver clientes
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {leads.length === 0 && <p className="text-sm text-slate-600">Aún no hay leads cargados.</p>}
          {leads.slice(0, 6).map((lead) => (
            <div key={lead.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{lead.source || "—"}</span>
                <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("es-CL") : ""}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">{lead.name || "Lead"}</p>
              <p className="text-xs text-slate-600">{lead.email}</p>
              {lead.status && <p className="mt-1 text-[11px] font-semibold text-blue-700">{lead.status}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

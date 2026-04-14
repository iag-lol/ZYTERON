import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminSnapshot } from "@/lib/admin-data";
import { ActivitySquare, BarChart3, LineChart, ShieldCheck } from "lucide-react";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}

export default async function ReportesPage() {
  const data = await getAdminSnapshot();
  const { metrics, charts } = data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reportes</p>
        <h1 className="text-2xl font-semibold text-slate-900">Indicadores rápidos</h1>
        <p className="text-sm text-slate-600">Embudo completo y montos por Supabase.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Leads</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{metrics.totals.leads}</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{metrics.totals.quotes}</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Visitas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{metrics.totals.visits}</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Ventas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{metrics.totals.sales}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Embudo</CardTitle>
              <p className="text-xs text-slate-500">Conversión por etapa</p>
            </div>
            <ActivitySquare className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span>Leads → Cotizaciones</span>
              <Badge variant="secondary">{metrics.conversion.quoteRate}%</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span>Cotizaciones → Visitas</span>
              <Badge variant="secondary">{metrics.conversion.visitRate}%</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span>Visitas → Ventas</span>
              <Badge variant="secondary">{metrics.conversion.winRate}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Montos</CardTitle>
              <p className="text-xs text-slate-500">Pipeline y revenue</p>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Valor cotizado: {currency(metrics.money.pipelineValue)}</p>
            <p>Ventas registradas: {currency(metrics.money.revenue)}</p>
            <p>Ticket promedio: {currency(metrics.money.avgTicket)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">Serie de revenue</CardTitle>
            <p className="text-xs text-slate-500">Últimos 6 meses</p>
          </div>
          <LineChart className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent className="grid grid-cols-6 gap-2 text-sm text-slate-700">
          {charts.revenueByMonth.map((m) => (
            <div key={m.label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <p className="text-xs uppercase text-slate-500">{m.label}</p>
              <p className="font-semibold text-slate-900">{currency(m.value)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">Checklist Supabase</CardTitle>
            <p className="text-xs text-slate-500">Conexión service role</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-800">
            - Variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` definidas en el entorno del servidor.
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-800">
            - Reglas RLS habilitadas con `service_role` para lectura/lectura necesaria en Lead, Quote, Visit, Sale y User.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

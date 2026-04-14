import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminSnapshot } from "@/lib/admin-data";
import { ArrowUpRight, BarChart2, Filter, FileText, Mail } from "lucide-react";
import Link from "next/link";

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-blue-100 text-blue-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-rose-100 text-rose-700",
};

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}

export default async function CotizacionesPage() {
  const data = await getAdminSnapshot();
  const quotes = data.quotes.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const pipelineValue = quotes.reduce((acc, q) => acc + (q.total || 0), 0);
  const winRate = data.metrics.conversion.winRate;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cotizaciones</p>
          <h1 className="text-2xl font-semibold text-slate-900">Cotizaciones y descuentos</h1>
          <p className="text-sm text-slate-600">Pipeline económico y estado por cliente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/admin/cotizaciones">
              <FileText className="h-4 w-4" />
              Listado
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-700">Total pipeline</CardTitle>
              <p className="text-xs text-slate-500">Valor cotizado</p>
            </div>
            <BarChart2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{currency(pipelineValue)}</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Win rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{winRate}%</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Cotizaciones activas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{quotes.length}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">Listado</CardTitle>
            <p className="text-xs text-slate-500">Ordenado por fecha desc</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{quotes.length} registros</span>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {quotes.length === 0 && <p>No hay cotizaciones todavía.</p>}
          {quotes.map((q) => (
            <div key={q.id} className="grid gap-1 rounded-lg border border-slate-200 p-3 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{q.name || "Cotización"}</p>
                <p className="text-xs text-slate-500">{q.email}</p>
              </div>
              <p className="text-xs text-slate-600">{q.createdAt ? new Date(q.createdAt).toLocaleDateString("es-CL") : ""}</p>
              <div className="flex items-center gap-2">
                <Badge className={`${statusColor[q.status || ""] || "bg-slate-100 text-slate-700"}`}>{q.status || "PENDING"}</Badge>
                <span className="text-sm font-semibold text-slate-900">{currency(q.total || 0)}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button asChild size="sm" variant="ghost" className="gap-1">
                  <Link href={`mailto:${q.email ?? ""}`}>
                    <Mail className="h-3.5 w-3.5" />
                    Enviar
                  </Link>
                </Button>
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
    </div>
  );
}

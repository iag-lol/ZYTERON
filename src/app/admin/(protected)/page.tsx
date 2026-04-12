import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArrowUpRight, Users, ShoppingCart, FileText, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Metric = { label: string; value: number; hint?: string };

async function loadMetrics(): Promise<{
  kpis: Metric[];
  recentQuotes: { id: string; name: string; total: number; status: string }[];
}> {
  try {
    const { supabase } = createSupabaseServerClient();
    const [{ data: leads }, { data: quotes }, { data: visits }, { data: sales }] = await Promise.all([
      supabase.from("Lead").select("id"),
      supabase.from("Quote").select("total, status, id, name").limit(5).order("createdAt", { ascending: false }),
      supabase.from("Visit").select("id"),
      supabase.from("Sale").select("id"),
    ]);

    return {
      kpis: [
        { label: "Leads", value: leads?.length ?? 0 },
        { label: "Cotizaciones", value: quotes?.length ?? 0 },
        { label: "Visitas técnicas", value: visits?.length ?? 0 },
        { label: "Ventas", value: sales?.length ?? 0 },
      ],
      recentQuotes:
        quotes?.map((q) => ({
          id: q.id,
          name: q.name,
          total: q.total ?? 0,
          status: q.status ?? "PENDING",
        })) ?? [],
    };
  } catch {
    return {
      kpis: [
        { label: "Leads", value: 0 },
        { label: "Cotizaciones", value: 0 },
        { label: "Visitas técnicas", value: 0 },
        { label: "Ventas", value: 0 },
      ],
      recentQuotes: [],
    };
  }
}

export default async function AdminDashboard() {
  const { kpis, recentQuotes } = await loadMetrics();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Panel</p>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard general</h1>
          <p className="text-sm text-slate-600">Seguimiento de leads, cotizaciones, visitas y ventas.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/cotizaciones">Cotizaciones</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/reportes">Reportes</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{kpi.label}</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900">{kpi.value}</div>
              {kpi.hint && <p className="text-xs text-slate-500">{kpi.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Cotizaciones recientes</CardTitle>
              <p className="text-xs text-slate-500">Últimas 5 enviadas</p>
            </div>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            {recentQuotes.length === 0 && <p className="text-sm text-slate-600">Sin datos aún.</p>}
            {recentQuotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{q.name || "Cotización"}</p>
                  <p className="text-xs text-slate-500">{q.status}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">${q.total?.toLocaleString("es-CL")}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Accesos rápidos</CardTitle>
              <p className="text-xs text-slate-500">Gestión operativa</p>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <Link className="flex items-center gap-2 text-primary" href="/admin/clientes">
              <Users className="h-4 w-4" /> Clientes
            </Link>
            <Link className="flex items-center gap-2 text-primary" href="/admin/cotizaciones">
              <FileText className="h-4 w-4" /> Cotizaciones
            </Link>
            <Link className="flex items-center gap-2 text-primary" href="/admin/visitas">
              <ShoppingCart className="h-4 w-4" /> Visitas técnicas
            </Link>
            <Link className="flex items-center gap-2 text-primary" href="/admin/ventas">
              <ShoppingCart className="h-4 w-4" /> Ventas
            </Link>
            <Link className="flex items-center gap-2 text-primary" href="/admin/reportes">
              <BarChart3 className="h-4 w-4" /> Reportes
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function loadAggregates() {
  try {
    const { supabase } = createSupabaseServerClient();
    const [{ data: leads }, { data: quotes }, { data: sales }] = await Promise.all([
      supabase.from("Lead").select("id"),
      supabase.from("Quote").select("id, total"),
      supabase.from("Sale").select("id, total"),
    ]);
    const quotesTotal =
      quotes?.reduce((acc, q) => acc + (typeof q.total === "number" ? q.total : 0), 0) ?? 0;
    const salesTotal = sales?.reduce((acc, s) => acc + (typeof s.total === "number" ? s.total : 0), 0) ?? 0;

    return {
      leadsCount: leads?.length ?? 0,
      quotesCount: quotes?.length ?? 0,
      quotesTotal,
      salesTotal,
    };
  } catch {
    return { leadsCount: 0, quotesCount: 0, quotesTotal: 0, salesTotal: 0 };
  }
}

export default async function ReportesPage() {
  const agg = await loadAggregates();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reportes</p>
        <h1 className="text-2xl font-semibold text-slate-900">Indicadores rápidos</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Embudo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Leads: {agg.leadsCount}</p>
            <p>Cotizaciones: {agg.quotesCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Montos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Valor cotizado: ${agg.quotesTotal.toLocaleString("es-CL")}</p>
            <p>Ventas registradas: ${agg.salesTotal.toLocaleString("es-CL")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

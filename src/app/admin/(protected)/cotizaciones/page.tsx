import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CotizacionesPage() {
  let quotes:
    | { id: string; name: string; email: string; total: number; status: string; createdAt?: string }[]
    | [] = [];
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("Quote")
      .select("id, name, email, total, status, createdAt")
      .order("createdAt", { ascending: false });
    quotes = data ?? [];
  } catch {
    quotes = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cotizaciones</p>
          <h1 className="text-2xl font-semibold text-slate-900">Cotizaciones y descuentos</h1>
        </div>
        <Button asChild>
          <Link href="/admin/cotizaciones/nueva">Nueva cotización</Link>
        </Button>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {quotes.length === 0 && <p>No hay cotizaciones todavía.</p>}
          {quotes.map((q) => (
            <div key={q.id} className="grid gap-1 rounded-lg border border-slate-200 p-3 md:grid-cols-[1.6fr_1fr_1fr]">
              <div>
                <p className="font-semibold text-slate-900">{q.name || "Cotización"}</p>
                <p className="text-xs text-slate-500">{q.email}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">${(q.total ?? 0).toLocaleString("es-CL")}</p>
              <div className="flex items-center justify-end gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{q.status}</span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/cotizaciones/${q.id}`}>Ver</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

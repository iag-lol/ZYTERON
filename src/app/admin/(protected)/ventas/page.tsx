import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function VentasPage() {
  let sales: { id: string; clientId?: string; total?: number; createdAt?: string }[] = [];
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase.from("Sale").select("id, clientId, total, createdAt").order("createdAt", { ascending: false });
    sales = data ?? [];
  } catch {
    sales = [];
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ventas</p>
          <h1 className="text-2xl font-semibold text-slate-900">Ventas y facturación</h1>
        </div>
        <Button asChild>
          <Link href="/admin/ventas/nueva">Registrar venta</Link>
        </Button>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {sales.length === 0 && <p>No hay ventas registradas.</p>}
          {sales.map((s) => (
            <div key={s.id} className="grid gap-1 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr]">
              <p className="text-sm font-semibold text-slate-900">{s.id}</p>
              <p className="text-sm font-semibold text-slate-900">${(s.total ?? 0).toLocaleString("es-CL")}</p>
              <div className="flex items-center justify-end gap-2">
                <p className="text-xs text-slate-600">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString("es-CL") : "—"}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/ventas/${s.id}`}>Ver</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

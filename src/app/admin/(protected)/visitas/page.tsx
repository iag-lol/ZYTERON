import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function VisitasPage() {
  let visits: { id: string; clientId?: string; date?: string; notes?: string }[] = [];
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase.from("Visit").select("id, clientId, date, notes").order("date", { ascending: false });
    visits = data ?? [];
  } catch {
    visits = [];
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Visitas</p>
          <h1 className="text-2xl font-semibold text-slate-900">Visitas a clientes</h1>
        </div>
        <Button asChild>
          <Link href="/admin/visitas/nueva">Agendar visita</Link>
        </Button>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Agenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {visits.length === 0 && <p>No hay visitas registradas.</p>}
          {visits.map((v) => (
            <div key={v.id} className="grid gap-1 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_2fr]">
              <p className="text-sm font-semibold text-slate-900">
                {v.date ? new Date(v.date).toLocaleDateString("es-CL") : "Sin fecha"}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-600 truncate">{v.notes || "Sin notas"}</p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/visitas/${v.id}`}>Detalle</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminSnapshot } from "@/lib/admin-data";
import { ArrowUpRight, CalendarClock, MapPin, NotebookPen } from "lucide-react";
import Link from "next/link";

export default async function VisitasPage() {
  const data = await getAdminSnapshot();
  const visits = data.visits.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const upcoming = visits.filter((v) => v.date && new Date(v.date) >= new Date());
  const past = visits.filter((v) => v.date && new Date(v.date) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Visitas</p>
          <h1 className="text-2xl font-semibold text-slate-900">Visitas a clientes</h1>
          <p className="text-sm text-slate-600">Agenda técnica y notas de terreno.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/visitas">
            <CalendarClock className="h-4 w-4" />
            Ver visitas
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Próximas</CardTitle>
              <p className="text-xs text-slate-500">Ordenadas por fecha</p>
            </div>
            <Badge variant="secondary">{upcoming.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {upcoming.length === 0 && <p>No hay visitas programadas.</p>}
            {upcoming.map((v) => (
              <div key={v.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{v.date ? new Date(v.date).toLocaleString("es-CL") : "Sin fecha"}</span>
                  <Badge variant="outline" className="text-[11px]">{v.status || "Programada"}</Badge>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{v.notes || "Visita técnica"}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Cliente {v.clientId || "—"}
                  </span>
                  <Button size="sm" variant="ghost" className="gap-1 text-primary" disabled>
                    Ver
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Histórico</CardTitle>
              <p className="text-xs text-slate-500">Últimas visitas cerradas</p>
            </div>
            <NotebookPen className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {past.length === 0 && <p>Sin visitas registradas aún.</p>}
            {past.slice(0, 6).map((v) => (
              <div key={v.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{v.date ? new Date(v.date).toLocaleDateString("es-CL") : "Sin fecha"}</span>
                  <Badge variant="outline" className="text-[11px]">{v.status || "Hecha"}</Badge>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{v.notes || "Visita técnica"}</p>
                <p className="text-xs text-slate-500">Cliente {v.clientId || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

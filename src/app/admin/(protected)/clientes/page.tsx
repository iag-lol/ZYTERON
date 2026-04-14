import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminSnapshot } from "@/lib/admin-data";
import { ArrowUpRight, Building2, Mail, Sparkles, Users } from "lucide-react";
import Link from "next/link";

export default async function ClientesPage() {
  const data = await getAdminSnapshot();
  const { clients, metrics, leads } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Clientes</p>
          <h1 className="text-2xl font-semibold text-slate-900">Gestión de clientes</h1>
          <p className="text-sm text-slate-600">Ficha rápida, contacto y atajos a cotizaciones/ventas.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/admin/visitas/nueva">
              <Sparkles className="h-4 w-4" />
              Agendar visita
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/admin/cotizaciones/nueva">
              <ArrowUpRight className="h-4 w-4" />
              Nueva cotización
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-700">Clientes activos</CardTitle>
              <p className="text-xs text-slate-500">Supabase · tabla User</p>
            </div>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{clients.length}</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-700">Leads abiertos</CardTitle>
              <p className="text-xs text-slate-500">En seguimiento</p>
            </div>
            <Building2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{Math.max(leads.length - metrics.totals.sales, 0)}</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-700">Ticket promedio</CardTitle>
              <p className="text-xs text-slate-500">Referencia ventas</p>
            </div>
            <Sparkles className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">${metrics.money.avgTicket.toLocaleString("es-CL")}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">Clientes</CardTitle>
            <p className="text-xs text-slate-500">Ordenados por nombre</p>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-1" disabled>
            <span>
              Nuevo
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {clients.length === 0 && <p>No hay clientes aún.</p>}
          {clients
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <div key={c.id} className="grid gap-1 rounded-lg border border-slate-200 p-3 md:grid-cols-[1.2fr_1fr_1fr]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.email}</p>
                </div>
                <p className="text-xs text-slate-600">{c.company || "—"}</p>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">
                    {c.tier || "Cliente"}
                  </Badge>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link href={`/admin/cotizaciones?cliente=${c.id}`}>
                      Cotizaciones
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="gap-1">
                    <Link href={`mailto:${c.email ?? ""}`}>
                      <Mail className="h-3.5 w-3.5" />
                      Contactar
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

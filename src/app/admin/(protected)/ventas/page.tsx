import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminSnapshot } from "@/lib/admin-data";
import { ArrowUpRight, Coins, Receipt, Wallet2 } from "lucide-react";
import Link from "next/link";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}

export default async function VentasPage() {
  const data = await getAdminSnapshot();
  const sales = data.sales.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const revenue = data.metrics.money.revenue;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ventas</p>
          <h1 className="text-2xl font-semibold text-slate-900">Ventas y facturación</h1>
          <p className="text-sm text-slate-600">Ticket promedio, revenue y detalle por venta.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/ventas">
            <Receipt className="h-4 w-4" />
            Ventas
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-700">Ingresos</CardTitle>
              <p className="text-xs text-slate-500">Ventas registradas</p>
            </div>
            <Wallet2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{currency(revenue)}</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Ventas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{sales.length}</CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">Ticket promedio</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{currency(data.metrics.money.avgTicket)}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">Resumen</CardTitle>
            <p className="text-xs text-slate-500">Últimas ventas</p>
          </div>
          <Badge variant="secondary">{sales.length} registros</Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {sales.length === 0 && <p>No hay ventas registradas.</p>}
          {sales.map((s) => (
            <div key={s.id} className="grid gap-1 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr]">
              <p className="text-sm font-semibold text-slate-900">{s.id}</p>
              <p className="text-sm font-semibold text-slate-900">{currency(s.total || 0)}</p>
              <div className="flex items-center justify-end gap-2">
                <p className="text-xs text-slate-600">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("es-CL") : "—"}</p>
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link href={`/admin/ventas/${s.id}`}>
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
            <CardTitle className="text-base text-slate-900">Notas rápidas</CardTitle>
            <p className="text-xs text-slate-500">Conectado a Supabase</p>
          </div>
          <Coins className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-800">
            Revisa que RLS en Supabase permita service role para registrar ventas desde este panel.
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-800">
            Las ventas mostradas se ordenan por `createdAt`; si no existe, cae a orden natural de Supabase.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

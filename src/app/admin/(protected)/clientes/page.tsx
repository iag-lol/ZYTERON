import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ClientesPage() {
  let clientes: { id: string; name: string; email: string; company?: string }[] = [];
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase.from("User").select("id, name, email, company").eq("role", "CLIENT");
    clientes = data ?? [];
  } catch {
    clientes = [];
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Clientes</p>
          <h1 className="text-2xl font-semibold text-slate-900">Gestión de clientes</h1>
        </div>
        <Button asChild>
          <Link href="/admin/clientes/nuevo">Nuevo cliente</Link>
        </Button>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Clientes activos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {clientes.length === 0 && <p>No hay clientes aún.</p>}
          {clientes.map((c) => (
            <div key={c.id} className="grid gap-1 rounded-lg border border-slate-200 p-3 md:grid-cols-3">
              <div>
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.email}</p>
              </div>
              <p className="text-xs text-slate-600">{c.company || "—"}</p>
              <div className="flex gap-2 md:justify-end">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/clientes/${c.id}`}>Ver ficha</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/admin/cotizaciones?cliente=${c.id}`}>Cotizaciones</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

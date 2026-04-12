import { Container } from "@/components/layout/container";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <Container className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-semibold">
              ZA
            </div>
            <div>
              <p className="text-sm font-semibold">Zyteron Admin</p>
              <p className="text-xs text-slate-500">Control total</p>
            </div>
          </div>
          <nav className="hidden items-center gap-4 text-sm font-medium text-slate-700 md:flex">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/clientes">Clientes</Link>
            <Link href="/admin/cotizaciones">Cotizaciones</Link>
            <Link href="/admin/visitas">Visitas</Link>
            <Link href="/admin/ventas">Ventas</Link>
            <Link href="/admin/reportes">Reportes</Link>
            <Link href="/admin/config">Config</Link>
          </nav>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/logout">Salir</Link>
          </Button>
        </Container>
      </header>
      <main className="py-8">
        <Container className="space-y-6">{children}</Container>
      </main>
    </div>
  );
}

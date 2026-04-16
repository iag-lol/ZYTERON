import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ShieldCheck, Bell, Settings, Power } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const envLabel = process.env.NODE_ENV === "production" ? "Producción" : "Entorno dev";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="relative ml-64 flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
            <Container className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  <ShieldCheck className="h-4 w-4" />
                  Acceso seguro
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {envLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/admin/config" prefetch={false} className="gap-2">
                    <Settings className="h-4 w-4" />
                    Config
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href="/admin/cotizaciones/nueva" prefetch={false}>
                    <Bell className="h-4 w-4" />
                    Nueva cotización
                  </Link>
                </Button>
                <Button variant="default" size="sm" className="gap-2" asChild>
                  <Link href="/admin/logout" prefetch={false}>
                    <Power className="h-4 w-4" />
                    Salir
                  </Link>
                </Button>
              </div>
            </Container>
          </header>
          <main className="px-4 py-8 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

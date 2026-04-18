import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Landmark, Plus, Power, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const isProd = process.env.NODE_ENV === "production";
  const envLabel = isProd ? "Producción" : "Desarrollo";

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="flex min-h-screen">
        <AdminSidebar />

        {/* Main content */}
        <div className="ml-64 flex min-h-screen flex-1 flex-col bg-slate-50">
          {/* Top header */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="flex h-14 items-center justify-between gap-4 px-6">
              {/* Left: status badges */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                    isProd
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isProd ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {envLabel}
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                  <ShieldCheck className="h-3 w-3 text-slate-400" />
                  Sesión segura
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-1.5">
                <Link
                  href="/admin/cotizaciones/nueva"
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva cotización
                </Link>
                <Link
                  href="/admin/config"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title="Configuración"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <Link
                  href="/admin/sii"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title="Centro SII"
                >
                  <Landmark className="h-4 w-4" />
                </Link>
                <Link
                  href="/admin/logout"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  title="Cerrar sesión"
                >
                  <Power className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 px-6 py-8 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white px-6 py-3">
            <p className="text-[11px] text-slate-400">
              Zyteron Admin Panel · Datos en tiempo real vía Supabase ·{" "}
              <span className="font-medium text-slate-500">
                {new Date().toLocaleDateString("es-CL", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

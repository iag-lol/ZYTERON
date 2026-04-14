"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  FileText,
  ChevronRight,
  Zap,
  LogOut,
  BarChart3,
  Settings,
  CalendarClock,
} from "lucide-react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/cotizaciones", label: "Cotizaciones", icon: FileText },
  { href: "/admin/visitas", label: "Visitas técnicas", icon: CalendarClock },
  { href: "/admin/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col overflow-y-auto bg-slate-900 text-white shadow-xl shadow-slate-900/40">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-700/60 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-extrabold tracking-wide">Zyteron</p>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Panel Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Operación</p>
        {nav.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-white"}`} style={{ width: "1.125rem", height: "1.125rem" }} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              {active && <ChevronRight className="h-3.5 w-3.5 text-blue-200" />}
            </Link>
          );
        })}
        <div className="pt-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Sistema</p>
          <Link
            href="/admin/config"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Configuración
          </Link>
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-700/60 p-4 space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            Z
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">Admin Zyteron</p>
            <p className="text-[10px] text-slate-400 truncate">eduardo.avila@zyteron.cly</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          Volver al sitio
        </Link>
      </div>
    </aside>
  );
}

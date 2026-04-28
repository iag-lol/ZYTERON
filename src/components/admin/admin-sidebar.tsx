"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  FileText,
  CalendarClock,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  PlusCircle,
  TrendingUp,
  BriefcaseBusiness,
  MessagesSquare,
  MessageSquareQuote,
  Landmark,
  Mail,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/cotizaciones", label: "Cotizaciones", icon: FileText },
  { href: "/admin/proyectos", label: "Proyectos", icon: BriefcaseBusiness },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: MessagesSquare },
  { href: "/admin/comentarios", label: "Comentarios", icon: MessageSquareQuote },
  { href: "/admin/contactos", label: "Contactos", icon: Mail },
  { href: "/admin/visitas", label: "Visitas técnicas", icon: CalendarClock },
  { href: "/admin/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/admin/gastos", label: "Gastos", icon: WalletCards },
  { href: "/admin/sii", label: "SII", icon: Landmark },
  { href: "/admin/control-web", label: "Control Web", icon: SlidersHorizontal },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/40">
          <Zap className="h-4.5 w-4.5 text-white" style={{ width: "1.125rem", height: "1.125rem" }} />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>
        <div>
          <p className="text-[13px] font-extrabold tracking-wide text-white">Zyteron</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Panel Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Operaciones
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-blue-500" />
                )}
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 space-y-0.5">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Sistema
          </p>
          <Link
            href="/admin/config"
            prefetch={false}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-400 transition-all hover:bg-white/[0.05] hover:text-slate-100"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            Configuración
          </Link>
        </div>

        {/* Quick actions panel */}
        <div className="mt-6 rounded-xl border border-blue-500/10 bg-gradient-to-br from-blue-950/60 to-slate-900/40 p-3">
          <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
            <TrendingUp className="h-3 w-3" />
            Acceso rápido
          </p>
          <div className="space-y-0.5">
            <Link
              href="/admin/cotizaciones/nueva"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-blue-300/70 transition-all hover:bg-blue-500/10 hover:text-blue-200"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Nueva cotización
            </Link>
            <Link
              href="/admin/ventas/nueva"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-blue-300/70 transition-all hover:bg-blue-500/10 hover:text-blue-200"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Registrar venta
            </Link>
            <Link
              href="/admin/visitas/nueva"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-blue-300/70 transition-all hover:bg-blue-500/10 hover:text-blue-200"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Agendar visita
            </Link>
            <Link
              href="/admin/gastos"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-blue-300/70 transition-all hover:bg-blue-500/10 hover:text-blue-200"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Registrar gasto
            </Link>
            <Link
              href="/admin/clientes/nuevo"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-blue-300/70 transition-all hover:bg-blue-500/10 hover:text-blue-200"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Nuevo cliente
            </Link>
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-white/[0.06] p-4">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[11px] font-extrabold text-white shadow">
            Z
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-slate-200">Zyteron Admin</p>
            <p className="truncate text-[10px] text-slate-500">eduardo.avila@zyteron.cl</p>
          </div>
          <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
        </div>
        <Link
          href="/"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-500 transition-all hover:bg-white/[0.05] hover:text-slate-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          Volver al sitio
        </Link>
      </div>
    </aside>
  );
}

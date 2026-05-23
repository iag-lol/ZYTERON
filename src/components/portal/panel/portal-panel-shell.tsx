"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  ChevronLeft,
  CircleUser,
  FileDigit,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";

const navItems = [
  { href: "/portal-clientes/panel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal-clientes/panel/perfil", label: "Mi perfil", icon: CircleUser },
  { href: "/portal-clientes/panel/cotizaciones", label: "Cotizaciones", icon: FileDigit },
  { href: "/portal-clientes/panel/proyectos", label: "Proyectos", icon: BriefcaseBusiness },
  { href: "/portal-clientes/panel/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/portal-clientes/panel/compras-boletas", label: "Compras y boletas", icon: FileText },
  { href: "/portal-clientes/panel/asistencia", label: "Asistencia", icon: LifeBuoy },
  { href: "/portal-clientes/panel/credenciales", label: "Credenciales", icon: ShieldCheck },
  { href: "/portal-clientes/panel/comunicacion", label: "Comunicación", icon: MessageCircle },
  { href: "/portal-clientes/panel/solicitudes", label: "Solicitudes", icon: Ticket },
];

function isActivePath(current: string, href: string, exact?: boolean) {
  return exact ? current === href : current.startsWith(href);
}

export function PortalPanelShell({
  children,
  heading,
  subheading,
  userLabel,
  unreadCount,
}: {
  children: React.ReactNode;
  heading: string;
  subheading: string;
  userLabel: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen md:grid-cols-[280px_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[280px] border-r border-white/10 bg-slate-950/95 px-4 py-5 backdrop-blur-xl transition-transform md:static md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <Link href="/portal-clientes/panel" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-700/30">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">Portal Clientes</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Zyteron</p>
              </div>
            </Link>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 md:hidden"
              onClick={() => setOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-500/15 text-blue-100"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? "text-blue-300" : "text-slate-500 group-hover:text-slate-200"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-3.5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-200">Cuenta activa</p>
            <p className="mt-1 text-sm font-semibold text-white">{userLabel}</p>
            <p className="mt-2 text-xs text-blue-100/70">Tu información está protegida por sesión segura y permisos por rol.</p>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/portal-clientes/login" })}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </aside>

        <div className="flex min-h-screen flex-col bg-slate-50">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 sm:text-base">{heading}</h1>
                  <p className="hidden text-xs text-slate-500 sm:block">{subheading}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                <Bell className="h-3.5 w-3.5 text-blue-600" />
                {unreadCount > 0 ? `${unreadCount} notificaciones` : "Sin alertas"}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>

          <footer className="border-t border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500 sm:px-6">
            Zyteron Portal · Gestión privada de clientes · Integración segura por cuenta
          </footer>
        </div>
      </div>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        />
      ) : null}
    </div>
  );
}

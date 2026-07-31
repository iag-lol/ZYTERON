"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Clock,
  ChevronRight,
  CalendarClock,
  FileText,
  Settings,
  Power,
  Landmark,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { AdminNotifications } from "@/components/admin/admin-notifications";
import { useAdminUi } from "@/components/admin/admin-ui-context";

const routeMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/asistente-ia": "Asistente IA",
  "/admin/clientes": "Clientes",
  "/admin/comercial": "Partners & Ejecutivos",
  "/admin/portal-clientes": "Portal Clientes",
  "/admin/cotizaciones": "Cotizaciones",
  "/admin/cotizaciones/nueva": "Nueva Cotización",
  "/admin/ordenes-trabajo": "Órdenes de Trabajo",
  "/admin/proyectos": "Proyectos",
  "/admin/solicitudes": "Solicitudes",
  "/admin/comentarios": "Comentarios",
  "/admin/contactos": "Contactos",
  "/admin/comunicaciones": "Mensajes",
  "/admin/whatsapp": "WhatsApp",
  "/admin/visitas": "Visitas Técnicas",
  "/admin/visitas/nueva": "Nueva Visita",
  "/admin/ventas": "Ventas",
  "/admin/contador-auditor": "Contador Auditor",
  "/admin/contador-auditor/facturacion": "Facturación SII",
  "/admin/gastos": "Gastos",
  "/admin/productos": "Productos",
  "/admin/sii": "Centro SII",
  "/admin/control-web": "Control Web",
  "/admin/reportes": "Reportes",
  "/admin/config": "Configuración",
};

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [{ label: "Admin", href: "/admin" }];
  if (pathname === "/admin") return crumbs;
  const segments = pathname.split("/").filter(Boolean);
  let built = "";
  for (let i = 0; i < segments.length; i++) {
    built += "/" + segments[i];
    const label = routeMap[built];
    if (label && built !== "/admin") {
      crumbs.push({ label, href: built });
    }
  }
  return crumbs;
}

function LiveClock() {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    function update() {
      setTime(
        new Date().toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
    update();
    // Sin segundos basta con refrescar cada medio minuto. Antes se redibujaba
    // una vez por segundo en todas las páginas del panel, sin ganancia real.
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-mono font-semibold text-slate-600 xl:flex">
      <Clock className="h-3.5 w-3.5 text-blue-600" />
      {time || "—"}
    </div>
  );
}

export function AdminTopbar({ isProd }: { isProd: boolean }) {
  const pathname = usePathname();
  const { toggleMobileNav } = useAdminUi();
  const breadcrumbs = buildBreadcrumbs(pathname);
  const envLabel = isProd ? "Producción" : "Desarrollo";

  const today = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-5 lg:px-7">
        {/* Botón menú (solo móvil) */}
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Abrir menú"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <nav className="flex min-w-0 flex-1 items-center gap-1.5 lg:flex-none" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.href} className="flex items-center gap-1.5">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
              {idx === breadcrumbs.length - 1 ? (
                <span className="truncate text-[13px] font-semibold text-slate-800">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[11px] capitalize text-slate-400 lg:block">{today}</span>

          <LiveClock />

          <div className="mx-1 hidden h-5 w-px bg-slate-200 lg:block" />

          {/* Env badge */}
          <div
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:flex ${
              isProd
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isProd ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
            {envLabel}
          </div>

          {/* Secure session */}
          <div className="hidden items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 md:flex">
            <ShieldCheck className="h-3 w-3 text-slate-400" />
            Segura
          </div>

          {/* Notificaciones en tiempo real */}
          <AdminNotifications />

          <div className="mx-1 h-5 w-px bg-slate-200" />

          {/* Nueva cotización */}
          <Link
            href="/admin/cotizaciones/nueva"
            prefetch={false}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cotizar</span>
          </Link>

          {/* Agendar visita */}
          <Link
            href="/admin/visitas/nueva"
            prefetch={false}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:flex"
            title="Agendar visita"
          >
            <CalendarClock className="h-4 w-4" />
          </Link>

          {/* SII */}
          <Link
            href="/admin/sii"
            prefetch={false}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:flex"
            title="Centro SII"
          >
            <Landmark className="h-4 w-4" />
          </Link>

          {/* Settings */}
          <Link
            href="/admin/config"
            prefetch={false}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="Configuración"
          >
            <Settings className="h-4 w-4" />
          </Link>

          {/* Logout */}
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              title="Cerrar sesión"
            >
              <Power className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

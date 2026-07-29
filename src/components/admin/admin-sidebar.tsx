"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { useAdminUi } from "@/components/admin/admin-ui-context";
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
  BriefcaseBusiness,
  MessagesSquare,
  MessageSquareQuote,
  Landmark,
  Mail,
  SlidersHorizontal,
  WalletCards,
  Boxes,
  ClipboardCheck,
  ShieldCheck,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Calculator,
  Newspaper,
  Trophy,
  Award,
  Sparkles,
  MessageCircle,
  Receipt,
  UserRoundCog,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  color?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, color: "blue" },
      { href: "/admin/asistente-ia", label: "Asistente IA", icon: Sparkles, color: "violet" },
      { href: "/admin/reportes", label: "Reportes", icon: BarChart3, color: "violet" },
    ],
  },
  {
    label: "Ventas & Clientes",
    items: [
      { href: "/admin/clientes", label: "Clientes", icon: Users, color: "blue" },
      { href: "/admin/contactos", label: "Contactos", icon: Mail, color: "sky" },
      { href: "/admin/cotizaciones", label: "Cotizaciones", icon: FileText, color: "violet" },
      { href: "/admin/ventas", label: "Ventas", icon: ShoppingCart, color: "emerald" },
      { href: "/admin/comercial", label: "Partners & Ejecutivos", icon: UserRoundCog, color: "indigo" },
    ],
  },
  {
    label: "Comunicación",
    items: [
      { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, color: "emerald" },
      { href: "/admin/comunicaciones", label: "Mensajes", icon: Inbox, color: "teal" },
      { href: "/admin/comentarios", label: "Comentarios", icon: MessageSquareQuote, color: "rose" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { href: "/admin/ordenes-trabajo", label: "Órdenes de trabajo", icon: ClipboardCheck, color: "amber" },
      { href: "/admin/proyectos", label: "Proyectos", icon: BriefcaseBusiness, color: "orange" },
      { href: "/admin/visitas", label: "Visitas técnicas", icon: CalendarClock, color: "cyan" },
      { href: "/admin/solicitudes", label: "Solicitudes", icon: MessagesSquare, color: "pink" },
    ],
  },
  {
    label: "Finanzas & Tributario",
    items: [
      { href: "/admin/contador-auditor", label: "Contador Auditor", icon: Calculator, color: "blue" },
      { href: "/admin/contador-auditor/facturacion", label: "Facturación SII", icon: Receipt, color: "violet" },
      { href: "/admin/sii", label: "Centro SII", icon: Landmark, color: "yellow" },
      { href: "/admin/gastos", label: "Gastos", icon: WalletCards, color: "red" },
    ],
  },
  {
    label: "Catálogo & Contenido",
    items: [
      { href: "/admin/productos", label: "Productos", icon: Boxes, color: "indigo" },
      { href: "/admin/blog", label: "Blog", icon: Newspaper, color: "orange" },
      { href: "/admin/casos", label: "Casos de éxito", icon: Trophy, color: "amber" },
    ],
  },
  {
    label: "Programas",
    items: [
      { href: "/admin/becas", label: "Becas Web Pyme", icon: Award, color: "blue" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/portal-clientes", label: "Portal Clientes", icon: ShieldCheck, color: "emerald" },
      { href: "/admin/control-web", label: "Control Web", icon: SlidersHorizontal, color: "slate" },
      { href: "/admin/config", label: "Configuración", icon: Settings, color: "slate" },
    ],
  },
];

// Maps color name → active + hover styles (light mode)
const colorMap: Record<string, { activeBg: string; activeText: string; activeIcon: string; activeDot: string }> = {
  blue:    { activeBg: "bg-blue-50",    activeText: "text-blue-700",    activeIcon: "text-blue-600",    activeDot: "bg-blue-500" },
  violet:  { activeBg: "bg-violet-50",  activeText: "text-violet-700",  activeIcon: "text-violet-600",  activeDot: "bg-violet-500" },
  emerald: { activeBg: "bg-emerald-50", activeText: "text-emerald-700", activeIcon: "text-emerald-600", activeDot: "bg-emerald-500" },
  amber:   { activeBg: "bg-amber-50",   activeText: "text-amber-700",   activeIcon: "text-amber-600",   activeDot: "bg-amber-500" },
  orange:  { activeBg: "bg-orange-50",  activeText: "text-orange-700",  activeIcon: "text-orange-600",  activeDot: "bg-orange-500" },
  sky:     { activeBg: "bg-sky-50",     activeText: "text-sky-700",     activeIcon: "text-sky-600",     activeDot: "bg-sky-500" },
  cyan:    { activeBg: "bg-cyan-50",    activeText: "text-cyan-700",    activeIcon: "text-cyan-600",    activeDot: "bg-cyan-500" },
  pink:    { activeBg: "bg-pink-50",    activeText: "text-pink-700",    activeIcon: "text-pink-600",    activeDot: "bg-pink-500" },
  rose:    { activeBg: "bg-rose-50",    activeText: "text-rose-700",    activeIcon: "text-rose-600",    activeDot: "bg-rose-500" },
  teal:    { activeBg: "bg-teal-50",    activeText: "text-teal-700",    activeIcon: "text-teal-600",    activeDot: "bg-teal-500" },
  red:     { activeBg: "bg-red-50",     activeText: "text-red-700",     activeIcon: "text-red-600",     activeDot: "bg-red-500" },
  yellow:  { activeBg: "bg-yellow-50",  activeText: "text-yellow-700",  activeIcon: "text-yellow-600",  activeDot: "bg-yellow-500" },
  indigo:  { activeBg: "bg-indigo-50",  activeText: "text-indigo-700",  activeIcon: "text-indigo-600",  activeDot: "bg-indigo-500" },
  slate:   { activeBg: "bg-slate-100",  activeText: "text-slate-700",   activeIcon: "text-slate-600",   activeDot: "bg-slate-500" },
};

const GROUPS_STORAGE_KEY = "zyteron_admin_sidebar_collapsed_groups_v1";

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const { mobileNavOpen, setMobileNavOpen } = useAdminUi();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  // Restaura qué secciones están ocultas (persistente).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (raw) setCollapsedGroups(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  // La sección que contiene la página activa siempre se muestra abierta.
  const activeGroupLabel = navGroups.find((g) => g.items.some((i) => isActive(i.href, i.exact)))?.label;

  // Cierra el menú móvil al cambiar de página.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  // Bloquea el scroll del fondo mientras el drawer está abierto (móvil).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  // En móvil el drawer siempre se muestra expandido (con etiquetas).
  const showLabels = !collapsed || mobileNavOpen;

  return (
    <>
      {/* Fondo oscuro del drawer (solo móvil) */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:z-40 lg:translate-x-0 lg:transition-all ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-[72px]" : "lg:w-64"}`}
      >
      {/* Logo */}
      <div className="relative flex h-16 shrink-0 items-center border-b border-slate-200 px-4">
        <Link href="/admin" className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-md shadow-blue-700/20">
            <Zap className="text-white" style={{ width: "1.125rem", height: "1.125rem" }} />
            {/* Online indicator */}
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          {showLabels && (
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold tracking-wide text-slate-900">Zyteron</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Panel Admin
              </p>
            </div>
          )}
        </Link>

        {/* Collapse toggle (solo escritorio) */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 lg:flex"
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Cerrar drawer (solo móvil) */}
        <button
          onClick={() => setMobileNavOpen(false)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none">
        <div className="space-y-1.5">
          {navGroups.map((group) => {
            const isGroupOpen = !showLabels || group.label === activeGroupLabel || !collapsedGroups[group.label];
            return (
            <div key={group.label}>
              {showLabels ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="mb-0.5 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isGroupOpen ? "" : "-rotate-90"}`}
                  />
                </button>
              ) : (
                <div className="mb-1 h-px w-full bg-slate-100" />
              )}
              <div className={`space-y-0.5 overflow-hidden ${isGroupOpen ? "" : "hidden"}`}>
                {group.items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const c = colorMap[item.color ?? "slate"];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex items-center gap-3 overflow-hidden rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                        active
                          ? `${c.activeBg} ${c.activeText}`
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      } ${!showLabels ? "lg:justify-center lg:px-2" : ""}`}
                    >
                      {/* Active left bar */}
                      {active && (
                        <span className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r-full ${c.activeDot}`} />
                      )}
                      {/* Icon */}
                      <item.icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          active ? c.activeIcon : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                      {/* Label */}
                      {showLabels && <span className="flex-1 truncate">{item.label}</span>}
                      {/* Active dot */}
                      {active && showLabels && (
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.activeDot}`} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-slate-200 p-3">
        <div className={`flex items-center gap-3 rounded-lg px-2 py-2 ${!showLabels ? "justify-center" : ""}`}>
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-[11px] font-extrabold text-white shadow">
            Z
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-slate-800">Zyteron Admin</p>
              <p className="truncate text-[10px] text-slate-400">{siteConfig.contact.email}</p>
            </div>
          )}
        </div>
        <div className={`mt-1 flex gap-1 ${!showLabels ? "flex-col items-center" : ""}`}>
          <Link
            href="/"
            target="_blank"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
            title="Ver sitio"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {showLabels && "Ver sitio"}
          </Link>
          <form action="/admin/logout" method="post" className="flex flex-1">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600"
              title="Salir"
            >
              <LogOut className="h-3.5 w-3.5" />
              {showLabels && "Salir"}
            </button>
          </form>
        </div>
      </div>
      </aside>
    </>
  );
}

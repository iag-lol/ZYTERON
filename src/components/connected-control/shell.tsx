"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  CircleGauge,
  ChartNoAxesCombined,
  Building2,
  BriefcaseBusiness,
  Landmark,
  FileStack,
  Headphones,
  ShieldCheck,
} from "lucide-react";
const groups = [
  {
    id: "control",
    label: "Centro de control",
    icon: CircleGauge,
    items: [
      ["Resumen ejecutivo", ""],
      ["Entradas de la web", "entradas"],
      ["Actividad", "actividad"],
    ],
  },
  {
    id: "commercial",
    label: "Comercial",
    icon: ChartNoAxesCombined,
    items: [
      ["CRM y contactos", "contactos"],
      ["Cotizaciones", "cotizaciones"],
    ],
  },
  {
    id: "clients",
    label: "Clientes",
    icon: Building2,
    items: [
      ["Cliente 360°", "clientes"],
      ["Servicios contratados", "servicios"],
      ["Agenda compartida", "agenda"],
    ],
  },
  {
    id: "operations",
    label: "Operaciones",
    icon: BriefcaseBusiness,
    items: [["Proyectos", "proyectos"]],
  },
  { id: "finance", label: "Finanzas", icon: Landmark, items: [["Cobros y pagos", "finanzas"]] },
  {
    id: "documents",
    label: "Documentos",
    icon: FileStack,
    items: [["Repositorio de clientes", "documentos"]],
  },
  {
    id: "support",
    label: "Atención y soporte",
    icon: Headphones,
    items: [
      ["Conversaciones de la web", "conversaciones"],
      ["Asistencia técnica", "asistencia"],
    ],
  },
  {
    id: "security",
    label: "Seguridad",
    icon: ShieldCheck,
    items: [["Registro de auditoría", "auditoria"]],
  },
];
export function ControlShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    [collapsed, setCollapsed] = useState(false),
    [mobileOpen, setMobileOpen] = useState(false),
    [openGroups, setOpenGroups] = useState(() => new Set(groups.map((g) => g.id))),
    [query, setQuery] = useState("");
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen]);
  const href = (s: string) => (s ? `/administracion/control/${s}` : "/administracion");
  const active =
    groups.flatMap((g) => g.items).find(([, s]) => href(s) === pathname)?.[0] ||
    "Centro de control";
  const toggle = (id: string) =>
    setOpenGroups((v) => {
      const n = new Set(v);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <div
      className={`enterpriseShell ${collapsed ? "isCollapsed" : ""}`}
      data-experience="zyteron-control"
    >
      {mobileOpen && (
        <button
          className="mobileScrim"
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        id="control-nav-menu"
        className={`enterpriseSidebar ${mobileOpen ? "mobileOpen" : ""}`}
      >
        <div className="sidebarBrandRow">
          <Link className="brand" href="/administracion" onClick={() => setMobileOpen(false)}>
            <span className="brandMark">Z</span>
            {!collapsed && (
              <span className="brandCopy">
                <strong>Zyteron</strong>
                <small>Control</small>
              </span>
            )}
          </Link>
          <button
            className="collapseButton"
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir navegación" : "Colapsar navegación"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <nav className="enterpriseNav" aria-label="Módulos de Zyteron Control">
          {groups.map((g) => {
            const Icon = g.icon,
              isOpen = openGroups.has(g.id),
              hasActive = g.items.some(([, s]) => href(s) === pathname);
            return (
              <section className={`navGroup ${hasActive ? "hasActive" : ""}`} key={g.id}>
                <button
                  className="navGroupButton"
                  type="button"
                  title={collapsed ? g.label : undefined}
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      setOpenGroups((v) => new Set([...v, g.id]));
                    } else toggle(g.id);
                  }}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  {!collapsed && (
                    <>
                      <span>{g.label}</span>
                      <ChevronDown className={isOpen ? "rotated" : ""} size={14} />
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="navSubmenu">
                    {g.items.map(([title, s]) => (
                      <Link
                        className={href(s) === pathname ? "active" : ""}
                        href={href(s)}
                        key={s}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span>{title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </nav>
        <div className="sidebarIdentity">
          <span className="avatar">ZY</span>
          {!collapsed && (
            <span>
              <strong>Equipo Zyteron</strong>
              <small>Acceso administrativo</small>
            </span>
          )}
        </div>
      </aside>
      <div className="enterpriseWorkspace">
        <header className="enterpriseTopbar">
          <div className="topbarContext">
            <button
              className="mobileMenuButton"
              type="button"
              aria-label="Abrir navegación"
              aria-expanded={mobileOpen}
              aria-controls="control-nav-menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <p>Zyteron Control</p>
              <strong>{active}</strong>
            </div>
          </div>
          <div className="topbarActions">
            <form className="globalSearchWrap" action="/administracion/control/clientes">
              <label className="globalSearch">
                <Search size={16} />
                <input
                  name="buscar"
                  aria-label="Buscar clientes"
                  placeholder="Buscar clientes, empresas o correo"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </form>
            <Link
              className="notificationButton"
              href="/administracion/control/entradas"
              aria-label="Entradas pendientes"
            >
              <Bell size={18} />
            </Link>
            <div className="roleSwitcher authenticatedRole">
              <span className="avatar small">ZY</span>
              <span className="roleSwitcherText">
                <strong>Administración</strong>
                <small>Sesión verificada</small>
              </span>
              <form action="/administracion/logout" method="post">
                <button type="submit" aria-label="Cerrar sesión">
                  <LogOut size={15} />
                </button>
              </form>
            </div>
          </div>
        </header>
        <div className="enterpriseContent">{children}</div>
      </div>
    </div>
  );
}

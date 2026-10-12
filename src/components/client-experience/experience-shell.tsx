"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CircleUser,
  CreditCard,
  FileText,
  FolderOpen,
  Globe,
  Headphones,
  Home,
  Layers3,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { ExperienceBrand } from "./brand";
import { experienceSections } from "./sections";
const icons = {
  home: Home,
  services: Layers3,
  projects: BriefcaseBusiness,
  wallet: Wallet,
  payments: CreditCard,
  contracts: FileText,
  documents: FolderOpen,
  security: ShieldCheck,
  support: Headphones,
  monitor: Globe,
  reports: ChartNoAxesCombined,
  calendar: CalendarDays,
  notifications: Bell,
  company: Building2,
  profile: CircleUser,
};
export function ExperienceShell({
  children,
  name,
  company,
  unreadCount,
  isAdmin = false,
}: {
  children: React.ReactNode;
  name: string;
  company: string;
  unreadCount: number;
  isAdmin?: boolean;
}) {
  const pathname = usePathname(),
    menuRef = useRef<HTMLButtonElement>(null),
    searchRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [unread, setUnread] = useState(unreadCount),
    [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ title: string; path: string; subtitle: string }>>(
    [],
  );
  const current =
    experienceSections.find((s) => pathname === "/clientes/panel" + s.path)?.label || "Tu espacio";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  useEffect(() => {
    const media = window.matchMedia("(max-width:760px)");
    const change = () => setMobile(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.showModal();
      }
      if (e.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      void fetch("/api/portal/search?q=" + encodeURIComponent(query), { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((v) => setResults(v.results || []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  useEffect(() => {
    const timer = setInterval(() => {
      void fetch("/api/portal/notifications", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => {
          if (v) setUnread(v.unreadCount || 0);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="portal-shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <button
        className={`sidebar-backdrop ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-label="Cerrar menú"
      />
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        inert={mobile && !open}
        aria-label="Navegación del portal"
      >
        <div className="sidebar-brand">
          <Link href="/clientes/panel">
            <ExperienceBrand />
          </Link>
          <button
            className="mobile-toggle icon-button"
            aria-label="Cerrar menú"
            onClick={() => {
              setOpen(false);
              menuRef.current?.focus();
            }}
          >
            <X size={20} />
          </button>
        </div>
        <Link href="/clientes/panel/empresa" className="organization">
          <span className="org-symbol">
            {(company || name)[0]}
            <span>↗</span>
          </span>
          <span>
            <b>{company || name}</b>
            <small>Tu cuenta en Zyteron</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal">
          {experienceSections.map((s) => {
            const Icon = icons[s.icon as keyof typeof icons],
              href = "/clientes/panel" + s.path;
            return (
              <div key={s.path}>
                {s.group && <p className="nav-group">{s.group}</p>}
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`nav-item ${pathname === href ? "active" : ""}`}
                  aria-current={pathname === href ? "page" : undefined}
                >
                  <Icon size={18} />
                  <span>{s.label}</span>
                  {s.icon === "notifications" && unread > 0 && (
                    <span className="nav-count">{unread}</span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">
              <Headphones size={20} />
            </span>
            <b>Tu equipo, a un clic.</b>
            <p>Conversemos sobre lo que necesitas.</p>
            <Link href="/clientes/panel/asistencia">
              Hablemos <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link className="profile-switch" href="/clientes/panel/perfil">
            <span className="avatar profile-avatar">{initials}</span>
            <span>
              <b>{name}</b>
              <small>Cuenta verificada</small>
            </span>
            <Settings2 size={17} />
          </Link>
          <button
            className="experience-logout"
            onClick={() => void signOut({ callbackUrl: "/clientes/login" })}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
          {isAdmin && (
            <Link className="experience-logout" href="/administracion">
              Administración ↗
            </Link>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              ref={menuRef}
              className="mobile-toggle icon-button"
              aria-label="Abrir menú"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu size={20} />
            </button>
            <span className="mobile-brand">
              zyteron<span>.</span>
            </span>
            <span className="desktop-crumb">Tu espacio ›</span>
            <b>{current}</b>
          </div>
          <div className="top-actions">
            <button
              className="search-trigger"
              aria-label="Buscar en tu portal"
              onClick={() => searchRef.current?.showModal()}
            >
              <Search size={17} />
              <span>Buscar en tu portal</span>
              <kbd>⌘ K</kbd>
            </button>
            <Link
              className="icon-button notification-button"
              href="/clientes/panel/notificaciones"
              aria-label={`Notificaciones: ${unread} sin leer`}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </Link>
            <span className="top-divider" />
            <Link
              className="avatar profile-avatar"
              href="/clientes/panel/perfil"
              aria-label="Mi perfil"
            >
              {initials}
            </Link>
          </div>
        </header>
        <div className="experience-status">
          <span>
            <ShieldCheck size={13} /> Cuenta verificada · Espacio privado
          </span>
          <Link href="/">Volver al sitio ↗</Link>
        </div>
        <main id="main-content" tabIndex={-1} className="experience-main portal-module">
          {children}
          <footer className="portal-footer">
            <span>Hecho para avanzar contigo. zyteron.</span>
            <Link href="/clientes/panel/asistencia">Estamos para ayudarte ↗</Link>
          </footer>
        </main>
      </div>
      <nav className="mobile-navigation" aria-label="Navegación móvil">
        {[
          experienceSections[0],
          experienceSections[2],
          experienceSections[4],
          experienceSections[8],
        ].map((s) => {
          const Icon = icons[s.icon as keyof typeof icons],
            href = "/clientes/panel" + s.path;
          return (
            <Link key={s.path} href={href} aria-current={pathname === href ? "page" : undefined}>
              <Icon size={19} />
              {s.label.split(" ")[0]}
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)} aria-label="Más secciones">
          <Menu size={19} />
        </button>
      </nav>
      <dialog
        ref={searchRef}
        className="modal"
        aria-labelledby="portal-search-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) searchRef.current?.close();
        }}
      >
        <div className="modal-heading">
          <h2 id="portal-search-title">Busca en tu espacio</h2>
          <button
            className="icon-button"
            aria-label="Cerrar búsqueda"
            onClick={() => searchRef.current?.close()}
          >
            <X />
          </button>
        </div>
        <div className="modal-content">
          <label htmlFor="portal-search">Proyectos, documentos y secciones</label>
          <input
            id="portal-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            className="form-input"
          />
          {experienceSections
            .filter((s) => s.label.toLowerCase().includes(query.toLowerCase()))
            .map((s) => (
              <Link
                key={s.path}
                className="document-row"
                href={"/clientes/panel" + s.path}
                onClick={() => searchRef.current?.close()}
              >
                {s.label} ↗
              </Link>
            ))}
          {results.map((r) => (
            <Link
              key={r.path + r.title}
              className="document-row"
              href={r.path}
              onClick={() => searchRef.current?.close()}
            >
              <span>
                <b>{r.title}</b>
                <small>{r.subtitle}</small>
              </span>
            </Link>
          ))}
        </div>
      </dialog>
    </div>
  );
}

"use client";
import { PortalCommunications } from "./communications";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import MonitoringPanel from "./monitoring-panel";
import BillingHub, { FlowCheckoutPreview } from "./billing-hub";
import HomeBilling from "./home-billing";
import { pendingBilling } from "@/lib/client-experience/pending-billing";
import {
  ArrowUpRight,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  Globe2,
  Headphones,
  House,
  Info,
  KeyRound,
  Layers3,
  Link2,
  LockKeyhole,
  Mail,
  Menu,
  MessageSquare,
  Monitor,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { presentation, money, civil, initials } from "./production-model";
import { csvCell as safeCsv } from "@/lib/client-experience/csv";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AccountTools, CredentialAccess } from "./secure-tools";

const icons: Record<string, LucideIcon> = {
  home: House,
  layers: Layers3,
  projects: BriefcaseBusiness,
  wallet: Wallet,
  card: CreditCard,
  contract: FileCheck2,
  file: FileText,
  key: KeyRound,
  message: MessageSquare,
  monitor: Monitor,
  chart: ChartNoAxesCombined,
  calendar: CalendarDays,
  bell: Bell,
  company: Building2,
  user: UserRound,
  globe: Globe2,
  mail: Mail,
  shield: ShieldCheck,
  link: Link2,
};
function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const Component = icons[name] || FolderOpen;
  return <Component size={size} strokeWidth={1.65} aria-hidden="true" />;
}
const sections = [
  { id: "inicio", label: "Inicio", icon: "home", group: "TU ESPACIO" },
  { id: "servicios", label: "Mis servicios", icon: "layers" },
  { id: "proyectos", label: "Proyectos", icon: "projects" },
  {
    id: "cuenta",
    label: "Estado de cuenta",
    icon: "wallet",
    group: "GESTIÓN & DOCUMENTOS",
  },
  { id: "pagos", label: "Pagos y facturas", icon: "card" },
  { id: "contratos", label: "Cotizaciones y contratos", icon: "contract" },
  { id: "documentos", label: "Documentos", icon: "file" },
  { id: "credenciales", label: "Credenciales", icon: "key" },
  {
    id: "asistencia",
    label: "Asistencia técnica",
    icon: "message",
    group: "ACOMPAÑAMIENTO",
  },
  { id: "monitoreo", label: "Monitoreo", icon: "monitor" },
  { id: "informes", label: "Informes y mantenciones", icon: "chart" },
  { id: "agenda", label: "Agenda", icon: "calendar" },
  { id: "notificaciones", label: "Notificaciones", icon: "bell" },
  {
    id: "empresa",
    label: "Mi empresa",
    icon: "company",
    group: "CONFIGURACIÓN",
  },
  { id: "perfil", label: "Mi perfil y seguridad", icon: "user" },
];
const descriptions: Record<string, string> = {
  servicios: "Tu ecosistema digital, en un solo lugar.",
  proyectos: "Cada avance nos acerca a tu próximo objetivo.",
  cuenta: "Una visión clara de tus obligaciones y movimientos.",
  pagos: "Consulta tus documentos de cobro y el estado de tus pagos.",
  contratos: "Acuerdos claros para construir juntos.",
  documentos: "Toda la información compartida con tu empresa.",
  credenciales: "Acceso controlado a tus recursos digitales.",
  asistencia: "Estamos aquí para acompañarte.",
  monitoreo: "Visibilidad sobre la operación de tus activos.",
  informes: "Conoce el trabajo detrás de tu continuidad.",
  agenda: "Tus próximos compromisos con Zyteron.",
  notificaciones: "Lo que está pasando en tu espacio.",
  empresa: "Las personas y los datos de tu organización.",
  perfil: "Tu información, tus preferencias y tu seguridad.",
};
type ModalState = { kind: string; id?: string } | null;

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "light" : ""}`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <path d="M4 6h27L15 23h16v7H4l16-17H4z" fill="currentColor" />
        <path d="M25 6h6v7h-6z" fill="#bbdf79" />
      </svg>
      <span>
        zyteron<span className="brand-dot">.</span>
        <small>PORTAL CLIENTE</small>
      </span>
    </div>
  );
}
function Badge({ children, tone = "green" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({
  icon = "file",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        <Icon name={icon} size={30} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      el?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  );
}
function ProjectArt({ variant = "forest" }: { variant?: string }) {
  return (
    <div className={`project-art ${variant}`} aria-hidden="true">
      <div className="art-grid" />
      <div className="art-orbit" />
      <div className="art-window">
        <div className="art-window-head">
          <i />
          <i />
          <i />
          <span>zyteron</span>
        </div>
        <div className="art-window-body">
          <small>{variant === "forest" ? "NUEVAS PERSPECTIVAS" : "TU OPERACIÓN, CONECTADA"}</small>
          <b>
            {variant === "forest" ? (
              <>
                Diseñado para
                <br />
                llegar más alto.
              </>
            ) : (
              <>
                Menos pasos.
                <br />
                Más posibilidades.
              </>
            )}
          </b>
          <span className="art-mini-button">
            {variant === "forest" ? "Conoce nuestra visión" : "Todo en un solo lugar"}{" "}
            <ArrowUpRight size={9} />
          </span>
          <div className="art-landscape" />
        </div>
      </div>
      <span className="art-tag">
        <Sparkles size={11} />{" "}
        {variant === "forest" ? "Una nueva identidad" : "Conexiones que simplifican"}
      </span>
    </div>
  );
}

export default function Portal({
  initialSection = "inicio",
  data,
}: {
  initialSection?: string;
  data: PortalData;
}) {
  const { services, projects, invoices, documents, tickets, notifications, events } =
    presentation(data);
  const router = useRouter();
  const REFERENCE_DATE = civil(data.asOf);
  const [calendarDay, calendarMonth, calendarYear] = REFERENCE_DATE.split("-").map(Number);
  const calendarEvents = events.filter((event) => event.date.slice(3) === REFERENCE_DATE.slice(3));
  const company = data.user.company || data.user.name;
  const accountInitials = initials(data.user.name);
  const pendingAccount = pendingBilling(data.invoices);
  const clpAccount = pendingAccount.totals.find((group) => group.currency === "CLP");
  const overdue = clpAccount?.overdue || 0;
  const balance = clpAccount?.balance || 0;
  const [busy, setBusy] = useState(false);
  async function send(url: string, body: unknown, method = "POST") {
    if (busy) return false;
    setBusy(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(body),
      });
      const value = await response.json();
      if (!response.ok)
        throw new Error(value.error || value.message || "No se pudo completar la solicitud.");
      router.refresh();
      setToast("Solicitud confirmada.");
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo conectar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const [section, setSection] = useState(
    sections.some((s) => s.id === initialSection) ? initialSection : "inicio",
  );
  useEffect(() => {
    if (!["inicio", "pagos", "cuenta"].includes(section)) return;
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
    };
  }, [section, router]);
  const [modal, setModal] = useState<ModalState>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [read, setRead] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [drafts, setDrafts] = useState<
    { id: string; title: string; body: string; service: string }[]
  >([]);
  const [supportDraft, setSupportDraft] = useState({
    title: "",
    body: "",
    service: services[0]?.name || "Asistencia general",
  });
  const [reply, setReply] = useState("");
  const [replyDrafts] = useState<Record<string, string>>({});
  const title = sections.find((s) => s.id === section)?.label || "Inicio";
  const unread = notifications.filter((n) => n.unread && !read.includes(n.id)).length;
  useEffect(() => {
    const sync = () => {
      const v = window.location.pathname.split("/")[3] || "inicio";
      setSection(sections.some((s) => s.id === v) ? v! : "inicio");
      setFilter("Todos");
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setModal({ kind: "search" });
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  function go(id: string) {
    setSection(id);
    setFilter("Todos");
    setModal(null);
    setQuery("");
    window.history.pushState({}, "", id === "inicio" ? "/clientes/panel" : `/clientes/panel/${id}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function notice(message: string) {
    setToast(message);
  }
  function blocked(id: string) {
    setModal({ kind: "blocked", id });
  }
  function nav() {
    return sections.map((s) => (
      <div key={s.id}>
        {s.group && <p className="nav-group">{s.group}</p>}
        <button
          className={`nav-item ${section === s.id ? "active" : ""}`}
          aria-current={section === s.id ? "page" : undefined}
          onClick={() => go(s.id)}
        >
          <Icon name={s.icon} />
          <span>{s.label}</span>
          {s.id === "asistencia" && (
            <span className="nav-count">
              {tickets.filter((t) => !["Resuelta", "Cerrada"].includes(t.status)).length}
            </span>
          )}
          {s.id === "notificaciones" && unread > 0 && <span className="nav-count">{unread}</span>}
        </button>
      </div>
    ));
  }
  function projectCard(p: (typeof projects)[number]) {
    return (
      <article className="project-card" key={p.id}>
        <ProjectArt variant={p.color} />
        <div className="project-body">
          <div className="project-meta">
            <span>{p.category}</span>
            <Badge tone={p.status === "DONE" ? "green" : "neutral"}>
              {p.status === "DONE" ? "Entregado" : "En curso"}
            </Badge>
          </div>
          <button className="title-link" onClick={() => setModal({ kind: "project", id: p.id })}>
            <h3>{p.short}</h3>
            <ArrowUpRight size={18} />
          </button>
          <p>{p.phase}</p>
          <div className="progress-label">
            <span>Avance publicado</span>
            <b>{p.progress === null ? "Sin avance publicado" : `${p.progress ?? 0}%`}</b>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={`Avance de ${p.short}`}
            aria-valuenow={p.progress ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              style={{
                width: `${p.progress === null ? "Sin avance publicado" : `${p.progress ?? 0}%`}`,
              }}
            />
          </div>
          <div className="project-footer">
            <div className="avatars" aria-label="Equipo del proyecto">
              {p.initials.map((a, i) => (
                <span key={a} className={`avatar av-${i}`}>
                  {a}
                </span>
              ))}
            </div>
            <span>
              <Clock3 size={13} /> {p.date}
            </span>
          </div>
        </div>
      </article>
    );
  }
  function eventRows() {
    return events.map((e) => (
      <button
        className="event-row"
        key={e.id}
        onClick={() => setModal({ kind: "event", id: e.id })}
      >
        <span className="event-day">
          <b>{e.day}</b>
          <small>{e.month}</small>
        </span>
        <span className="event-text">
          <b>{e.title}</b>
          <small>{e.description}</small>
          <span>
            <Clock3 size={12} />
            {e.time}
          </span>
        </span>
        <ChevronRight size={17} />
      </button>
    ));
  }
  function documentRows(list = documents) {
    return list.map((d) => (
      <button
        className="document-row"
        key={d.id}
        onClick={() => setModal({ kind: "document", id: d.id })}
      >
        <span className="document-icon">
          <FileText size={20} />
        </span>
        <span className="row-text">
          <b>{d.name}</b>
          <small>
            {d.type} · {d.version} · {d.date}
          </small>
        </span>
        <Badge tone={d.status === "Por revisar" ? "orange" : "neutral"}>{d.status}</Badge>
        <ChevronRight size={17} />
      </button>
    ));
  }
  function invoiceTable() {
    const list = invoices.filter((i) => filter === "Todos" || i.status === filter);
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Documento / concepto</th>
              <th>Vencimiento</th>
              <th>Importe CLP</th>
              <th>Estado</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id}>
                <td>
                  <button
                    className="table-link"
                    onClick={() => setModal({ kind: "invoice", id: i.id })}
                  >
                    {i.displayNumber} <ArrowUpRight size={13} />
                  </button>
                  <small>{i.concept}</small>
                </td>
                <td>
                  {i.due}
                  <small>{i.period}</small>
                </td>
                <td className="amount">
                  {i.amount}
                  <small>Saldo: {i.balance}</small>
                </td>
                <td>
                  <Badge
                    tone={
                      i.status === "Vencida"
                        ? "orange"
                        : i.status === "Pagada"
                          ? "green"
                          : "neutral"
                    }
                  >
                    {i.status}
                  </Badge>
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Ver cuenta ${i.displayNumber}`}
                    onClick={() => setModal({ kind: "invoice", id: i.id })}
                  >
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <Empty title="Sin documentos en este filtro" description="Prueba con otro estado." />
        )}
      </div>
    );
  }
  function tabs(values: string[]) {
    return (
      <div className="tabs" role="group" aria-label="Filtrar resultados">
        {values.map((f) => (
          <button
            aria-pressed={filter === f}
            className={filter === f ? "selected" : ""}
            key={f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
    );
  }
  function exportAccount() {
    const content =
      "Documento;Concepto;Moneda;Importe;Saldo;Vencimiento;Estado\r\n" +
      invoices
        .map((i) =>
          [i.id, i.concept, "CLP", i.amount, i.balance, i.due, i.status]
            .map((s) => safeCsv(String(s)))
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "estado-de-cuenta.csv";
    a.click();
    URL.revokeObjectURL(url);
    notice("Estado de cuenta descargado.");
  }

  return (
    <div className="portal-shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
        </div>
        <button className="organization" onClick={() => setModal({ kind: "organization" })}>
          <span className="org-symbol">
            {initials(company)}
            <span>↗</span>
          </span>
          <span>
            <b>{company}</b>
            <small>Tu empresa</small>
          </span>
          <ChevronDown size={16} />
        </button>
        <nav aria-label="Navegación principal">{nav()}</nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">
              <Headphones size={20} />
            </span>
            <b>Tu equipo, a un clic.</b>
            <p>Conversemos sobre lo que necesitas.</p>
            <button onClick={() => go("asistencia")}>
              Hablemos <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="profile-switch" onClick={() => go("perfil")}>
            <span className="avatar profile-avatar">{accountInitials}</span>
            <span>
              <b>{data.user.name}</b>
              <small>Cuenta verificada</small>
            </span>
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <span className="mobile-brand">
              zyteron<span>.</span>
            </span>
            <span className="desktop-crumb">
              Tu espacio <ChevronRight size={13} />
            </span>
            <b>{title}</b>
          </div>
          <div className="top-actions">
            <button
              className="search-trigger"
              aria-label="Buscar en tu portal"
              onClick={() => {
                setQuery("");
                setModal({ kind: "search" });
              }}
            >
              <Search size={17} />
              <span>Buscar en tu portal</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button notification-button"
              aria-label={`Notificaciones: ${unread} sin leer`}
              onClick={() => go("notificaciones")}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </button>
            <span className="top-divider" />
            <button
              className="avatar profile-avatar"
              aria-label="Mi perfil"
              onClick={() => go("perfil")}
            >
              {accountInitials}
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {section === "inicio" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">TU ESPACIO ZYTERON</p>
                  <h1>
                    Hola, {data.user.name.split(" ")[0]} <span className="greeting-spark">✳</span>
                  </h1>
                  <p>Todo lo que estamos construyendo juntos, aquí.</p>
                </div>
                <button className="button primary" onClick={() => setModal({ kind: "support" })}>
                  <Plus size={17} />
                  Nueva solicitud
                </button>
              </div>
              <HomeBilling
                data={data}
                onPayments={() => go("pagos")}
                onInvoice={(id) => {
                  go("pagos");
                  window.history.replaceState(
                    window.history.state,
                    "",
                    `/clientes/panel/pagos?cobro=${encodeURIComponent(id)}`,
                  );
                }}
              />
              <section className="welcome-banner">
                <div>
                  <span className="banner-label">
                    <span />
                    TECNOLOGÍA QUE TE ACOMPAÑA
                  </span>
                  <h2>
                    Tu negocio avanza.
                    <br />
                    <span>Nosotros vamos contigo.</span>
                  </h2>
                  <p>Una mirada a tus proyectos, servicios y próximos pasos.</p>
                  <button onClick={() => go("proyectos")}>
                    Exploremos tus proyectos <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="banner-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <svg viewBox="0 0 160 160">
                    <path d="M29 39h103L70 102h62v27H29l62-63H29z" fill="currentColor" />
                  </svg>
                  <span className="art-star">✳</span>
                  <span className="art-coordinate">JUNTOS, MÁS LEJOS ↗</span>
                </div>
              </section>
              <div className="stats-grid">
                {[
                  {
                    label: "Servicios activos",
                    value: String(services.filter((s) => s.status === "Activo").length).padStart(
                      2,
                      "0",
                    ),
                    icon: "layers",
                    foot: "Tu ecosistema digital",
                    section: "servicios",
                    tone: "green",
                  },
                  {
                    label: "Proyectos en curso",
                    value: String(
                      projects.filter((p) => p.status === "IN_PROGRESS").length,
                    ).padStart(2, "0"),
                    icon: "projects",
                    foot: "Ideas que toman forma",
                    section: "proyectos",
                    tone: "purple",
                  },
                  {
                    label: "Saldo pendiente · CLP",
                    value: money(balance),
                    icon: "wallet",
                    foot: clpAccount
                      ? `${clpAccount.count} ${clpAccount.count === 1 ? "cobro pendiente" : "cobros pendientes"}`
                      : "Sin cobros pendientes en CLP",
                    section: "pagos",
                    tone: "orange",
                  },
                  {
                    label: "Solicitudes abiertas",
                    value: String(
                      tickets.filter((t) => !["Resuelta", "Cerrada"].includes(t.status)).length,
                    ).padStart(2, "0"),
                    icon: "message",
                    foot: `${tickets.filter((t) => t.status === "Esperando tu respuesta").length} esperan tu respuesta`,
                    section: "asistencia",
                    tone: "blue",
                  },
                ].map((s) => (
                  <button className="stat-card" key={s.label} onClick={() => go(s.section)}>
                    <div>
                      <span>{s.label}</span>
                      <span className={`stat-icon ${s.tone}`}>
                        <Icon name={s.icon} />
                      </span>
                    </div>
                    <strong>{s.value}</strong>
                    <p>
                      {s.foot}
                      <ArrowUpRight size={14} />
                    </p>
                  </button>
                ))}
              </div>
              <section className="attention-section">
                <div className="section-heading">
                  <h2>
                    <span className="attention-dot" />
                    Requiere tu atención <span className="count-pill">{unread}</span>
                  </h2>
                  <span>Pequeños pasos para seguir avanzando</span>
                </div>
                <div className="attention-grid">
                  {notifications
                    .filter((n) => n.unread)
                    .slice(0, 3)
                    .map((n) => (
                      <button key={n.id} onClick={() => go(n.section)}>
                        <span className="attention-icon">
                          <Icon name={n.icon} />
                        </span>
                        <span>
                          <b>{n.title}</b>
                          <small>{n.text}</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  {!unread && <p className="subtle">No tienes avisos pendientes.</p>}
                </div>
              </section>
              <div className="home-columns">
                <section>
                  <div className="section-heading">
                    <div>
                      <h2>Proyectos en movimiento</h2>
                      <p>De una buena idea a un gran resultado.</p>
                    </div>
                    <button className="text-button" onClick={() => go("proyectos")}>
                      Ver todos <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="project-grid">{projects.slice(0, 2).map(projectCard)}</div>
                </section>
                <section className="agenda-card">
                  <div className="section-heading">
                    <h2>En tu agenda</h2>
                    <button
                      className="icon-button"
                      aria-label="Ver agenda"
                      onClick={() => go("agenda")}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {eventRows()}
                  <button className="agenda-all" onClick={() => go("agenda")}>
                    Ver mi agenda <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className="home-columns bottom-columns">
                <section className="panel">
                  <div className="section-heading">
                    <h2>Últimos documentos</h2>
                    <button className="text-button" onClick={() => go("documentos")}>
                      Ver todos <ArrowRight size={15} />
                    </button>
                  </div>
                  {documentRows(documents.slice(0, 3))}
                </section>
                <section className="contact-card">
                  <span className="eyebrow">PERSONAS DETRÁS DE LA TECNOLOGÍA</span>
                  <h2>
                    Un equipo que
                    <br />
                    conoce tu negocio.
                  </h2>
                  <p>Tu responsable de atención te acompaña en cada paso.</p>
                  <div className="contact-person">
                    <span className="avatar camila-avatar">ZY</span>
                    <span>
                      <b>Equipo Zyteron</b>
                      <small>Atención al cliente</small>
                    </span>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setModal({ kind: "support" })}
                  >
                    Conversemos <MessageSquare size={16} />
                  </button>
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{company} · TU ESPACIO</p>
                  <h1>{title}</h1>
                  <p>{descriptions[section]}</p>
                </div>
                {section === "asistencia" ? (
                  <button className="button primary" onClick={() => setModal({ kind: "support" })}>
                    <Plus size={17} />
                    Nueva solicitud
                  </button>
                ) : section === "cuenta" ? (
                  <button className="button secondary" onClick={exportAccount}>
                    <Download size={16} />
                    Exportar CSV
                  </button>
                ) : section === "documentos" ? (
                  <button
                    className="button secondary"
                    onClick={() => blocked("La carga de archivos")}
                  >
                    <Plus size={17} />
                    Compartir archivo
                  </button>
                ) : section === "agenda" ? (
                  <button className="button primary" onClick={() => setModal({ kind: "support" })}>
                    <CalendarDays size={17} />
                    Solicitar reunión
                  </button>
                ) : section === "notificaciones" ? (
                  <button
                    className="button secondary"
                    onClick={() => {
                      void send("/api/portal/notifications/read", {
                        ids: notifications.map((n) => n.id),
                      }).then((ok) => {
                        if (ok) setRead(notifications.map((n) => n.id));
                      });
                    }}
                  >
                    <CheckCheck size={17} />
                    Marcar todas como leídas
                  </button>
                ) : null}
              </div>
              {section === "servicios" && (
                <>
                  <div className="section-intro">
                    <span>
                      <Layers3 size={19} />
                      {services.length} servicios contratados
                    </span>
                    <p>Precios y alcance acordados · Cada moneda se presenta por separado</p>
                  </div>
                  <div className="services-grid">
                    {services.map((s) => (
                      <article className="service-card" key={s.id}>
                        <div className="service-top">
                          <span className={`service-icon ${s.color}`}>
                            <Icon name={s.icon} size={25} />
                          </span>
                          <Badge>{s.status}</Badge>
                        </div>
                        <p className="eyebrow">{s.category}</p>
                        <h2>{s.name}</h2>
                        <p>{s.description}</p>
                        <div className="service-resource">
                          <Icon name={s.icon} size={15} />
                          {s.domain}
                        </div>
                        <div className="service-price">
                          <b>{s.price}</b>
                          <span>{s.period}</span>
                        </div>
                        <div className="service-bottom">
                          <span>
                            Renovación <b>{s.renewal}</b>
                          </span>
                          <button
                            className="text-button"
                            onClick={() => setModal({ kind: "service", id: s.id })}
                          >
                            Ver servicio <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="soft-banner">
                    <span className="service-icon green">
                      <Sparkles size={24} />
                    </span>
                    <div>
                      <h3>Tu próximo desafío también tiene espacio aquí.</h3>
                      <p>Conversemos sobre lo que tu empresa necesita para crecer.</p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => setModal({ kind: "support" })}
                    >
                      Solicitar un cambio <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
              {section === "proyectos" && (
                <>
                  {tabs(["Todos", "En curso", "Entregados"])}
                  <div className="project-grid full-projects">
                    {projects
                      .filter(
                        (p) =>
                          filter === "Todos" ||
                          (filter === "En curso"
                            ? p.status === "IN_PROGRESS"
                            : p.status === "DONE"),
                      )
                      .map(projectCard)}
                  </div>
                  <p className="source-note">
                    Avance disponible únicamente cuando el equipo publica mediciones del proyecto.
                  </p>
                </>
              )}
              {section === "pagos" && (
                <BillingHub
                  data={data}
                  onHelp={() => setModal({ kind: "support" })}
                  onQuote={(id) => setModal({ kind: "quote", id })}
                  onPay={(id) => setModal({ kind: "flow", id })}
                />
              )}
              {section === "cuenta" && (
                <>
                  <div className="finance-overview">
                    <div className="balance-card">
                      <span className="eyebrow">SALDO PENDIENTE · CLP</span>
                      <strong>
                        {money(balance)}
                        <span>CLP</span>
                      </strong>
                      <p>
                        {data.invoices.filter((i) => i.balance > 0).length} obligaciones pendientes
                      </p>
                      <div>
                        <span>
                          Vencido <b>{money(overdue)}</b>
                        </span>
                        <span>
                          Por vencer <b>{money(balance - overdue)}</b>
                        </span>
                      </div>
                      <button
                        className="button lime"
                        disabled={!invoices.some((i) => i.payable)}
                        onClick={() =>
                          setModal({ kind: "flow", id: invoices.find((i) => i.payable)?.id })
                        }
                      >
                        Revisar opciones de pago <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <div className="finance-info">
                      <span className="service-icon green">
                        <ShieldCheck size={26} />
                      </span>
                      <h2>Todo claro, desde el origen.</h2>
                      <p>
                        Tus saldos se calculan a partir de las obligaciones registradas y los pagos
                        confirmados.
                      </p>
                      <div className="finance-small">
                        <span>
                          Pagos confirmados <b>{data.payments.length}</b>
                        </span>
                        <span>
                          Saldo pendiente <b>{money(balance)}</b>
                        </span>
                      </div>
                    </div>
                  </div>
                  <section className="panel finance-panel">
                    <div className="section-heading">
                      <h2>
                        {section === "cuenta"
                          ? "Obligaciones y movimientos"
                          : "Documentos y cobros"}
                      </h2>
                      <span>
                        <SlidersHorizontal size={15} />
                        Filtrar por estado
                      </span>
                    </div>
                    {tabs(["Todos", "Vencida", "Pendiente", "Pagada"])}
                    {invoiceTable()}
                  </section>
                  <p className="source-note">
                    El comprobante de pago se descarga únicamente después de confirmar la
                    transacción. No es una boleta tributaria.
                  </p>
                </>
              )}
              {section === "documentos" && (
                <>
                  <div className="document-toolbar">
                    {tabs(["Todos", "Entregable", "Contrato", "Informe", "Manual"])}
                    <label className="inline-search">
                      <Search size={17} />
                      <input
                        placeholder="Buscar documento…"
                        aria-label="Buscar documento"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  <section className="panel document-panel">
                    {documentRows(
                      documents.filter(
                        (d) =>
                          (filter === "Todos" || d.type === filter) &&
                          d.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
                      ),
                    )}
                    {documents.filter(
                      (d) =>
                        (filter === "Todos" || d.type === filter) &&
                        d.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
                    ).length === 0 && (
                      <Empty
                        title="No encontramos ese documento"
                        description="Prueba otro nombre o cambia el filtro."
                      />
                    )}
                  </section>
                  <div className="info-note">
                    <LockKeyhole size={17} />
                    Solo se compartirán documentos publicados y autorizados para tu empresa.
                  </div>
                </>
              )}
              {section === "asistencia" && (
                <>
                  <PortalCommunications messages={data.communications} />
                  <div className="support-banner">
                    <span>
                      <Headphones size={32} />
                    </span>
                    <div>
                      <h2>Detrás de cada solución hay una conversación.</h2>
                      <p>
                        Cuéntanos qué necesitas. Tus solicitudes tendrán seguimiento en este
                        espacio.
                      </p>
                    </div>
                    <Badge tone="neutral">Cuenta conectada</Badge>
                  </div>
                  {tabs(["Todos", "En curso", "Esperando tu respuesta", "Resuelta", "Borradores"])}
                  <div className="ticket-list">
                    {filter !== "Borradores" &&
                      tickets
                        .filter((t) => filter === "Todos" || t.status === filter)
                        .map((t) => (
                          <button
                            className="ticket-row"
                            key={t.id}
                            onClick={() => {
                              setReply(replyDrafts[t.id] || "");
                              setModal({ kind: "ticket", id: t.id });
                            }}
                          >
                            <span className="ticket-symbol">
                              <MessageSquare size={21} />
                            </span>
                            <span className="row-text">
                              <small>
                                {t.id} · {t.category}
                              </small>
                              <b>{t.title}</b>
                              <small>
                                {t.service} · {t.date}
                              </small>
                            </span>
                            <Badge
                              tone={
                                t.status === "Esperando tu respuesta"
                                  ? "orange"
                                  : t.status === "Resuelta"
                                    ? "green"
                                    : "neutral"
                              }
                            >
                              {t.status}
                            </Badge>
                            <ChevronRight size={19} />
                          </button>
                        ))}
                    {(filter === "Todos" || filter === "Borradores") &&
                      drafts.map((d) => (
                        <button
                          className="ticket-row"
                          key={d.id}
                          onClick={() => setModal({ kind: "draft", id: d.id })}
                        >
                          <span className="ticket-symbol">
                            <FileText size={21} />
                          </span>
                          <span className="row-text">
                            <small>{d.id} · Solo en esta vista</small>
                            <b>{d.title}</b>
                            <small>{d.service}</small>
                          </span>
                          <Badge tone="neutral">Borrador · No enviado</Badge>
                          <ChevronRight size={19} />
                        </button>
                      ))}
                    {filter === "Borradores" && !drafts.length && (
                      <Empty
                        title="Todavía no tienes borradores"
                        description="Prueba el formulario de nueva solicitud. No se enviará a Soporte."
                        action={
                          <button
                            className="button primary"
                            onClick={() => setModal({ kind: "support" })}
                          >
                            Crear borrador
                          </button>
                        }
                      />
                    )}
                  </div>
                  <p className="source-note">
                    Tus conversaciones quedan registradas en esta cuenta.
                  </p>
                </>
              )}
              {section === "contratos" && (
                <>
                  {data.contracts.length ? (
                    <section className="panel portal-communications">
                      <h2>Contratos publicados</h2>
                      <div className="communication-history">
                        {data.contracts.map((c) => (
                          <article key={c.id}>
                            <small>{c.number}</small>
                            <h3>{c.title}</h3>
                            <p>
                              Estado: {c.status} · Firma: {c.signature} · Vigencia: {c.effective}
                            </p>
                            <p>
                              {c.start ? civil(c.start.slice(0, 10) + "T12:00:00Z") : "Sin inicio"}{" "}
                              — {c.end ? civil(c.end.slice(0, 10) + "T12:00:00Z") : "Indefinido"} ·{" "}
                              {money(c.total, c.currency)}
                            </p>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  {tabs(["Todos", "Cotizaciones", "Contratos"])}
                  <div className="agreements-grid">
                    {(filter === "Todos" || filter === "Cotizaciones") &&
                      data.quotes.map((q) => (
                        <article className="agreement-card" key={q.id}>
                          <div className="service-top">
                            <span className="service-icon orange">
                              <FileCheck2 size={27} />
                            </span>
                            <Badge tone="neutral">{q.status}</Badge>
                          </div>
                          <span className="eyebrow">COTIZACIÓN · {q.number}</span>
                          <h2>{q.title}</h2>
                          <dl>
                            <div>
                              <dt>Importe acordado</dt>
                              <dd>
                                {new Intl.NumberFormat("es-CL", {
                                  style: "currency",
                                  currency: q.currency === "UF" ? "CLF" : q.currency,
                                }).format(q.total)}{" "}
                                {q.currency}
                              </dd>
                            </div>
                            <div>
                              <dt>Fecha</dt>
                              <dd>{civil(q.createdAt)}</dd>
                            </div>
                          </dl>
                          {q.pdfUrl ? (
                            <a className="button secondary" href={q.pdfUrl} download>
                              Descargar propuesta <Download size={16} />
                            </a>
                          ) : (
                            <p className="source-note">
                              Documento disponible al completar su publicación.
                            </p>
                          )}
                          {q.payable && (
                            <FlowCheckoutPreview
                              document={q.number + " · " + q.title}
                              amount={money(q.total)}
                              quote={q}
                            />
                          )}
                        </article>
                      ))}
                    {(filter === "Todos" || filter === "Contratos") &&
                      documents
                        .filter((d) => d.type === "Contrato")
                        .map((d) => (
                          <article className="agreement-card" key={d.id}>
                            <div className="service-top">
                              <span className="service-icon green">
                                <ShieldCheck size={27} />
                              </span>
                              <Badge tone="neutral">{d.status}</Badge>
                            </div>
                            <h2>{d.name}</h2>
                            <p>{d.project}</p>
                            <button
                              className="button secondary"
                              onClick={() => setModal({ kind: "document", id: d.id })}
                            >
                              Ver contrato <ArrowUpRight size={16} />
                            </button>
                          </article>
                        ))}
                    {!data.quotes.length && !documents.some((d) => d.type === "Contrato") && (
                      <Empty
                        title="Aún no hay propuestas publicadas"
                        description="Tus cotizaciones y contratos aparecerán aquí."
                      />
                    )}
                  </div>
                  <div className="info-note">
                    <ShieldCheck size={18} />
                    Aceptar o firmar requiere facultades verificadas y un proveedor operativo.
                  </div>
                </>
              )}
              {section === "credenciales" && (
                <section className="panel">
                  {data.credentials.length ? (
                    data.credentials.map((c) => (
                      <button
                        className="document-row"
                        key={c.id}
                        onClick={() => setModal({ kind: "credential", id: c.id })}
                      >
                        <span className="document-icon">
                          <KeyRound size={20} />
                        </span>
                        <span className="row-text">
                          <b>{c.name}</b>
                          <small>
                            {c.access.allowed
                              ? "Disponible con verificación"
                              : "Bloqueada hasta completar pago y vinculación"}
                          </small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))
                  ) : (
                    <Empty
                      icon="key"
                      title="Tus accesos, bajo control"
                      description="Aún no hay credenciales publicadas para tu cuenta."
                      action={
                        <button
                          className="button primary"
                          onClick={() => setModal({ kind: "support" })}
                        >
                          Solicitar acceso <ArrowRight size={16} />
                        </button>
                      }
                    />
                  )}
                  <div className="security-features">
                    <span>
                      <LockKeyhole size={19} />
                      Acceso por recurso
                    </span>
                    <span>
                      <ShieldCheck size={19} />
                      Verificación adicional
                    </span>
                    <span>
                      <Clock3 size={19} />
                      Visualización temporal
                    </span>
                  </div>
                </section>
              )}
              {section === "monitoreo" && <MonitoringPanel initial={data.monitors} />}
              {section === "informes" && (
                <>
                  <div className="report-feature">
                    <span className="service-icon green">
                      <ChartNoAxesCombined size={30} />
                    </span>
                    <div>
                      <p className="eyebrow">MANTENCIÓN PREVENTIVA</p>
                      <h2>El trabajo que mantiene tu negocio en movimiento.</h2>
                      <p>Acciones documentadas, revisiones y próximos pasos en un informe claro.</p>
                    </div>
                  </div>
                  <section className="panel">
                    {documentRows(documents.filter((d) => d.type === "Informe"))}
                  </section>
                  <section className="panel upcoming-maintenance">
                    <CalendarDays size={21} />
                    <div>
                      <h3>Próxima mantención</h3>
                      <p>No hay una fecha real publicada en esta vista.</p>
                    </div>
                    <button className="text-button" onClick={() => setModal({ kind: "support" })}>
                      Consultar al equipo <ArrowRight size={16} />
                    </button>
                  </section>
                </>
              )}
              {section === "agenda" && (
                <>
                  <div className="agenda-layout">
                    <section className="panel calendar-panel">
                      <div className="calendar-header">
                        <h2>
                          {new Intl.DateTimeFormat("es-CL", {
                            month: "long",
                            year: "numeric",
                            timeZone: "America/Santiago",
                          }).format(new Date(data.asOf))}
                        </h2>
                        <Badge tone="neutral">Agenda publicada</Badge>
                      </div>
                      <div className="calendar-week">
                        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                          <span key={i}>{d}</span>
                        ))}
                      </div>
                      <div className="calendar-grid">
                        {Array.from(
                          {
                            length: (new Date(calendarYear, calendarMonth - 1, 1).getDay() + 6) % 7,
                          },
                          (_, i) => (
                            <span key={`blank-${i}`} className="calendar-blank" />
                          ),
                        )}
                        {Array.from(
                          {
                            length: new Date(calendarYear, calendarMonth, 0).getDate(),
                          },
                          (_, i) => i + 1,
                        ).map((d) => (
                          <button
                            key={d}
                            className={`${d === calendarDay ? "today" : ""} ${calendarEvents.some((e) => Number(e.day) === d) ? "has-event" : ""}`}
                            aria-label={`${String(d).padStart(2, "0")}-${REFERENCE_DATE.slice(3)}${calendarEvents.some((e) => Number(e.day) === d) ? ", con compromiso publicado" : ""}`}
                            onClick={() => {
                              const e = calendarEvents.find((e) => Number(e.day) === d);
                              if (e) setModal({ kind: "event", id: e.id });
                              else
                                notice(
                                  `Sin compromisos publicados el ${String(d).padStart(2, "0")}-${REFERENCE_DATE.slice(3)}.`,
                                );
                            }}
                          >
                            {d}
                            {calendarEvents.some((e) => Number(e.day) === d) && <i />}
                          </button>
                        ))}
                      </div>
                      <p className="source-note">
                        Fecha de referencia: {REFERENCE_DATE} · America/Santiago
                      </p>
                    </section>
                    <section className="agenda-card">
                      <div className="section-heading">
                        <h2>Próximos compromisos</h2>
                      </div>
                      {eventRows()}
                    </section>
                  </div>
                  <div className="info-note">
                    <CalendarDays size={17} />
                    Una solicitud de reunión se confirmará después de verificar disponibilidad.
                  </div>
                </>
              )}
              {section === "notificaciones" && (
                <>
                  {tabs(["Todos", "Sin leer"])}
                  <section className="panel notifications-panel">
                    {notifications
                      .filter((n) => filter === "Todos" || (n.unread && !read.includes(n.id)))
                      .map((n) => (
                        <div
                          className={`notification-row ${n.unread && !read.includes(n.id) ? "unread" : ""}`}
                          key={n.id}
                        >
                          <span className="document-icon">
                            <Icon name={n.icon} />
                          </span>
                          <button
                            className="row-text"
                            onClick={() => {
                              setRead((r) => [...r, n.id]);
                              go(n.section);
                            }}
                          >
                            <b>{n.title}</b>
                            <p>{n.text}</p>
                            <small>{n.time}</small>
                          </button>
                          {n.unread && !read.includes(n.id) && (
                            <button
                              className="icon-button"
                              aria-label={`Marcar como leída: ${n.title}`}
                              onClick={() => setRead((r) => [...r, n.id])}
                            >
                              <Check size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    {filter === "Sin leer" && unread === 0 && (
                      <Empty
                        icon="bell"
                        title="Estás al día"
                        description="No tienes avisos sin leer."
                      />
                    )}
                  </section>
                  <p className="source-note">
                    Avisos publicados para tu cuenta ni envío de mensajes.
                  </p>
                </>
              )}
              {section === "empresa" && (
                <>
                  <div className="company-header">
                    <span className="company-mark">{initials(company)}↗</span>
                    <div>
                      <p className="eyebrow">TU EMPRESA</p>
                      <h2>{company}</h2>
                      <p>Construyendo nuevas perspectivas.</p>
                    </div>
                    <Badge tone="neutral">Cuenta conectada</Badge>
                  </div>
                  <div className="company-columns">
                    <section className="panel">
                      <h2>Datos de la empresa</h2>
                      <dl className="detail-list">
                        <div>
                          <dt>Razón social</dt>
                          <dd>{company}</dd>
                        </div>
                        <div>
                          <dt>Identificación tributaria</dt>
                          <dd>{data.user.rut || "No configurada"}</dd>
                        </div>
                        <div>
                          <dt>Correo de contacto</dt>
                          <dd>{data.user.email}</dd>
                        </div>
                        <div>
                          <dt>País / zona horaria</dt>
                          <dd>Chile · America/Santiago</dd>
                        </div>
                      </dl>
                      <button
                        className="button secondary"
                        onClick={() => setModal({ kind: "support" })}
                      >
                        Solicitar actualización <ArrowUpRight size={16} />
                      </button>
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <h2>Personas de tu equipo</h2>
                        <button
                          className="icon-button"
                          aria-label="Invitar miembro"
                          onClick={() => blocked("La gestión de miembros")}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <div className="member-row">
                        <span className="avatar">{accountInitials}</span>
                        <span>
                          <b>{data.user.name}</b>
                          <small>Usuario de esta cuenta</small>
                        </span>
                      </div>
                      <p className="source-note">
                        Consulta al equipo para habilitar otros contactos.
                      </p>
                    </section>
                  </div>
                </>
              )}
              {section === "perfil" && (
                <>
                  <div className="profile-header">
                    <span className="avatar profile-large">{accountInitials}</span>
                    <div>
                      <h2>{data.user.name}</h2>
                      <p>{data.user.email}</p>
                      <Badge tone="neutral">Cuenta verificada</Badge>
                    </div>
                  </div>
                  <div className="company-columns">
                    <section className="panel">
                      <h2>Seguridad de tu cuenta</h2>
                      <div className="security-setting">
                        <ShieldCheck size={21} />
                        <div>
                          <b>Autenticación multifactor</b>
                          <p>No configurada en esta vista.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => blocked("La configuración MFA")}
                        >
                          Configurar <ChevronRight size={15} />
                        </button>
                      </div>
                      <div className="security-setting">
                        <KeyRound size={21} />
                        <div>
                          <b>Contraseña</b>
                          <p>Actualiza tu contraseña de forma segura.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setModal({ kind: "password" })}
                        >
                          Gestionar <ChevronRight size={15} />
                        </button>
                      </div>
                      <div className="security-setting">
                        <Monitor size={21} />
                        <div>
                          <b>Sesiones y dispositivos</b>
                          <p>Tu sesión está autenticada.</p>
                        </div>
                      </div>
                      <Link className="button secondary" href="/clientes/login">
                        Ver pantalla de acceso <ArrowUpRight size={16} />
                      </Link>
                    </section>
                    <section className="panel">
                      <h2>Datos de tu cuenta</h2>
                      <p className="subtle">Puedes actualizar tus datos de contacto.</p>
                      <AccountTools data={data} mode="profile" onDone={() => router.refresh()} />
                      <button
                        className="button secondary"
                        onClick={() => void signOut({ callbackUrl: "/clientes/login" })}
                      >
                        Cerrar sesión
                      </button>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              Hecho para avanzar contigo. <b>zyteron.</b>
            </span>
            <span>
              Actualizado · {REFERENCE_DATE}
              <button onClick={() => setModal({ kind: "privacy" })}>Privacidad</button>
              <button onClick={() => setModal({ kind: "preview" })}>
                <CircleHelp size={14} />
                Ayuda
              </button>
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {[
          { id: "inicio", label: "Inicio", icon: "home" },
          { id: "proyectos", label: "Proyectos", icon: "projects" },
          { id: "asistencia", label: "Asistencia", icon: "message" },
        ].map((s) => (
          <button
            key={s.id}
            className={section === s.id ? "active" : ""}
            aria-current={section === s.id ? "page" : undefined}
            onClick={() => go(s.id)}
          >
            <Icon name={s.icon} />
            <span>{s.label}</span>
          </button>
        ))}
        <button onClick={() => setModal({ kind: "menu" })}>
          <Menu size={21} />
          <span>Más</span>
        </button>
      </nav>
      {toast && (
        <div role="status" className="toast">
          <Info size={19} />
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            <X size={17} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal.kind === "flow"
              ? "Revisar tu pago"
              : modal.kind === "search"
                ? "Buscar en tu espacio"
                : modal.kind === "support"
                  ? "Cuéntanos qué necesitas"
                  : modal.kind === "project"
                    ? "Tu proyecto"
                    : modal.kind === "service"
                      ? "Detalle del servicio"
                      : modal.kind === "ticket"
                        ? "Tu conversación"
                        : modal.kind === "invoice"
                          ? "Detalle del documento"
                          : modal.kind === "document"
                            ? "Documento compartido"
                            : modal.kind === "menu"
                              ? "Tu espacio Zyteron"
                              : modal.kind === "organization"
                                ? "Tu empresa"
                                : modal.kind === "event"
                                  ? "Compromiso publicado"
                                  : modal.kind === "quote"
                                    ? "Tu propuesta"
                                    : modal.kind === "draft"
                                      ? "Borrador de solicitud"
                                      : modal.kind === "privacy"
                                        ? "Privacidad de tu cuenta"
                                        : modal.kind === "blocked"
                                          ? "Integración pendiente"
                                          : "Tu cuenta Zyteron"
          }
          onClose={() => setModal(null)}
        >
          {modal.kind === "flow" &&
            (() => {
              const i = invoices.find((i) => i.id === modal.id);
              if (!i) return null;
              return (
                <FlowCheckoutPreview
                  document={i.displayNumber + " · " + i.concept}
                  amount={i.balance}
                  quote={data.quotes.find((q) => q.id === i.quoteId)}
                />
              );
            })()}
          {modal.kind === "password" && (
            <AccountTools
              data={data}
              mode="password"
              onDone={() => void signOut({ callbackUrl: "/clientes/login" })}
            />
          )}
          {modal.kind === "credential" && (
            <CredentialAccess credential={data.credentials.find((c) => c.id === modal.id)} />
          )}
          {modal.kind === "menu" && <nav aria-label="Todas las secciones">{nav()}</nav>}
          {modal.kind === "organization" && (
            <>
              <button className="organization selected-organization" onClick={() => setModal(null)}>
                <span className="org-symbol">{initials(company)}↗</span>
                <span>
                  <b>{company}</b>
                  <small>Empresa vinculada a tu cuenta</small>
                </span>
                <Check size={20} />
              </button>
              <p className="subtle">
                Tu acceso corresponde a la empresa vinculada a esta cuenta. Para modificar la
                vinculación, solicita la revisión del equipo de Zyteron.
              </p>
            </>
          )}
          {modal.kind === "privacy" && (
            <>
              <p>
                Tu información se muestra únicamente a tu cuenta y al equipo autorizado de Zyteron.
              </p>
              <Link className="button secondary" href="/privacidad">
                Ver política de privacidad <ArrowRight size={16} />
              </Link>
            </>
          )}
          {modal.kind === "blocked" && (
            <>
              <div className="empty-symbol">
                <LockKeyhole size={30} />
              </div>
              <h3>{modal.id} aún no están disponibles.</h3>
              <p>
                Esta función requiere configuración adicional y permisos específicos. Puedes
                solicitar ayuda al equipo desde Asistencia técnica.
              </p>
              <div className="info-note">
                <ShieldCheck size={18} />
                La acción permanece bloqueada. No se ha enviado ninguna solicitud ni modificado
                datos.
              </div>
              <button className="button primary" onClick={() => setModal(null)}>
                Entendido <Check size={16} />
              </button>
            </>
          )}
          {modal.kind === "search" && (
            <>
              <label className="modal-search">
                <Search size={20} />
                <input
                  autoFocus
                  aria-label="Buscar proyectos, servicios o documentos"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Proyectos, servicios, documentos…"
                />
              </label>
              <div className="search-results">
                {query.trim() ? (
                  <>
                    {[
                      ...projects.map((p) => ({
                        id: p.id,
                        name: p.short,
                        type: "Proyecto",
                        kind: "project",
                      })),
                      ...services.map((s) => ({
                        id: s.id,
                        name: s.name,
                        type: "Servicio",
                        kind: "service",
                      })),
                      ...documents.map((d) => ({
                        id: d.id,
                        name: d.name,
                        type: "Documento",
                        kind: "document",
                      })),
                      ...tickets.map((t) => ({
                        id: t.id,
                        name: t.title,
                        type: "Solicitud",
                        kind: "ticket",
                      })),
                    ]
                      .filter((r) =>
                        r.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
                      )
                      .map((r) => (
                        <button key={r.id} onClick={() => setModal({ kind: r.kind, id: r.id })}>
                          <span>
                            <small>{r.type}</small>
                            <b>{r.name}</b>
                          </span>
                          <ArrowUpRight size={17} />
                        </button>
                      ))}
                    {![
                      ...projects.map((p) => p.short),
                      ...services.map((s) => s.name),
                      ...documents.map((d) => d.name),
                      ...tickets.map((t) => t.title),
                    ].some((n) =>
                      n.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
                    ) && (
                      <Empty
                        icon="file"
                        title="Sin resultados"
                        description="Prueba con otro término."
                      />
                    )}
                  </>
                ) : (
                  <>
                    <p className="eyebrow">ACCESOS RÁPIDOS</p>
                    {sections.slice(1, 5).map((s) => (
                      <button key={s.id} onClick={() => go(s.id)}>
                        <Icon name={s.icon} />
                        <b>{s.label}</b>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
          {modal.kind === "support" && (
            <form
              className="support-form"
              onSubmit={(e) => {
                e.preventDefault();
                void send(
                  section === "agenda" || section === "empresa"
                    ? "/api/portal/requests"
                    : "/api/portal/tickets",
                  section === "agenda" || section === "empresa"
                    ? {
                        title: supportDraft.title,
                        details: supportDraft.body,
                        type: section === "agenda" ? "MEETING" : "PROFILE_UPDATE",
                      }
                    : {
                        title: supportDraft.title,
                        description: supportDraft.body,
                        category: supportDraft.service,
                        priority: "NORMAL",
                      },
                ).then((ok) => {
                  if (ok) {
                    setSupportDraft({
                      title: "",
                      body: "",
                      service: services[0]?.name || "Asistencia general",
                    });
                    go("asistencia");
                  }
                });
              }}
            >
              <p>Describe tu necesidad para que el equipo pueda ayudarte.</p>
              <label>
                ¿Sobre qué servicio?
                <select
                  value={supportDraft.service}
                  onChange={(e) => setSupportDraft((v) => ({ ...v, service: e.target.value }))}
                >
                  {services.map((s) => (
                    <option key={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Asunto
                <input
                  required
                  minLength={5}
                  maxLength={120}
                  placeholder="Por ejemplo: actualizar el horario del sitio"
                  value={supportDraft.title}
                  onChange={(e) => setSupportDraft((v) => ({ ...v, title: e.target.value }))}
                />
              </label>
              <label>
                Cuéntanos un poco más
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={5}
                  placeholder="¿Qué necesitas y cómo impacta a tu operación?"
                  value={supportDraft.body}
                  onChange={(e) => setSupportDraft((v) => ({ ...v, body: e.target.value }))}
                />
              </label>
              <div className="info-note">
                <Info size={17} />
                La solicitud quedará registrada y podrá revisarla el equipo de Zyteron.
              </div>
              <button className="button primary" type="submit" disabled={busy}>
                Enviar solicitud <FileText size={17} />
              </button>
            </form>
          )}
          {modal.kind === "draft" &&
            (() => {
              const d = drafts.find((d) => d.id === modal.id)!;
              return (
                <>
                  <Badge tone="neutral">No enviado</Badge>
                  <h3>{d.title}</h3>
                  <p className="subtle">{d.service}</p>
                  <p className="preserve-lines">{d.body}</p>
                  <div className="info-note">
                    <Info size={17} />
                    Este borrador solo existe en la vista actual.
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSupportDraft({
                        title: d.title,
                        body: d.body,
                        service: d.service,
                      });
                      setDrafts((v) => v.filter((x) => x.id !== d.id));
                      setModal({ kind: "support" });
                    }}
                  >
                    Editar borrador
                  </button>
                </>
              );
            })()}
          {modal.kind === "project" &&
            (() => {
              const p = projects.find((p) => p.id === modal.id);
              if (!p) return null;
              return (
                <>
                  <ProjectArt variant={p.color} />
                  <p className="eyebrow">{p.category}</p>
                  <h3>{p.short}</h3>
                  <p>{p.description}</p>
                  <div className="progress-label">
                    <span>Avance publicado</span>
                    <b>{p.progress === null ? "Sin avance publicado" : `${p.progress ?? 0}%`}</b>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${p.progress === null ? "Sin avance publicado" : `${p.progress ?? 0}%`}`,
                      }}
                    />
                  </div>
                  <h4>El camino de tu proyecto</h4>
                  <ol className="milestones">
                    {p.steps.map((s, i) => (
                      <li key={s} className={i <= p.current ? "done" : ""}>
                        <span>{i < p.current ? <Check size={15} /> : i + 1}</span>
                        <div>
                          <b>{s}</b>
                          <small>
                            {i < p.current
                              ? "Hito completado"
                              : i === p.current
                                ? "Fase actual"
                                : "Próximo paso"}
                          </small>
                        </div>
                        {i === p.current && <Badge tone="neutral">Actual</Badge>}
                      </li>
                    ))}
                  </ol>
                  <div className="info-note">
                    <CalendarDays size={18} />
                    {p.next} · {p.date}
                  </div>
                  <button className="button primary" onClick={() => go("documentos")}>
                    Revisar documentos <ArrowRight size={16} />
                  </button>
                </>
              );
            })()}
          {modal.kind === "service" &&
            (() => {
              const s = services.find((s) => s.id === modal.id);
              if (!s) return null;
              return (
                <>
                  <div className="service-top">
                    <span className={`service-icon ${s.color}`}>
                      <Icon name={s.icon} size={25} />
                    </span>
                    <Badge>{s.status}</Badge>
                  </div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <dl className="detail-list">
                    <div>
                      <dt>Recurso</dt>
                      <dd>{s.domain}</dd>
                    </div>
                    <div>
                      <dt>Precio acordado</dt>
                      <dd>
                        {s.price} · {s.period}
                      </dd>
                    </div>
                    <div>
                      <dt>Renovación</dt>
                      <dd>{s.renewal}</dd>
                    </div>
                    <div>
                      <dt>Estado técnico real</dt>
                      <dd>No disponible</dd>
                    </div>
                  </dl>
                  <h4>Alcance acordado</h4>
                  <ul className="scope-list">
                    {s.scope.map((c) => (
                      <li key={c}>
                        <Check size={16} />
                        {c}
                      </li>
                    ))}
                  </ul>
                  <div className="modal-actions">
                    <button
                      className="button primary"
                      onClick={() => {
                        setSupportDraft((v) => ({ ...v, service: s.name }));
                        setModal({ kind: "support" });
                      }}
                    >
                      Solicitar un cambio
                    </button>
                    <button className="button secondary" onClick={() => go("cuenta")}>
                      Consultar facturación
                    </button>
                  </div>
                </>
              );
            })()}
          {modal.kind === "invoice" &&
            (() => {
              const i = invoices.find((i) => i.id === modal.id);
              if (!i) return null;
              return (
                <>
                  <div className="invoice-head">
                    <span className="service-icon orange">
                      <FileText size={28} />
                    </span>
                    <Badge
                      tone={
                        i.status === "Vencida"
                          ? "orange"
                          : i.status === "Pagada"
                            ? "green"
                            : "neutral"
                      }
                    >
                      {i.status}
                    </Badge>
                  </div>
                  <span className="eyebrow">CUENTA POR COBRAR · {i.displayNumber}</span>
                  <h3>{i.concept}</h3>
                  <dl className="detail-list">
                    <div>
                      <dt>Período</dt>
                      <dd>{i.period}</dd>
                    </div>
                    <div>
                      <dt>Emisión / vencimiento</dt>
                      <dd>
                        {i.issued} / {i.due}
                      </dd>
                    </div>
                    <div>
                      <dt>Neto / impuesto de origen</dt>
                      <dd>
                        {i.net} / {i.tax} CLP
                      </dd>
                    </div>
                    <div>
                      <dt>Importe original</dt>
                      <dd>{i.amount} CLP</dd>
                    </div>
                    <div>
                      <dt>Saldo pendiente</dt>
                      <dd>{i.balance} CLP</dd>
                    </div>
                    <div>
                      <dt>Documento</dt>
                      <dd>{i.document}</dd>
                    </div>
                    <div>
                      <dt>Obligación</dt>
                      <dd>{i.obligation}</dd>
                    </div>
                    <div>
                      <dt>Pago real</dt>
                      <dd>
                        {i.status === "Pagada" ? "Pago registrado" : "Pendiente de confirmación"}
                      </dd>
                    </div>
                  </dl>
                  <div className="info-note">
                    <Info size={17} />
                    Esta obligación proviene de la cuenta registrada. No constituye por sí sola un
                    comprobante de pago.
                  </div>
                  <div className="modal-actions">
                    <button
                      className="button primary"
                      disabled={!i.payable}
                      onClick={() => setModal({ kind: "flow", id: i.id })}
                    >
                      Opciones de pago <CreditCard size={17} />
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => blocked("La descarga de DTE")}
                    >
                      Descargar documento <Download size={17} />
                    </button>
                  </div>
                </>
              );
            })()}
          {modal.kind === "document" &&
            (() => {
              const d = documents.find((d) => d.id === modal.id);
              if (!d) return null;
              return (
                <>
                  <div className="document-preview">
                    <FileText size={42} />
                    <span>{d.type.toUpperCase()}</span>
                    <h3>{d.name}</h3>
                    <p>Documento publicado por Zyteron para tu cuenta.</p>
                    <div className="fake-doc-lines" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                  <dl className="detail-list">
                    <div>
                      <dt>Proyecto / servicio</dt>
                      <dd>{d.project}</dd>
                    </div>
                    <div>
                      <dt>Versión / fecha</dt>
                      <dd>
                        {d.version} / {d.date}
                      </dd>
                    </div>
                    <div>
                      <dt>Estado</dt>
                      <dd>{d.status}</dd>
                    </div>
                  </dl>
                  <div className="modal-actions">
                    <button
                      className="button primary"
                      onClick={() => setModal({ kind: "support" })}
                    >
                      Revisar con el equipo <MessageSquare size={17} />
                    </button>
                    <a
                      className="button secondary"
                      href={`/api/portal/documents/${d.id}/download`}
                      download
                    >
                      Descargar <Download size={17} />
                    </a>
                  </div>
                </>
              );
            })()}
          {modal.kind === "ticket" &&
            (() => {
              const t = tickets.find((t) => t.id === modal.id);
              if (!t) return null;
              return (
                <>
                  <span className="eyebrow">{t.id} · CONVERSACIÓN</span>
                  <h3>{t.title}</h3>
                  <Badge tone={t.status === "Esperando tu respuesta" ? "orange" : "neutral"}>
                    {t.status}
                  </Badge>
                  <div className="conversation">
                    {t.messages.map((m, i) => (
                      <div className={`message ${m.actor === "Tú" ? "from-user" : ""}`} key={i}>
                        <b>{m.actor}</b>
                        <p>{m.text}</p>
                        <small>{m.time}</small>
                      </div>
                    ))}
                  </div>
                  <form
                    className="support-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send(`/api/portal/tickets/${t.id}/messages`, { message: reply }).then(
                        (ok) => {
                          if (ok) setReply("");
                        },
                      );
                    }}
                  >
                    <label>
                      Tu respuesta
                      <textarea
                        required
                        minLength={3}
                        maxLength={4000}
                        rows={3}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Escribe aquí tu respuesta…"
                      />
                    </label>
                    <small className="subtle">El mensaje se registra en esta solicitud.</small>
                    <button type="submit" className="button primary">
                      Enviar respuesta <Send size={16} />
                    </button>
                  </form>
                </>
              );
            })()}
          {modal.kind === "event" &&
            (() => {
              const e = events.find((e) => e.id === modal.id)!;
              return (
                <>
                  <span className="service-icon green">
                    <CalendarDays size={27} />
                  </span>
                  <h3>{e.title}</h3>
                  <p>{e.description}</p>
                  <dl className="detail-list">
                    <div>
                      <dt>Tipo</dt>
                      <dd>{e.kind}</dd>
                    </div>
                    <div>
                      <dt>Fecha civil</dt>
                      <dd>{e.date}</dd>
                    </div>
                    <div>
                      <dt>Horario</dt>
                      <dd>{e.time}</dd>
                    </div>
                    <div>
                      <dt>Zona horaria</dt>
                      <dd>America/Santiago</dd>
                    </div>
                  </dl>
                  <div className="info-note">
                    <Info size={17} />
                    Evento publicado por el equipo para tu cuenta.
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setModal({ kind: "support" })}
                  >
                    Consultar al equipo <MessageSquare size={16} />
                  </button>
                </>
              );
            })()}
        </Modal>
      )}
    </div>
  );
}

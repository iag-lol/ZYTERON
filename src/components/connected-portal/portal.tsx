"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { csvCell } from "@/lib/client-experience/csv";
import { signOut } from "next-auth/react";
import { CredentialAccessForm } from "@/components/portal/panel/credential-access-form";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { projectMonthlyPayments } from "@/lib/payments/payment-projection";
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
  pagos: "Consulta tus facturas y el estado de tus pagos.",
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

const money = (v: number, currency = "CLP") =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(v);
const date = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("es-CL", {
        timeZone: v.length === 10 || v.includes("T00:00:00") ? "UTC" : "America/Santiago",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(v))
    : "Por coordinar";
const initials = (v: string) =>
  v
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
const labels: Record<string, string> = {
  ACTIVE: "Activo",
  PLANNED: "Planificado",
  DONE: "Entregado",
  PENDING_ACTIVATION: "Por activar",
  SUSPENDED: "Suspendido",
  CANCELLED: "Cancelado",
  CANCEL_SCHEDULED: "Cancelación programada",
  CANCEL_REQUESTED: "Cancelación en revisión",
  OPEN: "Abierta",
  IN_PROGRESS: "En curso",
  RESOLVED: "Resuelta",
  CLOSED: "Cerrada",
  PENDING: "Pendiente",
  SENT: "Enviada",
  WON: "Aceptada",
  LOST: "Cerrada",
  COMPLETED: "Entregado",
  PAID: "Pagado",
  READY: "Disponible para pago",
  PROCESSING: "En verificación",
  REJECTED: "Rechazado",
  WAITING_CLIENT: "Espera tu respuesta",
  ONE_TIME: "Pago único",
  MONTHLY: "Mensual",
  ANNUAL: "Anual",
  QUARTERLY: "Trimestral",
};
const label = (v: string | null) => (v ? labels[v] || v : "Por coordinar");
export default function Portal({
  data,
  initialSection = "inicio",
}: {
  data: PortalData;
  initialSection?: string;
}) {
  const [section, setSection] = useState(initialSection),
    [modal, setModal] = useState<ModalState>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Todos"),
    [tab, setTab] = useState("Solicitudes"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [read, setRead] = useState<string[]>([]),
    [year, setYear] = useState(new Date(data.asOf).getFullYear()),
    [month, setMonth] = useState(new Date(data.asOf).getMonth() + 1),
    [view, setView] = useState("year"),
    [challenge, setChallenge] = useState("");
  const user = data.user,
    company = user.company || user.name,
    unread = data.notifications.filter((n) => !n.read && !read.includes(n.id)).length;
  const total = data.invoices
      .filter((i) => i.currency === "CLP")
      .reduce((s, i) => s + i.balance, 0),
    overdue = data.invoices
      .filter((i) => i.status === "Vencida" && i.currency === "CLP")
      .reduce((s, i) => s + i.balance, 0);
  const activeProjects = data.projects.filter((p) => p.status === "IN_PROGRESS"),
    openTickets = data.tickets.filter((t) => !["CLOSED", "RESOLVED"].includes(t.status));
  const subscriptions = data.quotes.flatMap((q) => (q.subscription ? [q.subscription] : []));
  useEffect(() => {
    const sync = () => {
      const p = window.location.pathname.split("/").at(-1) || "inicio";
      setSection(sections.some((s) => s.id === p) ? p : "inicio");
      setModal(null);
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
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  function go(id: string) {
    setSection(id);
    setFilter("Todos");
    setModal(null);
    setQuery("");
    setTab("Solicitudes");
    window.history.pushState({}, "", id === "inicio" ? "/clientes/panel" : `/clientes/panel/${id}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function open(kind: string, id?: string) {
    setError("");
    setChallenge("");
    setModal({ kind, id });
  }
  async function send(url: string, body: unknown, method = "POST", reload = true) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "No pudimos completar la acción.");
      if (reload) window.location.reload();
      return b;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos completar la acción.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function mark(ids: string[]) {
    const b = await send("/api/portal/notifications/read", { ids }, "POST", false);
    if (b) setRead((v) => [...v, ...ids]);
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
          {s.id === "notificaciones" && unread > 0 && <b className="nav-count">{unread}</b>}
          {s.id === "asistencia" && openTickets.length > 0 && (
            <b className="nav-count">{openTickets.length}</b>
          )}
        </button>
      </div>
    ));
  }
  function tabs(items: string[]) {
    return (
      <div className="tabs">
        {items.map((x) => (
          <button
            key={x}
            className={filter === x ? "selected" : ""}
            aria-pressed={filter === x}
            onClick={() => setFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
    );
  }
  function empty(
    title: string,
    description = "Tu equipo publicará aquí la información compartida contigo.",
  ) {
    return (
      <Empty
        title={title}
        description={description}
        action={
          <button className="button secondary" onClick={() => open("support")}>
            Conversemos <ArrowUpRight size={16} />
          </button>
        }
      />
    );
  }
  function projectCard(p: PortalData["projects"][number], i: number) {
    return (
      <article className="project-card" key={p.id}>
        <button
          className="project-art-button"
          aria-label={`Ver ${p.title}`}
          onClick={() => open("project", p.id)}
        >
          <ProjectArt variant={i % 2 ? "sand" : "forest"} />
        </button>
        <div className="project-body">
          <div className="project-meta">
            <span>{p.category || "Proyecto digital"}</span>
            <Badge tone="neutral">{label(p.status)}</Badge>
          </div>
          <button className="title-link" onClick={() => open("project", p.id)}>
            <h3>{p.title}</h3>
            <ArrowUpRight size={18} />
          </button>
          <p>{p.description || "Revisa el alcance y las fechas acordadas."}</p>
          <div className="project-footer">
            <span>Inicio · {date(p.start)}</span>
            <span>
              <Clock3 size={13} /> {date(p.end)}
            </span>
          </div>
        </div>
      </article>
    );
  }
  function documentRows(list = data.documents) {
    return list.length
      ? list.map((d) => (
          <button className="document-row" key={d.id} onClick={() => open("document", d.id)}>
            <span className="document-icon">
              <FileText size={20} />
            </span>
            <span className="row-text">
              <b>{d.title}</b>
              <small>
                {d.category} · {date(d.date)}
              </small>
            </span>
            <Badge tone="neutral">Compartido</Badge>
            <ArrowUpRight size={17} />
          </button>
        ))
      : empty("Tus documentos, en un solo lugar.");
  }
  function eventRows() {
    return data.events.length
      ? data.events.map((e) => (
          <button className="event-row" key={e.id} onClick={() => open("event", e.id)}>
            <span className="event-day">
              <b>{new Date(e.date).getUTCDate()}</b>
              <small>
                {new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" })
                  .format(new Date(e.date))
                  .toUpperCase()}
              </small>
            </span>
            <span className="event-text">
              <b>{e.title}</b>
              <small>{e.description}</small>
              <span>
                <Clock3 size={12} />
                {date(e.date)}
              </span>
            </span>
            <ChevronRight size={17} />
          </button>
        ))
      : empty(
          "El próximo paso se coordina contigo.",
          "Aún no hay compromisos publicados en tu agenda.",
        );
  }
  function invoiceTable() {
    const rows = data.invoices.filter((i) => filter === "Todos" || i.status === filter);
    return rows.length ? (
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Obligación</th>
              <th>Emisión</th>
              <th>Vencimiento</th>
              <th>Importe</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>
                <span className="sr-only">Detalle</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td>
                  <button className="table-title" onClick={() => open("invoice", i.id)}>
                    {i.concept}
                  </button>
                </td>
                <td>{date(i.issued)}</td>
                <td>{date(i.due)}</td>
                <td>{money(i.total, i.currency)}</td>
                <td>{money(i.balance, i.currency)}</td>
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
                    aria-label={`Ver ${i.concept}`}
                    onClick={() => open("invoice", i.id)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      empty(
        "Sin obligaciones en este estado.",
        "Aquí se muestran únicamente saldos registrados para tu cuenta.",
      )
    );
  }
  function exportAccount() {
    const cell = csvCell;
    const csv =
      "\uFEFF" +
      [
        ["Concepto", "Moneda", "Importe", "Saldo", "Vencimiento", "Estado"],
        ...data.invoices.map((i) => [
          i.concept,
          i.currency,
          i.total,
          i.balance,
          i.due?.slice(0, 10) || "",
          i.status,
        ]),
      ]
        .map((r) => r.map(cell).join(";"))
        .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "estado-de-cuenta-zyteron.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const title = sections.find((s) => s.id === section)?.label || "Inicio";
  const selectedQuote = data.quotes.find((q) => q.id === modal?.id);
  return (
    <div className="portal-shell" data-experience="approved-portal">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
        </div>
        <button className="organization" onClick={() => open("organization")}>
          <span className="org-symbol">
            {initials(company).slice(0, 1)}
            <span>↗</span>
          </span>
          <span>
            <b>{company}</b>
            <small>Tu espacio de trabajo</small>
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
            <span className="avatar profile-avatar">{initials(user.name)}</span>
            <span>
              <b>{user.name}</b>
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
              onClick={() => open("search")}
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
              {initials(user.name)}
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">TU ESPACIO ZYTERON</p>
              <h1>
                {section === "inicio" ? (
                  <>
                    Hola, {user.firstName || user.name.split(" ")[0]}{" "}
                    <span className="greeting-spark">✳</span>
                  </>
                ) : (
                  title
                )}
              </h1>
              <p>
                {section === "inicio"
                  ? "Todo lo que estamos construyendo juntos, aquí."
                  : descriptions[section]}
              </p>
            </div>
            {section === "cuenta" ? (
              <button className="button secondary" onClick={exportAccount}>
                <Download size={17} />
                Exportar estado
              </button>
            ) : section === "notificaciones" ? (
              <button
                className="button secondary"
                disabled={busy || unread === 0}
                onClick={() =>
                  void mark(data.notifications.filter((n) => !n.read).map((n) => n.id))
                }
              >
                <CheckCheck size={17} />
                Marcar como leídas
              </button>
            ) : (
              <button className="button primary" onClick={() => open("support")}>
                <Plus size={17} />
                Nueva solicitud
              </button>
            )}
          </div>
          {section === "inicio" && (
            <>
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
                    value: String(
                      data.services.filter((s) => s.status === "ACTIVE").length,
                    ).padStart(2, "0"),
                    icon: "layers",
                    foot: "Tu ecosistema digital",
                    section: "servicios",
                    tone: "green",
                  },
                  {
                    label: "Proyectos en curso",
                    value: String(activeProjects.length).padStart(2, "0"),
                    icon: "projects",
                    foot: "Ideas que toman forma",
                    section: "proyectos",
                    tone: "purple",
                  },
                  {
                    label: "Saldo vencido · CLP",
                    value: money(overdue),
                    icon: "wallet",
                    foot: "Obligaciones registradas",
                    section: "cuenta",
                    tone: "orange",
                  },
                  {
                    label: "Solicitudes abiertas",
                    value: String(openTickets.length).padStart(2, "0"),
                    icon: "message",
                    foot: "Aquí para acompañarte",
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
                      <ArrowUpRight size={15} />
                    </p>
                  </button>
                ))}
              </div>
              <div className="home-columns">
                <div>
                  <section className="home-section">
                    <div className="section-heading">
                      <h2>Lo que estamos construyendo.</h2>
                      <button className="text-button" onClick={() => go("proyectos")}>
                        Todos los proyectos <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <div className="project-grid">
                      {activeProjects.length
                        ? activeProjects.slice(0, 2).map(projectCard)
                        : empty("Una nueva idea empieza aquí.")}
                    </div>
                  </section>
                  <section className="panel">
                    <div className="section-heading">
                      <h2>Documentos recientes</h2>
                      <button className="text-button" onClick={() => go("documentos")}>
                        Ver todos <ArrowUpRight size={15} />
                      </button>
                    </div>
                    {documentRows(data.documents.slice(0, 3))}
                  </section>
                </div>
                <div>
                  <section className="panel agenda-panel">
                    <div className="section-heading">
                      <h2>Próximos pasos</h2>
                      <CalendarDays size={19} />
                    </div>
                    {eventRows()}
                  </section>
                  <section className="panel">
                    <div className="section-heading">
                      <h2>Tu cuenta, al día.</h2>
                      <Wallet size={19} />
                    </div>
                    <p className="eyebrow">SALDO PENDIENTE · CLP</p>
                    <h2>{money(total)}</h2>
                    <p className="subtle">Revisa el detalle y los pagos confirmados.</p>
                    <button className="button secondary" onClick={() => go("cuenta")}>
                      Ver estado de cuenta <ArrowUpRight size={16} />
                    </button>
                  </section>
                </div>
              </div>
            </>
          )}
          {section === "servicios" && (
            <>
              {tabs(["Todos", "Activos", "Por activar"])}
              <div className="services-grid">
                {data.services
                  .filter(
                    (s) =>
                      filter === "Todos" ||
                      (filter === "Activos"
                        ? s.status === "ACTIVE"
                        : s.status === "PENDING_ACTIVATION"),
                  )
                  .map((s) => (
                    <article className="service-card" key={s.id}>
                      <div className="service-top">
                        <span className="service-icon green">
                          <Globe2 size={27} />
                        </span>
                        <Badge tone={s.status === "ACTIVE" ? "green" : "neutral"}>
                          {label(s.status)}
                        </Badge>
                      </div>
                      <p className="eyebrow">SERVICIO CONTRATADO</p>
                      <h2>{s.name}</h2>
                      <p>{s.description || "Consulta el alcance de tu servicio."}</p>
                      <dl>
                        <div>
                          <dt>Importe acordado</dt>
                          <dd>
                            {s.price === null ? "Por confirmar" : money(s.price, s.currency)} ·{" "}
                            {label(s.frequency)}
                          </dd>
                        </div>
                        <div>
                          <dt>Renovación</dt>
                          <dd>{date(s.renewal)}</dd>
                        </div>
                      </dl>
                      <button className="button secondary" onClick={() => open("service", s.id)}>
                        Ver mi servicio <ArrowUpRight size={16} />
                      </button>
                    </article>
                  ))}
              </div>
              {!data.services.length &&
                empty(
                  "Tu ecosistema está por empezar.",
                  "Los servicios publicados por Zyteron aparecerán aquí.",
                )}
            </>
          )}
          {section === "proyectos" && (
            <>
              {tabs(["Todos", "En curso", "Entregados"])}
              <div className="project-grid full-projects">
                {data.projects
                  .filter(
                    (p) =>
                      filter === "Todos" ||
                      (filter === "Entregados"
                        ? ["COMPLETED", "DONE"].includes(p.status)
                        : p.status === "IN_PROGRESS"),
                  )
                  .map(projectCard)}
              </div>
              {!data.projects.length && empty("Tu próxima idea merece su espacio.")}
              <p className="source-note">
                Fechas y alcance compartidos por Zyteron. Los avances se muestran cuando existe
                evidencia publicada.
              </p>
            </>
          )}
          {(section === "cuenta" || section === "pagos") && (
            <>
              <div className="finance-overview">
                <div className="balance-card">
                  <span className="eyebrow">SALDO PENDIENTE · CLP</span>
                  <strong>
                    {money(total)}
                    <span>CLP</span>
                  </strong>
                  <p>{data.invoices.filter((i) => i.balance > 0).length} obligaciones pendientes</p>
                  <div>
                    <span>
                      Vencido <b>{money(overdue)}</b>
                    </span>
                    <span>
                      Por vencer <b>{money(total - overdue)}</b>
                    </span>
                  </div>
                  <button className="button lime" onClick={() => go("contratos")}>
                    Revisar opciones de pago <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="finance-info">
                  <span className="service-icon green">
                    <ShieldCheck size={26} />
                  </span>
                  <h2>Todo claro, desde el origen.</h2>
                  <p>
                    Tu saldo considera obligaciones registradas y pagos confirmados. Cada cobro se
                    verifica antes de acreditarse.
                  </p>
                  <div className="finance-small">
                    <span>
                      Pagos confirmados <b>{data.payments.length}</b>
                    </span>
                    <span>
                      Suscripciones vinculadas <b>{subscriptions.length}</b>
                    </span>
                  </div>
                </div>
              </div>
              {section === "pagos" && (
                <section className="billing-hub">
                  <div className="billing-hub-title">
                    <div>
                      <p className="eyebrow">TU RELACIÓN CON ZYTERON, A LARGO PLAZO</p>
                      <h2>Mes a mes, todo claro.</h2>
                    </div>
                    <Badge tone="green">Calendario de tu cuenta</Badge>
                  </div>
                  <div className="billing-hub-tabs">
                    {["Suscripciones", "Calendario de pagos"].map((t) => (
                      <button
                        key={t}
                        className={tab === t ? "selected" : ""}
                        onClick={() => setTab(t)}
                      >
                        {t === "Suscripciones" ? (
                          <CalendarDays size={16} />
                        ) : (
                          <CreditCard size={16} />
                        )}{" "}
                        {t}
                      </button>
                    ))}
                  </div>
                  {tab === "Suscripciones" ? (
                    <div className="subscription-layout">
                      {subscriptions.length
                        ? subscriptions.map((s) => (
                            <article className="subscription-card" key={s.quoteId}>
                              <div className="subscription-top">
                                <span className="service-icon green">
                                  <Globe2 size={25} />
                                </span>
                                <Badge tone="neutral">{label(s.state)}</Badge>
                              </div>
                              <p className="eyebrow">SUSCRIPCIÓN MENSUAL</p>
                              <h3>{s.label}</h3>
                              <div className="subscription-price">
                                {money(s.amount)}
                                <span>CLP / mes</span>
                              </div>
                              <dl>
                                <div>
                                  <dt>Cobertura pagada</dt>
                                  <dd>
                                    {s.paidThrough ? date(s.paidThrough) : "Sin período acreditado"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Próximo cobro previsto</dt>
                                  <dd>{date(s.nextDate)}</dd>
                                </div>
                              </dl>
                              <div className="subscription-actions">
                                <button
                                  className="button secondary"
                                  onClick={() => setTab("Calendario de pagos")}
                                >
                                  Ver calendario <ArrowUpRight size={15} />
                                </button>
                                {["ACTIVE", "CANCEL_REQUESTED"].includes(s.state) ? (
                                  <button
                                    className="text-button cancel-link"
                                    onClick={() => open("cancel", s.quoteId)}
                                  >
                                    Cancelar suscripción
                                  </button>
                                ) : (
                                  s.state === "PENDING" && (
                                    <button
                                      className="button primary"
                                      onClick={() => open("checkout", s.quoteId)}
                                    >
                                      Revisar activación
                                    </button>
                                  )
                                )}
                              </div>
                            </article>
                          ))
                        : empty(
                            "Aún no hay suscripciones vinculadas.",
                            "Un pago aislado no autoriza cargos mensuales.",
                          )}
                      <aside className="subscription-guide">
                        <span className="service-icon green">
                          <ShieldCheck size={26} />
                        </span>
                        <h3>El control también está de tu lado.</h3>
                        <p>Cada cargo requiere autorización y confirmación efectiva.</p>
                        <div className="info-note">
                          <Info size={17} />
                          Si cancelas la mantención web, conservas la cobertura hasta terminar el
                          período ya pagado. La cancelación se notifica a Zyteron.
                        </div>
                        <button className="text-button" onClick={() => open("support")}>
                          Conversemos sobre tu plan <ArrowRight size={15} />
                        </button>
                      </aside>
                    </div>
                  ) : (
                    <div className="billing-calendar">
                      <div className="billing-calendar-controls">
                        <div className="calendar-year-selector">
                          <button
                            aria-label="Año anterior"
                            disabled={year <= 2020}
                            onClick={() => setYear((y) => y - 1)}
                          >
                            <ChevronRight style={{ transform: "rotate(180deg)" }} size={19} />
                          </button>
                          <strong>{year}</strong>
                          <button
                            aria-label="Año siguiente"
                            disabled={year >= 2100}
                            onClick={() => setYear((y) => y + 1)}
                          >
                            <ChevronRight size={19} />
                          </button>
                        </div>
                        <div className="calendar-view-control">
                          <button
                            className={view === "year" ? "selected" : ""}
                            onClick={() => setView("year")}
                          >
                            Año
                          </button>
                          <button
                            className={view === "month" ? "selected" : ""}
                            onClick={() => setView("month")}
                          >
                            Mes
                          </button>
                        </div>
                        {view === "month" && (
                          <select
                            aria-label="Mes del calendario"
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                          >
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i} value={i + 1}>
                                {new Intl.DateTimeFormat("es-CL", { month: "long" }).format(
                                  new Date(2026, i, 1),
                                )}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className={`projection-grid ${view === "month" ? "month-view" : ""}`}>
                        {[
                          ...data.payments
                            .filter((p) => p.date.slice(0, 4) === String(year))
                            .map((p) => ({
                              id: p.id,
                              label: "Pago confirmado",
                              amount: p.amount,
                              date: p.date.slice(0, 10),
                              confirmed: true,
                              receipt: p.receipt,
                            })),
                          ...subscriptions
                            .flatMap((s) => projectMonthlyPayments(s, year))
                            .map((p, i) => ({
                              ...p,
                              id: p.quoteId + String(i),
                              confirmed: false,
                              receipt: false,
                            })),
                        ]
                          .filter((p) => view === "year" || Number(p.date.slice(5, 7)) === month)
                          .map((p) => (
                            <article
                              className={`projection-month ${p.confirmed ? "confirmed" : "forecast"}`}
                              key={p.id}
                            >
                              <div>
                                <span>{date(p.date)}</span>
                                {p.confirmed ? <Check size={15} /> : <CalendarDays size={15} />}
                              </div>
                              <strong>{money(p.amount)}</strong>
                              <p>{p.label}</p>
                              <small>{p.confirmed ? "Confirmado" : "Proyección"}</small>
                              {p.receipt && (
                                <a
                                  className="text-button"
                                  href={`/api/portal/payments/receipts/${p.id}`}
                                >
                                  <Download size={14} />
                                  Comprobante PDF
                                </a>
                              )}
                            </article>
                          ))}
                      </div>
                      <p className="source-note">
                        Las proyecciones no son deudas ni comprobantes. Solo los pagos efectivamente
                        confirmados tienen comprobante.
                      </p>
                    </div>
                  )}
                </section>
              )}
              <section className="panel finance-panel">
                <div className="section-heading">
                  <h2>Obligaciones y movimientos</h2>
                  <SlidersHorizontal size={15} />
                </div>
                {tabs(["Todos", "Vencida", "Pendiente", "Pagada"])}
                {invoiceTable()}
              </section>
              {data.payments.length > 0 && (
                <section className="panel">
                  <div className="section-heading">
                    <h2>Pagos confirmados</h2>
                    <ShieldCheck size={19} />
                  </div>
                  {data.payments.map((p) => (
                    <div className="document-row" key={p.id}>
                      <span className="document-icon">
                        <Wallet size={20} />
                      </span>
                      <span className="row-text">
                        <b>{money(p.amount)}</b>
                        <small>{date(p.date)}</small>
                      </span>
                      <Badge>Confirmado</Badge>
                      {p.receipt && (
                        <a className="text-button" href={`/api/portal/payments/receipts/${p.id}`}>
                          <Download size={16} />
                          PDF
                        </a>
                      )}
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {section === "contratos" && (
            <>
              {tabs(["Todos", "Cotizaciones", "Contratos"])}
              <div className="agreements-grid">
                {filter !== "Contratos" &&
                  data.quotes.map((q) => (
                    <article className="agreement-card" key={q.id}>
                      <div className="service-top">
                        <span className="service-icon orange">
                          <FileCheck2 size={27} />
                        </span>
                        <Badge tone="neutral">{label(q.status)}</Badge>
                      </div>
                      <span className="eyebrow">COTIZACIÓN · {q.number}</span>
                      <h2>{q.title}</h2>
                      <dl>
                        <div>
                          <dt>Importe</dt>
                          <dd>{q.total > 0 ? money(q.total) : "Pendiente de confirmación"}</dd>
                        </div>
                        <div>
                          <dt>Modalidad</dt>
                          <dd>{q.billingType === "SUBSCRIPTION" ? "Mensual" : "Pago único"}</dd>
                        </div>
                      </dl>
                      <button className="button secondary" onClick={() => open("quote", q.id)}>
                        Revisar propuesta <ArrowUpRight size={16} />
                      </button>
                    </article>
                  ))}
                {filter !== "Cotizaciones" &&
                  data.documents
                    .filter((d) => /contrat/i.test(d.category))
                    .map((d) => (
                      <article className="agreement-card" key={d.id}>
                        <div className="service-top">
                          <span className="service-icon green">
                            <ShieldCheck size={27} />
                          </span>
                          <Badge tone="neutral">Compartido</Badge>
                        </div>
                        <p className="eyebrow">CONTRATO</p>
                        <h2>{d.title}</h2>
                        <p>{d.description}</p>
                        <button className="button secondary" onClick={() => open("document", d.id)}>
                          Ver contrato <ArrowUpRight size={16} />
                        </button>
                      </article>
                    ))}
              </div>
              {data.quotes.length === 0 &&
                data.documents.filter((d) => /contrat/i.test(d.category)).length === 0 &&
                empty("Acuerdos claros para construir juntos.")}
            </>
          )}
          {(section === "documentos" || section === "informes") && (
            <>
              <div className="document-toolbar">
                <label className="inline-search">
                  <Search size={17} />
                  <input
                    aria-label="Buscar documentos"
                    placeholder="Buscar un documento…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <section className="panel">
                {documentRows(
                  data.documents.filter(
                    (d) =>
                      (section !== "informes" ||
                        /informe|mantenc/i.test(d.category + " " + d.title)) &&
                      d.title.toLowerCase().includes(query.toLowerCase()),
                  ),
                )}
              </section>
            </>
          )}
          {section === "asistencia" && (
            <>
              <div className="tabs">
                {["Solicitudes", "Conversaciones", "Pedidos"].map((t) => (
                  <button key={t} className={tab === t ? "selected" : ""} onClick={() => setTab(t)}>
                    {t}
                  </button>
                ))}
              </div>
              {tab === "Solicitudes" ? (
                <section className="panel">
                  {data.tickets.length
                    ? data.tickets.map((t) => (
                        <button
                          className="ticket-row"
                          key={t.id}
                          onClick={() => open("ticket", t.id)}
                        >
                          <span className="ticket-icon">
                            <MessageSquare size={20} />
                          </span>
                          <span className="row-text">
                            <b>{t.title}</b>
                            <small>
                              {t.category} · {date(t.date)}
                            </small>
                          </span>
                          <Badge tone="neutral">{label(t.status)}</Badge>
                          <ChevronRight size={16} />
                        </button>
                      ))
                    : empty(
                        "Tu equipo está aquí para ayudarte.",
                        "Puedes abrir una solicitud y seguir sus respuestas desde este espacio.",
                      )}
                </section>
              ) : tab === "Pedidos" ? (
                <section className="panel">
                  {data.requests.length
                    ? data.requests.map((r) => (
                        <div className="document-row" key={r.id}>
                          <span className="document-icon">
                            <FileText size={20} />
                          </span>
                          <span className="row-text">
                            <b>{r.title}</b>
                            <small>
                              {r.details} · {date(r.date)}
                            </small>
                          </span>
                          <Badge tone="neutral">{label(r.status)}</Badge>
                        </div>
                      ))
                    : empty("Sin pedidos registrados.")}
                </section>
              ) : (
                <section className="panel">
                  <div className="section-heading">
                    <h2>Conversaciones con Zyteron</h2>
                    <button className="button secondary" onClick={() => open("communication")}>
                      <Plus size={16} />
                      Nuevo mensaje
                    </button>
                  </div>
                  {data.communications.length
                    ? data.communications.map((c) => (
                        <article className="message" key={c.id}>
                          <span className="avatar">
                            {c.direction === "OUTBOUND" ? "ZY" : initials(user.name)}
                          </span>
                          <div>
                            <strong>
                              {c.direction === "OUTBOUND" ? "Equipo Zyteron" : "Tú"} · {c.subject}
                            </strong>
                            <p>{c.message}</p>
                            <small>{date(c.date)}</small>
                          </div>
                        </article>
                      ))
                    : empty("Conversemos sobre tu próximo paso.")}
                  {data.webThreads.map((t) => (
                    <div key={t.id}>
                      <h3>{t.subject || "Conversación de la web"}</h3>
                      {data.webMessages
                        .filter((m) => m.thread_id === t.id)
                        .sort((a, b) => a.created_at.localeCompare(b.created_at))
                        .map((m) => (
                          <article className="message" key={m.id}>
                            <span className="avatar">
                              {m.direction === "INBOUND" ? initials(user.name) : "ZY"}
                            </span>
                            <div>
                              <strong>
                                {m.direction === "INBOUND"
                                  ? "Tú"
                                  : m.actor_kind === "AI"
                                    ? "Zara · Asistente IA"
                                    : "Equipo Zyteron"}
                              </strong>
                              <p>{m.body_text}</p>
                              <small>{date(m.created_at)}</small>
                            </div>
                          </article>
                        ))}
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {section === "credenciales" && (
            <>
              <section className="panel">
                {data.credentials.length
                  ? data.credentials.map((c) => (
                      <div className="document-row" key={c.id}>
                        <span className="document-icon">
                          <KeyRound size={20} />
                        </span>
                        <span className="row-text">
                          <b>{c.name}</b>
                          <small>
                            {c.username} · {c.project}
                          </small>
                          <span>{c.masked || "Sin secreto configurado"}</span>
                        </span>
                        <button
                          className="button secondary"
                          onClick={() => open("credential", c.id)}
                        >
                          Gestionar acceso <ArrowUpRight size={15} />
                        </button>
                      </div>
                    ))
                  : empty(
                      "Tus accesos, bajo control.",
                      "Todavía no hay credenciales compartidas con tu cuenta.",
                    )}
              </section>
              <div className="security-features">
                <span>
                  <LockKeyhole size={19} />
                  Acceso por recurso
                </span>
                <span>
                  <ShieldCheck size={19} />
                  Doble autorización
                </span>
                <span>
                  <Clock3 size={19} />
                  Visualización temporal
                </span>
              </div>
            </>
          )}
          {section === "monitoreo" && (
            <>
              <div className="monitor-summary">
                <div className="monitor-status">
                  <Monitor size={26} />
                  <div>
                    <h2>Visibilidad sobre tus servicios.</h2>
                    <p>Continuidad administrativa y cobertura pagada.</p>
                  </div>
                </div>
                <button className="button secondary" onClick={() => window.location.reload()}>
                  Actualizar <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="services-grid">
                {data.services.map((s) => {
                  const sub = subscriptions.find((x) => x.quoteId === s.quoteId);
                  return (
                    <article className="service-card" key={s.id}>
                      <div className="service-top">
                        <span className="service-icon green">
                          <Globe2 size={27} />
                        </span>
                        <Badge tone="neutral">{label(s.status)}</Badge>
                      </div>
                      <h2>{s.name}</h2>
                      <p>
                        {sub ? `Suscripción: ${label(sub.state)}` : "Sin suscripción vinculada"}
                      </p>
                      {s.continuity && (
                        <p>
                          Continuidad:{" "}
                          <b>
                            {s.continuity === "MAINTENANCE"
                              ? "Modo mantención autorizado"
                              : s.continuity === "REVIEW_REQUIRED"
                                ? "Revisión requerida"
                                : sub?.state === "CANCELLED"
                                  ? "Cobertura pagada vigente"
                                  : "Servicio vigente"}
                          </b>
                        </p>
                      )}
                      <dl>
                        <div>
                          <dt>Cobertura pagada</dt>
                          <dd>
                            {sub?.paidThrough ? date(sub.paidThrough) : "Sin período acreditado"}
                          </dd>
                        </div>
                        <div>
                          <dt>Medición técnica</dt>
                          <dd>Sin medición publicada</dd>
                        </div>
                      </dl>
                      <button className="text-button" onClick={() => open("service", s.id)}>
                        Ver continuidad <ArrowUpRight size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
              {!data.services.length && empty("Tus activos tendrán su lugar aquí.")}
              <div className="info-note">
                <Info size={17} />
                El estado de contratación no representa una medición de disponibilidad. Las métricas
                se publican cuando existe una fuente técnica conectada.
              </div>
            </>
          )}
          {section === "agenda" && (
            <div className="agenda-layout">
              <section className="panel">{eventRows()}</section>
              <aside className="agenda-note">
                <CalendarDays size={28} />
                <h2>Los próximos pasos, juntos.</h2>
                <p>
                  Compromisos compartidos por Zyteron. Solicita una reunión para coordinar una
                  fecha.
                </p>
                <button className="button secondary" onClick={() => open("meeting")}>
                  Coordinar reunión <ArrowUpRight size={16} />
                </button>
              </aside>
            </div>
          )}
          {section === "notificaciones" && (
            <section className="panel">
              {data.notifications.length
                ? data.notifications.map((n) => (
                    <div
                      className={`notification-row ${!n.read && !read.includes(n.id) ? "unread" : ""}`}
                      key={n.id}
                    >
                      <span className="document-icon">
                        <Bell size={20} />
                      </span>
                      <span className="row-text">
                        <b>{n.title}</b>
                        <small>{n.text}</small>
                        <span>{date(n.date)}</span>
                      </span>
                      {!n.read && !read.includes(n.id) && (
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`Marcar como leída: ${n.title}`}
                          onClick={() => void mark([n.id])}
                        >
                          <CheckCheck size={18} />
                        </button>
                      )}
                      {n.link?.startsWith("/clientes/panel") && (
                        <Link className="text-button" href={n.link}>
                          Ver detalle <ArrowUpRight size={15} />
                        </Link>
                      )}
                    </div>
                  ))
                : empty(
                    "Todo tranquilo por aquí.",
                    "Las novedades de tu cuenta aparecerán en este espacio.",
                  )}
            </section>
          )}
          {section === "empresa" && (
            <>
              <div className="company-banner">
                <span className="company-monogram">{initials(company)}</span>
                <div>
                  <p className="eyebrow">TU EMPRESA</p>
                  <h2>{company}</h2>
                  <p>Construyendo nuevas perspectivas.</p>
                </div>
                <Badge tone="neutral">Cuenta vinculada</Badge>
              </div>
              <div className="company-columns">
                <section className="panel">
                  <h2>Datos de la empresa</h2>
                  <dl className="detail-list">
                    {[
                      ["Empresa", company],
                      ["Identificación tributaria", user.rut || "Por completar"],
                      ["Correo de contacto", user.email],
                      ["Dirección", user.address || "Por completar"],
                      ["Zona horaria", "America/Santiago"],
                    ].map(([a, b]) => (
                      <div key={a}>
                        <dt>{a}</dt>
                        <dd>{b}</dd>
                      </div>
                    ))}
                  </dl>
                  <button className="button secondary" onClick={() => open("company")}>
                    Solicitar actualización <ArrowUpRight size={16} />
                  </button>
                </section>
                <section className="panel">
                  <h2>Responsable de tu cuenta</h2>
                  <div className="member-row">
                    <span className="avatar">{initials(user.name)}</span>
                    <span>
                      <b>{user.name}</b>
                      <small>{user.email}</small>
                    </span>
                  </div>
                  <p className="subtle">
                    Los cambios de titularidad y acceso se revisan con Zyteron.
                  </p>
                  <button className="text-button" onClick={() => open("company")}>
                    Solicitar otro contacto <ArrowRight size={15} />
                  </button>
                </section>
              </div>
            </>
          )}
          {section === "perfil" && (
            <>
              <div className="profile-header">
                <span className="avatar profile-large">{initials(user.name)}</span>
                <div>
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                  <Badge>Correo verificado</Badge>
                </div>
              </div>
              <div className="company-columns">
                <section className="panel">
                  <h2>Tu información</h2>
                  <form
                    className="connected-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = Object.fromEntries(new FormData(e.currentTarget));
                      void send("/api/portal/account/profile", f, "PATCH");
                    }}
                  >
                    <label>
                      Nombre
                      <input
                        name="firstName"
                        minLength={2}
                        maxLength={80}
                        required
                        defaultValue={user.firstName}
                      />
                    </label>
                    <label>
                      Apellido
                      <input
                        name="lastName"
                        minLength={2}
                        maxLength={80}
                        required
                        defaultValue={user.lastName}
                      />
                    </label>
                    <label>
                      Empresa
                      <input name="company" maxLength={160} defaultValue={user.company} />
                    </label>
                    <label>
                      Teléfono
                      <input name="phone" maxLength={40} defaultValue={user.phone} />
                    </label>
                    <button className="button primary" disabled={busy}>
                      Guardar mis datos <Check size={16} />
                    </button>
                  </form>
                </section>
                <section className="panel">
                  <h2>Seguridad de tu cuenta</h2>
                  <div className="security-setting">
                    <KeyRound size={21} />
                    <div>
                      <b>Contraseña</b>
                      <p>Actualiza tu clave de acceso.</p>
                    </div>
                    <button className="text-button" onClick={() => open("password")}>
                      Gestionar <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="security-setting">
                    <ShieldCheck size={21} />
                    <div>
                      <b>Credenciales protegidas</b>
                      <p>Proyecto pagado, contraseña y código a tu correo para consultar accesos.</p>
                    </div>
                  </div>
                  <div className="security-setting">
                    <Monitor size={21} />
                    <div>
                      <b>Tu sesión</b>
                      <p>Al cambiar la contraseña se invalidan las sesiones anteriores.</p>
                    </div>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => void signOut({ callbackUrl: "/clientes/login" })}
                  >
                    Cerrar sesión <ArrowUpRight size={16} />
                  </button>
                </section>
              </div>
            </>
          )}
          {error && !modal && (
            <p className="connected-error" role="alert">
              {error}
            </p>
          )}
          <footer className="workspace-footer">
            <span>
              Hecho para avanzar contigo. <b>zyteron.</b>
            </span>
            <span>Actualizado · {date(data.asOf)}</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {sections
          .filter((s) => ["inicio", "proyectos", "asistencia"].includes(s.id))
          .map((s) => (
            <button
              key={s.id}
              className={section === s.id ? "active" : ""}
              onClick={() => go(s.id)}
            >
              <Icon name={s.icon} size={21} />
              <span>{s.label}</span>
            </button>
          ))}
        <button onClick={() => open("menu")}>
          <Menu size={21} />
          <span>Más</span>
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <Modal
          title={
            (
              {
                support: "¿En qué te acompañamos?",
                communication: "Conversemos",
                meeting: "Coordinar una reunión",
                company: "Actualizar mi empresa",
                password: "Cambiar contraseña",
                credential: "Acceso protegido",
                checkout: "Revisar tu pago",
                cancel: "Cancelar suscripción",
                search: "Buscar en tu portal",
                organization: "Tu espacio de trabajo",
                project: "Tu proyecto",
                service: "Tu servicio",
                document: "Documento compartido",
                quote: "Tu propuesta",
                invoice: "Detalle de la obligación",
                ticket: "Tu solicitud",
                event: "Próximo compromiso",
                menu: "Tu portal",
              } as Record<string, string>
            )[modal.kind] || "Tu espacio"
          }
          onClose={() => {
            if (!busy) {
              setModal(null);
                        setError("");
            }
          }}
        >
          {modal.kind === "menu" && <div className="mobile-menu-grid">{nav()}</div>}
          {modal.kind === "organization" && (
            <>
              <div className="company-banner">
                <span className="company-monogram">{initials(company)}</span>
                <div>
                  <h2>{company}</h2>
                  <p>{user.email}</p>
                </div>
                <Badge>Cuenta vinculada</Badge>
              </div>
              <button className="button secondary" onClick={() => go("empresa")}>
                Ver mi empresa <ArrowUpRight size={16} />
              </button>
            </>
          )}
          {modal.kind === "search" && (
            <>
              <label className="modal-search">
                <Search size={20} />
                <input
                  autoFocus
                  aria-label="Buscar"
                  placeholder="Documentos, proyectos, servicios…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="search-results">
                {[
                  ...data.projects.map((p) => ({ id: p.id, title: p.title, kind: "project" })),
                  ...data.documents.map((d) => ({ id: d.id, title: d.title, kind: "document" })),
                  ...data.services.map((s) => ({ id: s.id, title: s.name, kind: "service" })),
                  ...data.tickets.map((t) => ({ id: t.id, title: t.title, kind: "ticket" })),
                ]
                  .filter(
                    (x) => query.length > 1 && x.title.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((x) => (
                    <button
                      className="document-row"
                      key={x.kind + x.id}
                      onClick={() => open(x.kind, x.id)}
                    >
                      <span className="row-text">
                        <b>{x.title}</b>
                        <small>Recurso de tu cuenta</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
              </div>
              <p className="subtle">Busca entre los recursos compartidos con tu cuenta.</p>
            </>
          )}
          {["support", "communication", "meeting", "company"].includes(modal.kind) && (
            <form
              className="connected-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                const kind = modal.kind;
                void send(
                  kind === "support"
                    ? "/api/portal/tickets"
                    : kind === "communication"
                      ? "/api/portal/communications"
                      : "/api/portal/requests",
                  kind === "support"
                    ? {
                        title: f.title,
                        description: f.details,
                        category: f.category,
                        priority: "NORMAL",
                      }
                    : kind === "communication"
                      ? { subject: f.title, message: f.details }
                      : {
                          type: kind === "meeting" ? "MEETING" : "PROFILE_UPDATE",
                          title: f.title,
                          details: f.details,
                        },
                );
              }}
            >
              <p className="subtle">
                El equipo de Zyteron recibirá tu mensaje y podrás seguirlo en Asistencia.
              </p>
              <label>
                Asunto
                <input
                  name="title"
                  minLength={4}
                  maxLength={140}
                  required
                  defaultValue={
                    modal.kind === "meeting"
                      ? "Coordinar reunión"
                      : modal.kind === "company"
                        ? "Actualizar datos de mi empresa"
                        : ""
                  }
                />
              </label>
              {modal.kind === "support" && (
                <label>
                  Tipo de solicitud
                  <select name="category">
                    <option>Asistencia técnica</option>
                    <option>Incidencia</option>
                    <option>Nueva solicitud</option>
                    <option>Consulta de facturación</option>
                  </select>
                </label>
              )}
              <label>
                Cuéntanos el detalle
                <textarea
                  name="details"
                  rows={5}
                  minLength={10}
                  maxLength={5000}
                  required
                  placeholder={
                    modal.kind === "meeting"
                      ? "Indica motivo y fechas en que puedes reunirte…"
                      : "Lo que necesitas y el contexto que nos ayude a resolverlo…"
                  }
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Volver
                </button>
                <button className="button primary" disabled={busy}>
                  <Send size={16} />
                  {busy ? "Enviando…" : "Enviar a Zyteron"}
                </button>
              </div>
            </form>
          )}
          {modal.kind === "password" && (
            <form
              className="connected-form"
              onSubmit={(e) => {
                e.preventDefault();
                void send(
                  "/api/portal/account/change-password",
                  Object.fromEntries(new FormData(e.currentTarget)),
                ).then((b) => {
                  if (b) void signOut({ callbackUrl: "/clientes/login" });
                });
              }}
            >
              <label>
                Contraseña actual
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  maxLength={256}
                  required
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={256}
                  required
                />
              </label>
              <label>
                Confirma la nueva contraseña
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={256}
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                Actualizar contraseña <ShieldCheck size={16} />
              </button>
            </form>
          )}
          {modal.kind === "credential" &&
            data.credentials
              .filter((c) => c.id === modal.id)
              .map((c) => (
                <CredentialAccessForm key={c.id} credentialId={c.id} name={c.name} project={c.project} access={c.access} />
              ))}
          {modal.kind === "checkout" && selectedQuote && (
            <form
              className="connected-form"
              onSubmit={(e) => {
                e.preventDefault();
                const monthly = selectedQuote.billingType === "SUBSCRIPTION";
                const f = Object.fromEntries(new FormData(e.currentTarget));
                if (monthly && !challenge) {
                  void send(
                    `/api/portal/payments/recurring/${selectedQuote.id}`,
                    { action: "send-start-code" },
                    "POST",
                    false,
                  ).then((b) => {
                    if (b?.challengeId) {
                      setChallenge(b.challengeId);
                      setToast("Código de autorización enviado a tu correo.");
                    }
                  });
                  return;
                }
                void send(
                  `/api/portal/payments/quotes/${selectedQuote.id}/${monthly ? "subscription/start" : "flow/create"}`,
                  {
                    acceptTerms: true,
                    acceptPrivacy: true,
                    ...(monthly ? { challengeId: challenge, code: f.code } : {}),
                  },
                  "POST",
                  false,
                ).then((b) => {
                  const value = b?.checkoutUrl || b?.redirectUrl;
                  if (value) {
                    try {
                      const target = new URL(value);
                      if (
                        target.protocol === "https:" &&
                        (target.hostname === "flow.cl" || target.hostname.endsWith(".flow.cl"))
                      )
                        window.location.assign(target.href);
                      else setError("No se recibió una dirección de pago autorizada.");
                    } catch {
                      setError("No se recibió una dirección de pago válida.");
                    }
                  }
                });
              }}
            >
              <div className="flow-review">
                <h3>Un paso más cerca de estar al día.</h3>
                <p>Revisa el documento antes de continuar al pago seguro.</p>
                <div className="checkout-document">
                  <span>
                    <Wallet size={23} />
                  </span>
                  <div>
                    <small>TU DOCUMENTO</small>
                    <b>{selectedQuote.number}</b>
                  </div>
                  <strong>
                    {money(
                      selectedQuote.billingType === "SUBSCRIPTION"
                        ? selectedQuote.subscription?.amount || selectedQuote.total
                        : selectedQuote.stages.find(
                            (s) => s.dueEnabled && s.channel === "FLOW" && s.status !== "PAID",
                          )?.amount || selectedQuote.total,
                    )}
                    <small>CLP</small>
                  </strong>
                </div>
                <ol className="checkout-steps">
                  <li>
                    <span>1</span>
                    <div>
                      <b>Revisa tu pago</b>
                      <small>Validamos tu saldo y permisos.</small>
                    </div>
                    <Check size={16} />
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <b>Realiza tu pago</b>
                      <small>Continuarás en esta misma pestaña.</small>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <b>Recibe la confirmación</b>
                      <small>Solo al verificar el pago efectivo.</small>
                    </div>
                  </li>
                </ol>
              </div>
              <label className="connected-check">
                <input type="checkbox" required />
                <span>
                  Acepto los{" "}
                  <a href="/terminos" target="_blank" rel="noreferrer">
                    términos y condiciones
                  </a>{" "}
                  y la{" "}
                  <a href="/privacidad" target="_blank" rel="noreferrer">
                    política de privacidad
                  </a>
                  {selectedQuote.billingType === "SUBSCRIPTION"
                    ? " y autorizo cargos mensuales por el importe indicado"
                    : ""}
                  .
                </span>
              </label>
              {selectedQuote.billingType === "SUBSCRIPTION" && challenge && (
                <label>
                  Código enviado a tu correo
                  <input
                    name="code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </label>
              )}
              <button
                className="button primary"
                disabled={busy || !selectedQuote.payable || selectedQuote.total <= 0}
              >
                <CreditCard size={17} />
                {busy
                  ? "Preparando pago…"
                  : selectedQuote.billingType === "SUBSCRIPTION"
                    ? challenge
                      ? "Continuar con autorización mensual"
                      : "Enviar código de autorización"
                    : "Continuar al pago seguro"}
              </button>
              <p className="source-note">
                No recibimos datos de tarjeta. Regresar del pago no acredita una transacción.
              </p>
            </form>
          )}
          {modal.kind === "cancel" && selectedQuote?.subscription && (
            <form
              className="connected-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                void send(
                  `/api/portal/payments/recurring/${selectedQuote.id}`,
                  challenge
                    ? { action: "cancel", challengeId: challenge, code: f.code }
                    : { action: "send-code" },
                  "POST",
                  false,
                ).then((b) => {
                  if (b?.challengeId) setChallenge(b.challengeId);
                  else if (b) window.location.reload();
                });
              }}
            >
              <div className="info-note">
                <ShieldCheck size={17} />
                Zyteron recibirá un aviso. La mantención continúa hasta terminar la cobertura ya
                pagada; las obligaciones pendientes siguen vigentes.
              </div>
              <p>
                Cobertura acreditada: <b>{date(selectedQuote.subscription.paidThrough)}</b>
              </p>
              {challenge && (
                <label>
                  Código enviado a tu correo
                  <input
                    name="code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </label>
              )}
              <div className="modal-actions">
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Conservar plan
                </button>
                <button className="button primary" disabled={busy}>
                  {challenge ? "Confirmar cancelación" : "Enviar código de confirmación"}
                </button>
              </div>
            </form>
          )}
          {modal.kind === "quote" && selectedQuote && (
            <>
              <div className="detail-intro">
                <span className="service-icon orange">
                  <FileCheck2 size={28} />
                </span>
                <div>
                  <p className="eyebrow">{selectedQuote.number}</p>
                  <h3>{selectedQuote.title}</h3>
                  <Badge tone="neutral">{label(selectedQuote.status)}</Badge>
                </div>
              </div>
              {data.payments.some((p) => p.quoteId === selectedQuote.id) && (
                <div className="purchase-result confirmed">
                  <span>
                    <CheckCheck size={27} />
                  </span>
                  <div>
                    <h3>Tu pago quedó confirmado.</h3>
                    <p>El importe recibido está registrado en tu cuenta.</p>
                    {data.payments
                      .filter((p) => p.quoteId === selectedQuote.id && p.receipt)
                      .map((p) => (
                        <a
                          className="text-button"
                          key={p.id}
                          href={`/api/portal/payments/receipts/${p.id}`}
                        >
                          <Download size={15} />
                          Comprobante PDF · {money(p.amount)}
                        </a>
                      ))}
                  </div>
                </div>
              )}
              {selectedQuote.stages.some((s) => s.status === "REJECTED") && (
                <div className="purchase-result rejected">
                  <span>
                    <X size={27} />
                  </span>
                  <div>
                    <h3>Este intento de pago fue rechazado.</h3>
                    <p>
                      El intento rechazado no acredita un cobro. Puedes revisar tu medio de pago e
                      intentarlo nuevamente.
                    </p>
                  </div>
                </div>
              )}
              {selectedQuote.stages.some((s) => s.status === "PROCESSING") && (
                <div className="purchase-result pending">
                  <span>
                    <Clock3 size={27} />
                  </span>
                  <div>
                    <h3>Tu pago sigue en verificación.</h3>
                    <p>La confirmación aparecerá cuando termine la revisión.</p>
                    <button className="text-button" onClick={() => window.location.reload()}>
                      Consultar nuevamente <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
              )}
              <dl className="detail-list">
                <div>
                  <dt>Importe</dt>
                  <dd>
                    {selectedQuote.total > 0
                      ? money(selectedQuote.total)
                      : "Pendiente de confirmación"}
                  </dd>
                </div>
                <div>
                  <dt>Emisión</dt>
                  <dd>{date(selectedQuote.createdAt)}</dd>
                </div>
                <div>
                  <dt>Modalidad</dt>
                  <dd>
                    {selectedQuote.billingType === "SUBSCRIPTION"
                      ? "Suscripción mensual"
                      : "Pago único"}
                  </dd>
                </div>
              </dl>
              {selectedQuote.stages.map((s) => (
                <div className="document-row" key={s.key}>
                  <span className="row-text">
                    <b>{s.label}</b>
                    <small>{money(s.amount)}</small>
                  </span>
                  <Badge tone="neutral">{label(s.status)}</Badge>
                </div>
              ))}
              <div className="modal-actions">
                <a className="button secondary" href={`/api/portal/quotes/${selectedQuote.id}/pdf`}>
                  <Download size={16} />
                  Descargar propuesta
                </a>
                {selectedQuote.payable && selectedQuote.total > 0 && (
                  <button
                    className="button primary"
                    onClick={() => open("checkout", selectedQuote.id)}
                  >
                    <CreditCard size={16} />
                    Revisar pago
                  </button>
                )}
              </div>
            </>
          )}
          {modal.kind === "invoice" &&
            data.invoices
              .filter((i) => i.id === modal.id)
              .map((i) => (
                <div key={i.id}>
                  <div className="detail-intro">
                    <span className="service-icon orange">
                      <Wallet size={27} />
                    </span>
                    <div>
                      <h3>{i.concept}</h3>
                      <Badge tone="neutral">{i.status}</Badge>
                    </div>
                  </div>
                  <dl className="detail-list">
                    <div>
                      <dt>Importe</dt>
                      <dd>{money(i.total, i.currency)}</dd>
                    </div>
                    <div>
                      <dt>Saldo</dt>
                      <dd>{money(i.balance, i.currency)}</dd>
                    </div>
                    <div>
                      <dt>Vencimiento</dt>
                      <dd>{date(i.due)}</dd>
                    </div>
                  </dl>
                  {i.quoteId && data.quotes.some((q) => q.id === i.quoteId) ? (
                    <button className="button primary" onClick={() => open("quote", i.quoteId!)}>
                      Revisar documento de origen <ArrowUpRight size={16} />
                    </button>
                  ) : (
                    <button className="button secondary" onClick={() => open("support")}>
                      Consultar opciones de pago
                    </button>
                  )}
                </div>
              ))}
          {modal.kind === "document" &&
            data.documents
              .filter((d) => d.id === modal.id)
              .map((d) => (
                <div key={d.id}>
                  <div className="detail-intro">
                    <span className="service-icon green">
                      <FileText size={28} />
                    </span>
                    <div>
                      <p className="eyebrow">{d.category}</p>
                      <h3>{d.title}</h3>
                    </div>
                  </div>
                  <p>{d.description}</p>
                  <dl className="detail-list">
                    <div>
                      <dt>Publicado</dt>
                      <dd>{date(d.date)}</dd>
                    </div>
                    <div>
                      <dt>Archivo</dt>
                      <dd>{d.fileName || d.title}</dd>
                    </div>
                  </dl>
                  <a className="button primary" href={`/api/portal/documents/${d.id}/download`}>
                    <Download size={17} />
                    Descargar documento
                  </a>
                </div>
              ))}
          {modal.kind === "ticket" &&
            data.tickets
              .filter((t) => t.id === modal.id)
              .map((t) => (
                <div key={t.id}>
                  <div className="detail-intro">
                    <span className="service-icon green">
                      <MessageSquare size={27} />
                    </span>
                    <div>
                      <h3>{t.title}</h3>
                      <Badge tone="neutral">{label(t.status)}</Badge>
                    </div>
                  </div>
                  <div className="conversation">
                    {t.messages.map((m) => (
                      <article className="message" key={m.id}>
                        <span className="avatar">
                          {m.actor === "Tú" ? initials(user.name) : "ZY"}
                        </span>
                        <div>
                          <strong>{m.actor}</strong>
                          <p>{m.text}</p>
                          <small>{date(m.date)}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!["CLOSED", "RESOLVED"].includes(t.status) && (
                    <form
                      className="connected-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send(
                          `/api/portal/tickets/${t.id}/messages`,
                          Object.fromEntries(new FormData(e.currentTarget)),
                        );
                      }}
                    >
                      <label>
                        Tu respuesta
                        <textarea name="message" minLength={2} maxLength={5000} rows={3} required />
                      </label>
                      <button className="button primary" disabled={busy}>
                        <Send size={16} />
                        Enviar respuesta
                      </button>
                    </form>
                  )}
                </div>
              ))}
          {modal.kind === "project" &&
            data.projects
              .filter((p) => p.id === modal.id)
              .map((p) => (
                <div key={p.id}>
                  <ProjectArt />
                  <div className="detail-intro">
                    <h3>{p.title}</h3>
                    <Badge tone="neutral">{label(p.status)}</Badge>
                  </div>
                  <p>{p.description}</p>
                  <dl className="detail-list">
                    <div>
                      <dt>Alcance compartido</dt>
                      <dd>{p.scope || "Por publicar"}</dd>
                    </div>
                    <div>
                      <dt>Inicio</dt>
                      <dd>{date(p.start)}</dd>
                    </div>
                    <div>
                      <dt>Entrega prevista</dt>
                      <dd>{date(p.end)}</dd>
                    </div>
                  </dl>
                  <button className="button primary" onClick={() => open("support")}>
                    Conversemos sobre el proyecto <ArrowRight size={16} />
                  </button>
                </div>
              ))}
          {modal.kind === "service" &&
            data.services
              .filter((s) => s.id === modal.id)
              .map((s) => (
                <div key={s.id}>
                  <div className="detail-intro">
                    <span className="service-icon green">
                      <Globe2 size={28} />
                    </span>
                    <div>
                      <h3>{s.name}</h3>
                      <Badge tone="neutral">{label(s.status)}</Badge>
                    </div>
                  </div>
                  <p>{s.description}</p>
                  <dl className="detail-list">
                    <div>
                      <dt>Importe acordado</dt>
                      <dd>{s.price === null ? "Por confirmar" : money(s.price, s.currency)}</dd>
                    </div>
                    <div>
                      <dt>Frecuencia</dt>
                      <dd>{label(s.frequency)}</dd>
                    </div>
                    <div>
                      <dt>Renovación</dt>
                      <dd>{date(s.renewal)}</dd>
                    </div>
                  </dl>
                  <button className="button secondary" onClick={() => open("support")}>
                    Consultar mi servicio <ArrowUpRight size={16} />
                  </button>
                </div>
              ))}
          {modal.kind === "event" &&
            data.events
              .filter((e) => e.id === modal.id)
              .map((e) => (
                <div key={e.id}>
                  <div className="detail-intro">
                    <span className="service-icon green">
                      <CalendarDays size={28} />
                    </span>
                    <div>
                      <h3>{e.title}</h3>
                      <p>{date(e.date)}</p>
                    </div>
                  </div>
                  <p>{e.description}</p>
                  <button className="button secondary" onClick={() => open("meeting")}>
                    Coordinar con Zyteron <ArrowUpRight size={16} />
                  </button>
                </div>
              ))}
          {error && (
            <p className="connected-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Plus,
  Search,
  Users,
  FolderKanban,
  ReceiptText,
  Headphones,
  ShieldCheck,
  FileText,
  MessageSquare,
  Check,
  Download,
  X,
  Send,
  CircleDollarSign,
  ChevronRight,
} from "lucide-react";
import type { ControlData } from "@/lib/client-experience/control-snapshot";
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
const titles: Record<string, string> = {
  inicio: "Resumen ejecutivo",
  clientes: "Cliente 360°",
  contactos: "CRM y contactos",
  cotizaciones: "Cotizaciones",
  entradas: "Entradas de la web",
  proyectos: "Proyectos",
  finanzas: "Cobros y pagos",
  documentos: "Repositorio de clientes",
  servicios: "Servicios contratados",
  agenda: "Agenda compartida",
  conversaciones: "Conversaciones de la web",
  asistencia: "Asistencia técnica",
  actividad: "Actividad operacional",
  auditoria: "Registro de auditoría",
};
const labels: Record<string, string> = {
  ACTIVE: "Activo",
  DISABLED: "Deshabilitado",
  PENDING_VERIFICATION: "Correo pendiente",
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
  PROCESSING: "En verificación",
  NEW: "Nuevo",
  OPEN: "Abierta",
  IN_PROGRESS: "En curso",
  WAITING_CLIENT: "Espera respuesta",
  RESOLVED: "Resuelta",
  CLOSED: "Cerrada",
  WON: "Cierre comercial",
  SENT: "Enviada",
  LOST: "Cerrada",
  PLANNED: "Planificado",
  DONE: "Entregado",
  CANCELLED: "Cancelado",
  PENDING_ACTIVATION: "Por activar",
  COMPLETED: "Completado",
  SERVICE: "Servicio",
  EVENT: "Agenda",
};
const label = (s: string | null) => (s ? labels[s] || s : "Por confirmar");
function Status({ value }: { value: string | null }) {
  return (
    <span
      className={`statusBadge ${["ACTIVE", "CONFIRMED", "DONE", "COMPLETED", "RESOLVED"].includes(value || "") ? "success" : "neutral"}`}
    >
      {label(value)}
    </span>
  );
}
function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return rows.length ? (
    <div className="dataTableWrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, n) => (
                <td key={n}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="enterpriseEmptyState">
      <span>
        <FileText size={24} />
      </span>
      <strong>Tu próximo registro empieza aquí.</strong>
      <p>No hay registros que coincidan con esta vista.</p>
    </div>
  );
}
function Dialog({
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
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className="controlDialog"
      aria-labelledby="control-dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <div>
          <p className="clientKicker">ZYTERON CONTROL</p>
          <h2 id="control-dialog-title">{title}</h2>
        </div>
        <button aria-label="Cerrar ventana" onClick={onClose}>
          <X size={21} />
        </button>
      </header>
      <div className="controlDialogBody">{children}</div>
    </dialog>
  );
}
type Modal = { kind: string; id?: string; userId?: string } | null;
type Item = {
  description: string;
  qty: number;
  unitPrice: number;
  detail?: string;
  unit?: string;
  discountPct?: number;
};
export default function Workspace({
  data,
  section = "inicio",
  initialId = "",
  initialSearch = "",
  initialAction = "",
}: {
  data: ControlData;
  section?: string;
  initialId?: string;
  initialSearch?: string;
  initialAction?: string;
}) {
  const [query, setQuery] = useState(initialSearch),
    [filter, setFilter] = useState("Todos"),
    [modal, setModal] = useState<Modal>(
      section === "cotizaciones" && initialId
        ? { kind: "quoteDetail", id: initialId }
        : initialAction === "nuevo"
          ? {
              kind:
                section === "clientes"
                  ? "client"
                  : section === "cotizaciones"
                    ? "quote"
                    : "project",
            }
          : null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Resumen"),
    [clientId, setClientId] = useState(initialId),
    [threadId, setThreadId] = useState(initialId || data.threads[0]?.id || ""),
    [items, setItems] = useState<Item[]>([{ description: "", qty: 1, unitPrice: 0 }]);
  const client = data.users.find((u) => u.id === clientId),
    title = titles[section] || titles.inicio;
  const userName = (id: string | null) =>
    data.users.find((u) => u.id === id)?.company ||
    data.users.find((u) => u.id === id)?.name ||
    "Sin cliente vinculado";
  const matches = (...v: (string | null | undefined)[]) =>
    v.join(" ").toLowerCase().includes(query.toLowerCase());
  const state = (v: string | null) => filter === "Todos" || v === filter;
  const path = (s: string, id?: string) =>
    `/administracion/control/${s}${id ? `?id=${encodeURIComponent(id)}` : ""}`;
  function open(kind: string, id?: string, userId?: string) {
    setError("");
    setModal({ kind, id, userId });
    if (kind === "quote") {
      const q = data.quotes.find((q) => q.id === id);
      setItems(
        q?.items.length
          ? q.items.map((i) => ({
              description: i.description,
              qty: i.qty,
              unitPrice: i.unitPrice,
              detail: i.detail || "",
              unit: i.unit || "unidad",
              discountPct: i.discountPct || 0,
            }))
          : [{ description: "", qty: 1, unitPrice: 0 }],
      );
    }
  }
  async function send(url: string, body: unknown, method = "POST", multipart = false) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(url, {
        method,
        headers: multipart ? undefined : { "Content-Type": "application/json" },
        body: multipart ? (body as FormData) : JSON.stringify(body),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "No fue posible guardar.");
      window.location.reload();
      return b;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible guardar.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  const selectUser = (selected = "", name = "userId") => (
    <label>
      Cliente
      <select name={name} defaultValue={selected} required>
        <option value="">Selecciona un cliente</option>
        {data.users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.company || u.name || u.email} · {u.email}
          </option>
        ))}
      </select>
    </label>
  );
  const add =
    section === "clientes"
      ? "client"
      : section === "cotizaciones"
        ? "quote"
        : section === "proyectos"
          ? "project"
          : section === "servicios"
            ? "SERVICE"
            : section === "agenda"
              ? "EVENT"
              : section === "documentos"
                ? "document"
                : null;
  const action = (
    <div className="clientHeaderActions">
      <button onClick={() => window.location.reload()}>
        <ArrowUpRight size={15} />
        Actualizar
      </button>
      {add && (
        <button className="clientPrimaryButton" onClick={() => open(add)}>
          <Plus size={16} />
          {add === "document"
            ? "Compartir documento"
            : add === "quote"
              ? "Preparar cotización"
              : add === "client"
                ? "Crear acceso cliente"
                : add === "project"
                  ? "Nuevo proyecto"
                  : add === "SERVICE"
                    ? "Publicar servicio"
                    : "Coordinar compromiso"}
        </button>
      )}
    </div>
  );
  const quoteRows = (rows = data.quotes) =>
    rows
      .filter((q) => matches(q.name, q.company, q.number, q.title) && state(q.status))
      .map((q) => [
        <button className="controlRecord" key="q" onClick={() => open("quoteDetail", q.id)}>
          <strong>{q.number}</strong>
          <small>{q.title}</small>
        </button>,
        userName(q.userId),
        q.total > 0 ? money(q.total) : "Por preparar",
        <Status key="s" value={q.status} />,
        date(q.date),
        <button className="controlTextButton" key="a" onClick={() => open("quoteDetail", q.id)}>
          Abrir <ArrowUpRight size={14} />
        </button>,
      ]);
  const projectRows = (rows = data.projects) =>
    rows
      .filter((p) => matches(p.title, userName(p.clientId)) && state(p.status))
      .map((p) => [
        <button
          className="controlRecord"
          key="p"
          onClick={() => open("project", p.id, p.clientId || undefined)}
        >
          <strong>{p.title}</strong>
          <small>{p.serviceArea || "Proyecto digital"}</small>
        </button>,
        userName(p.clientId),
        <Status key="s" value={p.status} />,
        date(p.startDate),
        date(p.endDate),
        <button
          className="controlTextButton"
          key="a"
          onClick={() => open("project", p.id, p.clientId || undefined)}
        >
          Gestionar <ArrowUpRight size={14} />
        </button>,
      ]);
  const documentRows = (rows = data.documents) =>
    rows
      .filter((d) => matches(d.title, userName(d.userId), d.category))
      .map((d) => [
        <span className="controlRecord" key="d">
          <strong>{d.title}</strong>
          <small>{d.fileName || d.description}</small>
        </span>,
        userName(d.userId),
        d.category,
        date(d.createdAt),
        <a className="controlTextButton" key="a" href={`/api/portal/documents/${d.id}/download`}>
          <Download size={14} />
          Descargar
        </a>,
      ]);
  const resourceRows = (kind: string, rows = data.resources) =>
    rows
      .filter((r) => r.kind === kind && matches(r.title, userName(r.userId)))
      .map((r) => [
        <button className="controlRecord" key="r" onClick={() => open(r.kind, r.id, r.userId)}>
          <strong>{r.title}</strong>
          <small>{r.description}</small>
        </button>,
        userName(r.userId),
        kind === "SERVICE" ? money(r.price) : date(r.date),
        <Status key="s" value={r.status} />,
        <span className={`statusBadge ${r.published ? "success" : "neutral"}`} key="v">
          {r.published ? "Visible para cliente" : "Interno"}
        </span>,
        <button className="controlTextButton" key="a" onClick={() => open(r.kind, r.id, r.userId)}>
          Editar <ArrowUpRight size={14} />
        </button>,
      ]);
  const ticketRows = (rows = data.tickets) =>
    rows
      .filter((t) => matches(t.title, userName(t.userId)) && state(t.status))
      .map((t) => [
        <button className="controlRecord" key="t" onClick={() => open("ticket", t.id)}>
          <strong>{t.title}</strong>
          <small>
            {t.category} · {t.priority}
          </small>
        </button>,
        userName(t.userId),
        <Status key="s" value={t.status} />,
        date(t.updatedAt),
        <button className="controlTextButton" key="a" onClick={() => open("ticket", t.id)}>
          Responder <ArrowUpRight size={14} />
        </button>,
      ]);
  const workspace = (columns: string[], rows: ReactNode[][], statuses: string[] = []) => (
    <section className="clientWorkspace">
      <div className="clientToolbar">
        <label className="clientSearch">
          <Search size={17} />
          <input
            aria-label={`Buscar en ${title}`}
            placeholder="Buscar en esta vista…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {statuses.length > 0 && (
          <select
            aria-label="Filtrar por estado"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>Todos</option>
            {statuses.map((s) => (
              <option value={s} key={s}>
                {label(s)}
              </option>
            ))}
          </select>
        )}
        <span className="controlCount">{rows.length} registros</span>
      </div>
      <Table columns={columns} rows={rows} />
    </section>
  );
  const currentQuote = data.quotes.find((q) => q.id === modal?.id),
    currentProject = data.projects.find((p) => p.id === modal?.id),
    currentResource = data.resources.find((r) => r.id === modal?.id),
    currentTicket = data.tickets.find((t) => t.id === modal?.id),
    currentRequest = data.requests.find((r) => r.id === modal?.id),
    currentLead = data.leads.find((l) => l.id === modal?.id);
  const confirmed = data.payments.filter((p) => p.status === "CONFIRMED"),
    pendingQuotes = data.quotes.filter((q) => ["PENDING", "SENT"].includes(q.status || "")),
    openTickets = data.tickets.filter((t) => !["CLOSED", "RESOLVED"].includes(t.status));
  return (
    <main className={section === "inicio" ? "dashboardContent" : "clientHub"}>
      <header className="pageHeader">
        <div>
          <span className="phasePill">
            ZYTERON CONTROL · {section === "inicio" ? "CENTRO DE CONTROL" : "GESTIÓN CONECTADA"}
          </span>
          <h1>{title}</h1>
          <p>
            {section === "inicio"
              ? "Tu operación, tus clientes y cada siguiente paso, en un mismo lugar."
              : "Información conectada con zyteron.cl y el nuevo portal de clientes."}
          </p>
        </div>
        {action}
      </header>
      {section === "inicio" && (
        <>
          <section className="compactOverview">
            <div>
              <p className="eyebrow light">CENTRO DE CONTROL</p>
              <h2>
                Operación empresarial,
                <br />
                sin perder el contexto.
              </h2>
            </div>
            <div className="overviewValue">
              <span>Saldo pendiente registrado · CLP</span>
              <strong>
                {money(
                  data.debts.filter((d) => d.currency === "CLP").reduce((s, d) => s + d.balance, 0),
                )}
              </strong>
              <small>Pagos confirmados aplicados al saldo</small>
            </div>
          </section>
          <section className="executiveMetrics" aria-label="Indicadores ejecutivos">
            {[
              [
                "Clientes activos",
                String(data.users.filter((u) => u.accountStatus === "ACTIVE").length),
                "Accesos vinculados al portal",
                Users,
              ],
              [
                "Cotizaciones por resolver",
                String(pendingQuotes.length),
                "Pendientes y enviadas",
                ReceiptText,
              ],
              [
                "Proyectos registrados",
                String(data.projects.length),
                "Operación vinculada a clientes",
                FolderKanban,
              ],
              [
                "Pagos confirmados",
                money(confirmed.reduce((s, p) => s + p.amount, 0)),
                `${confirmed.length} transacciones registradas`,
                CircleDollarSign,
              ],
              [
                "Solicitudes abiertas",
                String(openTickets.length),
                "Atención y acompañamiento",
                Headphones,
              ],
              [
                "Conversaciones web",
                String(data.threads.length),
                "Historial del chat y equipo",
                MessageSquare,
              ],
            ].map(([a, b, c, Icon]) => {
              const I = Icon as typeof Users;
              return (
                <article key={String(a)}>
                  <span className="metricIcon">
                    <I size={18} />
                  </span>
                  <div>
                    <small>{String(a)}</small>
                    <strong>{String(b)}</strong>
                    <p>{String(c)}</p>
                  </div>
                </article>
              );
            })}
          </section>
          <div className="controlDashboardColumns">
            <section className="clientSection">
              <header className="clientSectionHeader">
                <div>
                  <p className="clientKicker">ATENCIÓN REQUERIDA</p>
                  <h2>De la web a tu equipo.</h2>
                  <p>Formularios, solicitudes y cotizaciones pendientes.</p>
                </div>
                <Link className="controlTextButton" href={path("entradas")}>
                  Abrir bandeja <ArrowUpRight size={15} />
                </Link>
              </header>
              <Table
                columns={["Entrada", "Origen", "Fecha", "Acción"]}
                rows={[
                  ...data.requests
                    .filter((r) => r.status === "PENDING")
                    .slice(0, 4)
                    .map((r) => [
                      r.title,
                      "Portal cliente",
                      date(r.createdAt),
                      <button
                        key="a"
                        className="controlTextButton"
                        onClick={() => open("request", r.id)}
                      >
                        Resolver <ChevronRight size={14} />
                      </button>,
                    ]),
                  ...data.leads.slice(0, 4).map((l) => [
                    l.name,
                    l.source || "Formulario web",
                    date(l.createdAt),
                    <button
                      key="a"
                      className="controlTextButton"
                      onClick={() => open("lead", l.id)}
                    >
                      Revisar <ChevronRight size={14} />
                    </button>,
                  ]),
                ]}
              />
            </section>
            <section className="clientSection">
              <header className="clientSectionHeader">
                <div>
                  <p className="clientKicker">ÚLTIMOS MOVIMIENTOS</p>
                  <h2>Cada acción, con contexto.</h2>
                </div>
              </header>
              <div className="controlActivity">
                {data.audit.slice(0, 6).map((a) => (
                  <article key={a.id}>
                    <span>
                      <ShieldCheck size={16} />
                    </span>
                    <div>
                      <strong>{a.action.replace(/_/g, " ").toLowerCase()}</strong>
                      <small>
                        {userName(a.targetUserId)} · {date(a.createdAt)}
                      </small>
                    </div>
                  </article>
                ))}
                {!data.audit.length && <p>Las acciones del equipo aparecerán aquí.</p>}
              </div>
            </section>
          </div>
        </>
      )}
      {section === "clientes" && (
        <>
          {client ? (
            <>
              <div className="domainHero">
                <div>
                  <span className="clientKicker">CLIENTE 360°</span>
                  <h2>{client.company || client.name}</h2>
                  <p>
                    {client.name} · {client.email}
                  </p>
                </div>
                <div className="clientHeaderActions">
                  <button
                    onClick={() => {
                      setClientId("");
                      setTab("Resumen");
                      window.history.replaceState({}, "", path("clientes"));
                    }}
                  >
                    Todos los clientes
                  </button>
                  <button onClick={() => open("clientEdit", client.id)}>Editar contacto</button>
                  <button onClick={() => open("document", undefined, client.id)}>
                    <Plus size={15} />
                    Compartir documento
                  </button>
                  <button onClick={() => open("credential", undefined, client.id)}>
                    <ShieldCheck size={15} />
                    Compartir credencial
                  </button>
                </div>
              </div>
              <div className="controlTabs">
                {[
                  "Resumen",
                  "Cotizaciones",
                  "Proyectos",
                  "Servicios",
                  "Agenda",
                  "Documentos",
                  "Asistencia",
                ].map((t) => (
                  <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>
                    {t}
                  </button>
                ))}
              </div>
              {tab === "Resumen" ? (
                <div className="controlDashboardColumns">
                  <section className="clientSection">
                    <header className="clientSectionHeader">
                      <div>
                        <h2>Cuenta y contacto</h2>
                        <p>Identidad conservada desde la web original.</p>
                      </div>
                      <Status value={client.accountStatus} />
                    </header>
                    <dl className="controlDetails">
                      <div>
                        <dt>Correo</dt>
                        <dd>{client.email}</dd>
                      </div>
                      <div>
                        <dt>Verificación</dt>
                        <dd>
                          {client.emailVerifiedAt ? date(client.emailVerifiedAt) : "Pendiente"}
                        </dd>
                      </div>
                      <div>
                        <dt>Teléfono</dt>
                        <dd>{client.phone || "Por completar"}</dd>
                      </div>
                      <div>
                        <dt>Alta</dt>
                        <dd>{date(client.createdAt)}</dd>
                      </div>
                    </dl>
                    <div className="controlPanelActions">
                      <button
                        className="clientPrimaryButton"
                        onClick={() => open("communication", undefined, client.id)}
                      >
                        <Send size={15} />
                        Enviar mensaje al portal
                      </button>
                    </div>
                  </section>
                  <section className="clientSection">
                    <header className="clientSectionHeader">
                      <div>
                        <h2>Su relación con Zyteron</h2>
                        <p>Datos reales vinculados a esta cuenta.</p>
                      </div>
                    </header>
                    <dl className="controlDetails">
                      {[
                        ["Cotizaciones", data.quotes.filter((q) => q.userId === client.id).length],
                        ["Proyectos", data.projects.filter((p) => p.clientId === client.id).length],
                        ["Documentos", data.documents.filter((d) => d.userId === client.id).length],
                        ["Asistencia", data.tickets.filter((t) => t.userId === client.id).length],
                        [
                          "Saldo pendiente · CLP",
                          money(
                            data.debts
                              .filter((d) => d.clientId === client.id && d.currency === "CLP")
                              .reduce((s, d) => s + d.balance, 0),
                          ),
                        ],
                      ].map(([a, b]) => (
                        <div key={String(a)}>
                          <dt>{a}</dt>
                          <dd>{b}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </div>
              ) : tab === "Cotizaciones" ? (
                workspace(
                  ["Cotización", "Cliente", "Importe", "Estado", "Fecha", ""],
                  quoteRows(data.quotes.filter((q) => q.userId === client.id)),
                )
              ) : tab === "Proyectos" ? (
                workspace(
                  ["Proyecto", "Cliente", "Estado", "Inicio", "Entrega", ""],
                  projectRows(data.projects.filter((p) => p.clientId === client.id)),
                )
              ) : tab === "Servicios" ? (
                workspace(
                  ["Servicio", "Cliente", "Importe", "Estado", "Visibilidad", ""],
                  resourceRows(
                    "SERVICE",
                    data.resources.filter((r) => r.userId === client.id),
                  ),
                )
              ) : tab === "Agenda" ? (
                workspace(
                  ["Compromiso", "Cliente", "Fecha", "Estado", "Visibilidad", ""],
                  resourceRows(
                    "EVENT",
                    data.resources.filter((r) => r.userId === client.id),
                  ),
                )
              ) : tab === "Documentos" ? (
                workspace(
                  ["Documento", "Cliente", "Categoría", "Fecha", ""],
                  documentRows(data.documents.filter((d) => d.userId === client.id)),
                )
              ) : (
                workspace(
                  ["Solicitud", "Cliente", "Estado", "Fecha", ""],
                  ticketRows(data.tickets.filter((t) => t.userId === client.id)),
                )
              )}
            </>
          ) : (
            workspace(
              ["Cliente", "Correo", "Estado", "Verificación", "Alta", ""],
              data.users
                .filter((u) => matches(u.name, u.company, u.email) && state(u.accountStatus))
                .map((u) => [
                  <button
                    key="c"
                    className="controlRecord"
                    onClick={() => {
                      setClientId(u.id);
                      setTab("Resumen");
                      window.history.replaceState({}, "", path("clientes", u.id));
                    }}
                  >
                    <strong>{u.company || u.name}</strong>
                    <small>{u.name}</small>
                  </button>,
                  u.email,
                  <Status key="s" value={u.accountStatus} />,
                  u.emailVerifiedAt ? "Verificado" : "Pendiente",
                  date(u.createdAt),
                  <button
                    key="a"
                    className="controlTextButton"
                    onClick={() => {
                      setClientId(u.id);
                      setTab("Resumen");
                      window.history.replaceState({}, "", path("clientes", u.id));
                    }}
                  >
                    Ver 360° <ArrowUpRight size={14} />
                  </button>,
                ]),
              ["ACTIVE", "PENDING_VERIFICATION", "DISABLED"],
            )
          )}
        </>
      )}
      {section === "contactos" &&
        workspace(
          ["Contacto", "Empresa", "Origen", "Estado", "Fecha", ""],
          data.leads
            .filter((l) => matches(l.name, l.email, l.company, l.message) && state(l.status))
            .map((l) => [
              <span key="n" className="controlRecord">
                <strong>{l.name}</strong>
                <small>{l.email}</small>
              </span>,
              l.company || "—",
              l.source || "Formulario web",
              <Status key="s" value={l.status} />,
              date(l.createdAt),
              <button key="a" className="controlTextButton" onClick={() => open("lead", l.id)}>
                Revisar <ArrowUpRight size={14} />
              </button>,
            ]),
          ["NEW", "IN_PROGRESS", "CLOSED", "LOST"],
        )}
      {section === "cotizaciones" &&
        workspace(["Cotización", "Cliente", "Importe", "Estado", "Fecha", ""], quoteRows(), [
          "PENDING",
          "SENT",
          "WON",
          "LOST",
        ])}
      {section === "proyectos" &&
        workspace(["Proyecto", "Cliente", "Estado", "Inicio", "Entrega", ""], projectRows(), [
          "PLANNED",
          "IN_PROGRESS",
          "DONE",
          "CANCELLED",
        ])}
      {section === "documentos" &&
        workspace(["Documento", "Cliente", "Categoría", "Publicado", ""], documentRows())}
      {(section === "servicios" || section === "agenda") &&
        workspace(
          [
            section === "servicios" ? "Servicio" : "Compromiso",
            "Cliente",
            section === "servicios" ? "Importe" : "Fecha",
            "Estado",
            "Visibilidad",
            "",
          ],
          resourceRows(section === "servicios" ? "SERVICE" : "EVENT"),
        )}
      {section === "asistencia" &&
        workspace(["Solicitud", "Cliente", "Estado", "Actualización", ""], ticketRows(), [
          "OPEN",
          "IN_PROGRESS",
          "WAITING_CLIENT",
          "RESOLVED",
          "CLOSED",
        ])}
      {section === "entradas" && (
        <div className="controlIntake">
          <section className="clientSection">
            <header className="clientSectionHeader">
              <div>
                <p className="clientKicker">PORTAL CLIENTE</p>
                <h2>Pedidos y solicitudes</h2>
              </div>
            </header>
            <Table
              columns={["Solicitud", "Cliente", "Estado", "Fecha", ""]}
              rows={data.requests.map((r) => [
                <span key="r" className="controlRecord">
                  <strong>{r.title}</strong>
                  <small>{r.type}</small>
                </span>,
                userName(r.userId),
                <Status key="s" value={r.status} />,
                date(r.createdAt),
                <button key="a" className="controlTextButton" onClick={() => open("request", r.id)}>
                  Resolver <ArrowUpRight size={14} />
                </button>,
              ])}
            />
          </section>
          <section className="clientSection">
            <header className="clientSectionHeader">
              <div>
                <p className="clientKicker">WEB PÚBLICA</p>
                <h2>Formularios y contactos</h2>
              </div>
              <Link className="controlTextButton" href={path("contactos")}>
                CRM <ArrowUpRight size={15} />
              </Link>
            </header>
            <Table
              columns={["Contacto", "Origen", "Fecha", ""]}
              rows={data.leads.map((l) => [
                <span key="l" className="controlRecord">
                  <strong>{l.name}</strong>
                  <small>{l.email}</small>
                </span>,
                l.source || "Formulario web",
                date(l.createdAt),
                <button key="a" className="controlTextButton" onClick={() => open("lead", l.id)}>
                  Abrir <ArrowUpRight size={14} />
                </button>,
              ])}
            />
          </section>
          <section className="clientSection">
            <header className="clientSectionHeader">
              <div>
                <p className="clientKicker">COTIZADOR</p>
                <h2>Propuestas por preparar</h2>
              </div>
            </header>
            <Table
              columns={["Cotización", "Cliente", "Importe", "Estado", "Fecha", ""]}
              rows={quoteRows(pendingQuotes)}
            />
          </section>
        </div>
      )}
      {section === "finanzas" && (
        <>
          <div className="controlTabs">
            {["Obligaciones", "Pagos"].map((t) => (
              <button
                key={t}
                className={tab === t || (tab === "Resumen" && t === "Obligaciones") ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="controlFinancialNotice">
            <ShieldCheck size={18} />
            <span>
              Solo una confirmación efectiva acredita el pago. Este panel no permite generar ventas
              ni comprobantes simulando un cobro.
            </span>
          </div>
          {tab === "Pagos"
            ? workspace(
                ["Cliente", "Importe", "Estado", "Origen", "Fecha"],
                data.payments
                  .filter((p) => matches(userName(p.clientId), p.status) && state(p.status))
                  .map((p) => [
                    userName(p.clientId),
                    money(p.amount),
                    <Status key="s" value={p.status} />,
                    p.provider === "FLOW"
                      ? "Pasarela de pagos"
                      : p.provider || "Registro administrativo",
                    date(p.receivedAt),
                  ]),
                ["CONFIRMED", "PENDING", "REJECTED"],
              )
            : workspace(
                ["Obligación", "Cliente", "Importe", "Saldo", "Vencimiento", ""],
                data.debts
                  .filter((d) => matches(d.description, userName(d.clientId)))
                  .map((d) => [
                    d.description,
                    userName(d.clientId),
                    money(d.total, d.currency),
                    money(d.balance, d.currency),
                    date(d.dueAt),
                    d.quoteId && (
                      <button
                        key="a"
                        className="controlTextButton"
                        onClick={() => open("quoteDetail", d.quoteId!)}
                      >
                        Ver origen <ArrowUpRight size={14} />
                      </button>
                    ),
                  ]),
              )}
        </>
      )}
      {(section === "actividad" || section === "auditoria") &&
        workspace(
          ["Acción", "Cliente", "Entidad", "Referencia", "Fecha"],
          data.audit
            .filter((a) => matches(a.action, userName(a.targetUserId)))
            .map((a) => [
              a.action,
              userName(a.targetUserId),
              a.entityType,
              a.entityId || "—",
              date(a.createdAt),
            ]),
        )}
      {section === "conversaciones" && (
        <>
          <div className="controlTabs">
            {["Chat de la web", "Mensajes del portal"].map((t) => (
              <button
                key={t}
                className={
                  tab === t || (tab === "Resumen" && t === "Chat de la web") ? "active" : ""
                }
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Mensajes del portal" && (
            <section className="clientSection">
              <header className="clientSectionHeader">
                <div>
                  <p className="clientKicker">PORTAL CLIENTE</p>
                  <h2>Conversaciones con el equipo</h2>
                </div>
                <button className="clientPrimaryButton" onClick={() => open("communication")}>
                  <Plus size={15} />
                  Nuevo mensaje
                </button>
              </header>
              <div className="controlMessages">
                {data.communications.map((c) => (
                  <article
                    className={`controlMessage ${c.direction === "INBOUND" ? "incoming" : "outgoing"}`}
                    key={c.id}
                  >
                    <div>
                      <strong>
                        {userName(c.userId)} ·{" "}
                        {c.direction === "INBOUND" ? "Cliente" : "Equipo Zyteron"}
                      </strong>
                      <small>{date(c.createdAt)}</small>
                    </div>
                    <h3>{c.subject}</h3>
                    <p>{c.message}</p>
                    {c.direction === "INBOUND" && (
                      <button
                        className="controlTextButton"
                        onClick={() => open("communication", undefined, c.userId)}
                      >
                        Responder <ArrowUpRight size={15} />
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {section === "conversaciones" && tab !== "Mensajes del portal" && (
        <div className="controlInbox">
          <aside className="clientSection">
            <header className="clientSectionHeader">
              <div>
                <p className="clientKicker">CHAT DE ZYTERON.CL</p>
                <h2>Conversaciones</h2>
              </div>
            </header>
            {data.threads.map((t) => (
              <button
                className={`controlThread ${threadId === t.id ? "active" : ""}`}
                key={t.id}
                onClick={() => {
                  setThreadId(t.id);
                  window.history.replaceState({}, "", path("conversaciones", t.id));
                }}
              >
                <strong>{t.subject || "Conversación web"}</strong>
                <small>
                  {t.legacy_user_id ? userName(t.legacy_user_id) : "Visitante"} · {t.message_count}{" "}
                  mensajes
                </small>
                <span>{date(t.last_message_at)}</span>
              </button>
            ))}
            {!data.threads.length && (
              <div className="enterpriseEmptyState">
                <MessageSquare size={26} />
                <strong>La próxima conversación empieza en tu web.</strong>
                <p>Los chats guardados aparecerán aquí.</p>
              </div>
            )}
          </aside>
          <section className="clientSection controlChat">
            <header className="clientSectionHeader">
              <div>
                <p className="clientKicker">HISTORIAL Y SEGUIMIENTO</p>
                <h2>
                  {data.threads.find((t) => t.id === threadId)?.subject ||
                    "Selecciona una conversación"}
                </h2>
              </div>
            </header>
            <div className="controlMessages">
              {data.messages
                .filter((m) => m.thread_id === threadId)
                .sort((a, b) => a.created_at.localeCompare(b.created_at))
                .map((m) => (
                  <article
                    className={`controlMessage ${m.direction === "INBOUND" ? "incoming" : "outgoing"}`}
                    key={m.id}
                  >
                    <div>
                      <strong>
                        {m.direction === "INBOUND"
                          ? "Cliente o visitante"
                          : m.actor_kind === "AI"
                            ? "Zara · Asistente IA"
                            : "Equipo Zyteron"}
                      </strong>
                      <small>{date(m.created_at)}</small>
                    </div>
                    <p>{m.body_text}</p>
                  </article>
                ))}
            </div>
            {threadId && (
              <form
                className="controlReply"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.currentTarget));
                  void send(`/api/admin/chat/${threadId}/reply`, {
                    message: f.message,
                    requestId: crypto.randomUUID(),
                  });
                }}
              >
                <label>
                  Respuesta del equipo
                  <textarea
                    name="message"
                    minLength={2}
                    maxLength={3000}
                    rows={3}
                    required
                    placeholder="Escribe una respuesta para esta conversación…"
                  />
                </label>
                <button className="clientPrimaryButton" disabled={busy}>
                  <Send size={15} />
                  Publicar respuesta
                </button>
              </form>
            )}
          </section>
        </div>
      )}
      {error && !modal && (
        <p className="controlError" role="alert">
          {error}
        </p>
      )}
      <footer className="controlFooter">
        Zyteron Control · Información actualizada {date(data.asOf)}
      </footer>
      {modal && (
        <Dialog
          title={
            modal.kind === "quote"
              ? "Preparar cotización"
              : modal.kind === "quoteDetail"
                ? "Propuesta comercial"
                : modal.kind === "project"
                  ? "Gestionar proyecto"
                  : modal.kind === "SERVICE"
                    ? "Publicar servicio al cliente"
                    : modal.kind === "EVENT"
                      ? "Coordinar compromiso"
                      : modal.kind === "document"
                        ? "Compartir documento"
                        : modal.kind === "credential"
                          ? "Compartir acceso protegido"
                          : modal.kind === "ticket"
                            ? "Gestionar asistencia"
                            : modal.kind === "request"
                              ? "Resolver solicitud"
                              : modal.kind === "lead"
                                ? "Revisar contacto"
                                : modal.kind === "client"
                                  ? "Crear acceso cliente"
                                  : modal.kind === "clientEdit"
                                    ? "Actualizar contacto"
                                    : "Mensaje al cliente"
          }
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          {(modal.kind === "SERVICE" || modal.kind === "EVENT") && (
            <form
              className="controlForm"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                void send("/api/portal/admin/resources", {
                  ...f,
                  ...(modal.id ? { id: modal.id } : {}),
                  kind: modal.kind,
                  price: Number(f.price || 0),
                  published: f.published === "on",
                  status: f.status || "PENDING_ACTIVATION",
                  frequency: f.frequency || "ONE_TIME",
                  quoteId: f.quoteId || "",
                  projectId: f.projectId || "",
                  renewal: f.renewal || "",
                });
              }}
            >
              {selectUser(currentResource?.userId || modal.userId)}
              <label>
                {modal.kind === "SERVICE" ? "Servicio" : "Compromiso"}
                <input
                  name="title"
                  required
                  minLength={3}
                  maxLength={140}
                  defaultValue={currentResource?.title}
                />
              </label>
              <label>
                Alcance o detalle
                <textarea
                  name="description"
                  rows={3}
                  maxLength={3000}
                  defaultValue={currentResource?.description}
                />
              </label>
              <div className="controlFormGrid">
                <label>
                  Fecha de inicio
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={currentResource?.date || data.asOf.slice(0, 10)}
                  />
                </label>
                {modal.kind === "SERVICE" && (
                  <label>
                    Renovación
                    <input name="renewal" type="date" defaultValue={currentResource?.renewal} />
                  </label>
                )}
              </div>
              {modal.kind === "SERVICE" && (
                <>
                  <div className="controlFormGrid">
                    <label>
                      Importe CLP
                      <input
                        name="price"
                        type="number"
                        min={0}
                        max={1000000000}
                        step={1}
                        required
                        defaultValue={currentResource?.price || 0}
                      />
                    </label>
                    <label>
                      Frecuencia
                      <select
                        name="frequency"
                        defaultValue={currentResource?.frequency || "ONE_TIME"}
                      >
                        <option value="ONE_TIME">Pago único</option>
                        <option value="MONTHLY">Mensual</option>
                        <option value="QUARTERLY">Trimestral</option>
                        <option value="ANNUAL">Anual</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Estado
                    <select
                      name="status"
                      defaultValue={currentResource?.status || "PENDING_ACTIVATION"}
                    >
                      {[
                        "QUOTED",
                        "PENDING_ACTIVATION",
                        "ACTIVE",
                        "SUSPENDED",
                        "PENDING_RENEWAL",
                        "CANCELLED",
                        "EXPIRED",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {label(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cotización vinculada
                    <select name="quoteId" defaultValue={currentResource?.quoteId || ""}>
                      <option value="">Sin cotización vinculada</option>
                      {data.quotes
                        .filter((q) => q.userId)
                        .map((q) => (
                          <option key={q.id} value={q.id}>
                            {userName(q.userId)} · {q.number}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Proyecto vinculado
                    <select name="projectId" defaultValue={currentResource?.projectId || ""}>
                      <option value="">Sin proyecto vinculado</option>
                      {data.projects
                        .filter((p) => p.clientId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {userName(p.clientId)} · {p.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <p className="controlSubtle">
                    Los vínculos se validan contra el cliente elegido. Publicar un servicio no crea
                    un cargo ni autoriza una suscripción.
                  </p>
                </>
              )}
              <label className="controlCheck">
                <input
                  name="published"
                  type="checkbox"
                  defaultChecked={currentResource?.published}
                />
                <span>Compartir en el portal del cliente</span>
              </label>
              <button className="clientPrimaryButton" disabled={busy}>
                <Check size={16} />
                Guardar recurso
              </button>
            </form>
          )}
          {modal.kind === "project" && (
            <form
              className="controlForm"
              onSubmit={(e) => {
                e.preventDefault();
                void send("/api/control/project", {
                  ...Object.fromEntries(new FormData(e.currentTarget)),
                  ...(modal.id ? { id: modal.id } : {}),
                });
              }}
            >
              {selectUser(currentProject?.clientId || modal.userId, "clientId")}
              <label>
                Nombre del proyecto o trabajo
                <input
                  name="title"
                  minLength={4}
                  maxLength={160}
                  required
                  defaultValue={currentProject?.title}
                  placeholder="Ej. Sitio web Fenice.cl o Diseño de Fleet Control"
                />
              </label>
              <label>
                Descripción
                <textarea
                  name="description"
                  rows={3}
                  maxLength={5000}
                  defaultValue={currentProject?.description || ""}
                />
              </label>
              <label>
                Alcance compartido
                <textarea
                  name="scope"
                  rows={3}
                  maxLength={5000}
                  defaultValue={currentProject?.scope || ""}
                />
              </label>
              <label>
                Estado
                <select
                  name="status"
                  defaultValue={
                    ["PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"].includes(
                      currentProject?.status || "",
                    )
                      ? currentProject!.status!
                      : "PLANNED"
                  }
                >
                  {["PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"].map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="controlFormGrid">
                <label>
                  Inicio
                  <input
                    name="startDate"
                    type="date"
                    defaultValue={currentProject?.startDate?.slice(0, 10)}
                  />
                </label>
                <label>
                  Entrega prevista
                  <input
                    name="endDate"
                    type="date"
                    defaultValue={currentProject?.endDate?.slice(0, 10)}
                  />
                </label>
              </div>
              <button className="clientPrimaryButton" disabled={busy}>
                <Check size={16} />
                Guardar proyecto
              </button>
            </form>
          )}
          {modal.kind === "quote" && (
            <form
              className="controlForm"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                void send("/api/control/quote", {
                  userId: f.userId,
                  items,
                  includeIva: f.includeIva === "on",
                  billingType: f.billingType,
                  notes: f.notes,
                  ...(modal.id ? { id: modal.id } : {}),
                });
              }}
            >
              {selectUser(currentQuote?.userId || modal.userId)}
              <div className="controlQuoteItems">
                {items.map((item, i) => (
                  <div key={i}>
                    <label>
                      Concepto
                      <input
                        required
                        minLength={2}
                        maxLength={300}
                        value={item.description}
                        onChange={(e) =>
                          setItems((v) =>
                            v.map((it, n) =>
                              n === i ? { ...it, description: e.target.value } : it,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Cantidad
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        step={0.01}
                        required
                        value={item.qty}
                        onChange={(e) =>
                          setItems((v) =>
                            v.map((it, n) =>
                              n === i ? { ...it, qty: Number(e.target.value) } : it,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Precio neto CLP
                      <input
                        type="number"
                        min={0}
                        max={1000000000}
                        step={1}
                        required
                        value={item.unitPrice}
                        onChange={(e) =>
                          setItems((v) =>
                            v.map((it, n) =>
                              n === i ? { ...it, unitPrice: Number(e.target.value) } : it,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Descuento %
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={item.discountPct || 0}
                        onChange={(e) =>
                          setItems((v) =>
                            v.map((it, n) =>
                              n === i ? { ...it, discountPct: Number(e.target.value) } : it,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={items.length === 1}
                      aria-label={`Quitar concepto ${i + 1}`}
                      onClick={() => setItems((v) => v.filter((_, n) => n !== i))}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="controlTextButton"
                type="button"
                disabled={items.length >= 40}
                onClick={() => setItems((v) => [...v, { description: "", qty: 1, unitPrice: 0 }])}
              >
                <Plus size={15} />
                Agregar concepto
              </button>
              <label className="controlCheck">
                <input
                  name="includeIva"
                  type="checkbox"
                  defaultChecked={currentQuote?.includeIva !== false}
                />
                <span>Incluir IVA (19%)</span>
              </label>
              <label>
                Modalidad de cobro
                <select name="billingType" defaultValue={currentQuote?.billingType || "ONE_TIME"}>
                  <option value="ONE_TIME">Pago único</option>
                  <option value="SUBSCRIPTION">Suscripción mensual</option>
                </select>
              </label>
              <label>
                Notas
                <textarea
                  name="notes"
                  maxLength={3000}
                  rows={3}
                  defaultValue={currentQuote?.notes}
                />
              </label>
              <p className="controlFinancialNotice">
                <ShieldCheck size={18} />
                Guardar prepara una propuesta pendiente. El cobro se habilita por separado y no crea
                una venta ni un pago.
              </p>
              <button className="clientPrimaryButton" disabled={busy}>
                <Check size={16} />
                Guardar propuesta
              </button>
            </form>
          )}
          {modal.kind === "quoteDetail" && currentQuote && (
            <>
              <div className="controlDetailHero">
                <span>
                  <ReceiptText size={28} />
                </span>
                <div>
                  <p className="clientKicker">{currentQuote.number}</p>
                  <h3>{currentQuote.title}</h3>
                  <p>
                    {currentQuote.name} · {currentQuote.email}
                  </p>
                </div>
                <Status value={currentQuote.status} />
              </div>
              <Table
                columns={["Concepto", "Cantidad", "Precio neto"]}
                rows={currentQuote.items.map((i) => [i.description, i.qty, money(i.unitPrice)])}
              />
              <dl className="controlDetails">
                <div>
                  <dt>Importe total</dt>
                  <dd>{currentQuote.total > 0 ? money(currentQuote.total) : "Por preparar"}</dd>
                </div>
                <div>
                  <dt>Cliente vinculado</dt>
                  <dd>{userName(currentQuote.userId)}</dd>
                </div>
              </dl>
              <div className="clientHeaderActions">
                <a href={`/administracion/cotizaciones/${currentQuote.id}/pdf`}>
                  <Download size={15} />
                  Propuesta PDF
                </a>
                {!["WON", "PAID"].includes(currentQuote.status || "") && (
                  <button
                    onClick={() => open("quote", currentQuote.id, currentQuote.userId || undefined)}
                  >
                    Editar propuesta
                  </button>
                )}
                {currentQuote.total > 0 && currentQuote.userId && (
                  <div className="clientHeaderActions">
                    {currentQuote.stages
                      .filter((s) => s.status !== "PAID")
                      .map((s) => (
                        <button
                          key={s.key}
                          className="clientPrimaryButton"
                          disabled={busy}
                          onClick={() =>
                            void send("/api/control/enable", {
                              id: currentQuote.id,
                              stageKey: s.key,
                            })
                          }
                        >
                          <CircleDollarSign size={16} />
                          Habilitar {s.label} · {money(s.amount)}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              {!currentQuote.userId && (
                <form
                  className="controlForm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    void send(`/api/portal/admin/users/${f.userId}/assign`, {
                      entityType: "QUOTE",
                      entityId: currentQuote.id,
                    });
                  }}
                >
                  {selectUser()}
                  <button className="clientPrimaryButton" disabled={busy}>
                    Vincular cotización al cliente
                  </button>
                </form>
              )}
              <p className="controlSubtle">
                La pasarela valida el pago antes de crear el movimiento y su comprobante. La
                cotización no acredita un cobro.
              </p>
            </>
          )}
          {modal.kind === "document" && (
            <form
              className="controlForm"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  id = String(f.get("userId"));
                f.delete("userId");
                void send(`/api/portal/admin/users/${id}/documents`, f, "POST", true);
              }}
            >
              {selectUser(modal.userId)}
              <label>
                Título
                <input name="title" minLength={2} maxLength={180} required />
              </label>
              <label>
                Categoría
                <select name="category">
                  <option>Documento</option>
                  <option>Contrato</option>
                  <option>Informe de mantención</option>
                  <option>Entregable</option>
                  <option>Manual</option>
                </select>
              </label>
              <label>
                Descripción
                <textarea name="description" rows={3} maxLength={2000} />
              </label>
              <label>
                Archivo
                <input
                  name="file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx"
                  required
                />
              </label>
              <p className="controlSubtle">
                Máximo 20 MB. El archivo se guarda en almacenamiento privado y requiere permiso para
                descargarse.
              </p>
              <button className="clientPrimaryButton" disabled={busy}>
                <FileText size={16} />
                {busy ? "Compartiendo…" : "Compartir con el cliente"}
              </button>
            </form>
          )}
          {modal.kind === "credential" && (
            <form
              className="controlForm"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                const { userId, ...v } = f;
                void send(`/api/portal/admin/users/${userId}/credentials`, {
                  ...v,
                  isSensitive: true,
                });
              }}
            >
              {selectUser(modal.userId)}
              <label>
                Recurso
                <input name="serviceName" minLength={2} maxLength={140} required />
              </label>
              <label>
                Usuario
                <input name="username" maxLength={140} />
              </label>
              <label>
                Secreto
                <input name="secret" type="password" autoComplete="new-password" maxLength={4000} />
              </label>
              <label>
                Dirección HTTPS
                <input name="url" type="url" pattern="https://.*" />
              </label>
              <label>
                Notas
                <textarea name="notes" maxLength={3000} rows={3} />
              </label>
              <div className="controlFinancialNotice">
                <ShieldCheck size={18} />
                El secreto se cifra en el servidor. Su revelación exige contraseña y dos códigos, y
                queda auditada.
              </div>
              <button className="clientPrimaryButton" disabled={busy}>
                <ShieldCheck size={16} />
                Guardar acceso protegido
              </button>
            </form>
          )}
          {modal.kind === "ticket" && currentTicket && (
            <>
              <div className="controlDetailHero">
                <span>
                  <Headphones size={28} />
                </span>
                <div>
                  <h3>{currentTicket.title}</h3>
                  <p>{userName(currentTicket.userId)}</p>
                </div>
                <Status value={currentTicket.status} />
              </div>
              <div className="controlMessages">
                {currentTicket.messages.map((m) => (
                  <article
                    key={m.id}
                    className={`controlMessage ${m.authorRole === "CLIENT" ? "incoming" : "outgoing"}`}
                  >
                    <div>
                      <strong>
                        {m.authorRole === "CLIENT" ? "Cliente" : "Equipo Zyteron"}
                        {m.isInternal ? " · Nota interna" : ""}
                      </strong>
                      <small>{date(m.createdAt)}</small>
                    </div>
                    <p>{m.message}</p>
                  </article>
                ))}
              </div>
              <form
                className="controlForm"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.currentTarget));
                  void send("/api/control/ticket", {
                    id: currentTicket.id,
                    status: f.status,
                    message: f.message,
                    internal: f.internal === "on",
                  });
                }}
              >
                <label>
                  Estado
                  <select name="status" defaultValue={currentTicket.status}>
                    {["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"].map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Respuesta o nota
                  <textarea name="message" maxLength={5000} rows={4} />
                </label>
                <label className="controlCheck">
                  <input name="internal" type="checkbox" />
                  <span>Nota interna (no visible para el cliente)</span>
                </label>
                <button className="clientPrimaryButton" disabled={busy}>
                  <Send size={16} />
                  Guardar actualización
                </button>
              </form>
            </>
          )}
          {modal.kind === "request" && currentRequest && (
            <>
              <div className="controlDetailHero">
                <span>
                  <FileText size={28} />
                </span>
                <div>
                  <h3>{currentRequest.title}</h3>
                  <p>
                    {userName(currentRequest.userId)} · {currentRequest.type}
                  </p>
                </div>
                <Status value={currentRequest.status} />
              </div>
              <p className="controlTextBlock">{currentRequest.details}</p>
              <form
                className="controlForm"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(
                    `/api/portal/admin/requests/${currentRequest.id}`,
                    {
                      ...Object.fromEntries(new FormData(e.currentTarget)),
                      requestId: crypto.randomUUID(),
                    },
                    "PATCH",
                  );
                }}
              >
                <label>
                  Estado
                  <select name="status" defaultValue={currentRequest.status}>
                    {["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"].map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Respuesta para el cliente
                  <textarea name="reply" rows={4} maxLength={3000} />
                </label>
                <button className="clientPrimaryButton" disabled={busy}>
                  <Send size={15} />
                  Actualizar y avisar al cliente
                </button>
              </form>
            </>
          )}
          {modal.kind === "lead" && currentLead && (
            <>
              <div className="controlDetailHero">
                <span>
                  <Users size={28} />
                </span>
                <div>
                  <h3>{currentLead.name}</h3>
                  <p>
                    {currentLead.company} · {currentLead.source || "Formulario web"}
                  </p>
                </div>
                <Status value={currentLead.status} />
              </div>
              <dl className="controlDetails">
                <div>
                  <dt>Correo</dt>
                  <dd>{currentLead.email}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{currentLead.phone || "Por completar"}</dd>
                </div>
                <div>
                  <dt>Recepción</dt>
                  <dd>{date(currentLead.createdAt)}</dd>
                </div>
              </dl>
              <p className="controlTextBlock">{currentLead.message}</p>
              <div className="clientHeaderActions">
                <button
                  onClick={() =>
                    open(
                      "quote",
                      undefined,
                      data.users.find(
                        (u) => u.email.toLowerCase() === currentLead.email.toLowerCase(),
                      )?.id,
                    )
                  }
                >
                  Preparar propuesta <ArrowUpRight size={15} />
                </button>
              </div>
              <p className="controlSubtle">
                La solicitud se conserva en su registro original. El seguimiento comercial continúa
                en las cotizaciones y proyectos vinculados.
              </p>
            </>
          )}
          {modal.kind === "client" && (
            <form
              className="controlForm"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                void send("/api/portal/admin/users", {
                  ...f,
                  sendVerificationCode: f.sendVerificationCode === "on",
                });
              }}
            >
              <div className="controlFormGrid">
                <label>
                  Nombre
                  <input name="firstName" minLength={2} maxLength={80} required />
                </label>
                <label>
                  Apellido
                  <input name="lastName" minLength={2} maxLength={80} required />
                </label>
              </div>
              <label>
                Correo
                <input name="email" type="email" required />
              </label>
              <label>
                Empresa
                <input name="company" maxLength={160} />
              </label>
              <label>
                Teléfono
                <input name="phone" maxLength={40} />
              </label>
              <label>
                Contraseña inicial
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <label className="controlCheck">
                <input name="sendVerificationCode" type="checkbox" />
                <span>Enviar verificación al correo del cliente</span>
              </label>
              <p className="controlSubtle">
                La cuenta requiere verificación antes de acceder a sus datos. Revisa que el correo
                pertenezca al cliente.
              </p>
              <button className="clientPrimaryButton" disabled={busy}>
                <Users size={16} />
                Crear acceso
              </button>
            </form>
          )}
          {modal.kind === "clientEdit" &&
            data.users
              .filter((u) => u.id === modal.id)
              .map((u) => (
                <form
                  className="controlForm"
                  key={u.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(
                      `/api/portal/admin/users/${u.id}`,
                      Object.fromEntries(new FormData(e.currentTarget)),
                      "PATCH",
                    );
                  }}
                >
                  <label>
                    Empresa
                    <input name="company" maxLength={160} defaultValue={u.company || ""} />
                  </label>
                  <label>
                    Teléfono
                    <input name="phone" maxLength={40} defaultValue={u.phone || ""} />
                  </label>
                  <label>
                    Acceso
                    <select name="accountStatus" defaultValue={u.accountStatus}>
                      {["ACTIVE", "PENDING_VERIFICATION", "DISABLED"].map((s) => (
                        <option key={s} value={s}>
                          {label(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="clientPrimaryButton" disabled={busy}>
                    Guardar contacto
                  </button>
                </form>
              ))}
          {modal.kind === "communication" && (
            <form
              className="controlForm"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                const { userId, ...v } = f;
                void send(`/api/portal/admin/users/${userId}/communications`, {
                  ...v,
                  direction: "OUTBOUND",
                  channel: "PORTAL",
                });
              }}
            >
              {selectUser(modal.userId)}
              <label>
                Asunto
                <input name="subject" minLength={3} maxLength={200} required />
              </label>
              <label>
                Mensaje
                <textarea name="message" minLength={4} maxLength={5000} rows={5} required />
              </label>
              <button className="clientPrimaryButton" disabled={busy}>
                <Send size={15} />
                Compartir en el portal
              </button>
            </form>
          )}
          {error && (
            <p className="controlError" role="alert">
              {error}
            </p>
          )}
        </Dialog>
      )}
    </main>
  );
}

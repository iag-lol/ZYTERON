"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FilePlus2,
  FileText,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "../routed-link";
import { useAccess } from "../access-context";
import { DateInput, Drawer, Feedback, Field, Loading, useAction, useLoad } from "../finance/fx-ui";
import { day, moment, todayIso } from "@control/lib/finance-format";
import {
  workApi,
  stageLabels,
  reviewLabels,
  proposalLabels,
  type WorkBoard,
  type WorkCatalog,
  type WorkRecord,
  type WorkEvent,
  type WorkReport,
  type WorkProposal,
  type PublicPlan,
  type AssignedClient,
  type Receipt,
} from "@control/lib/sales-workspace-api";
import { SalesRecordForm } from "./sales-record-form";
import { SalesProposalForm } from "./sales-proposal-form";
import { SalesRecordDetail } from "./sales-record-detail";
import "@control/styles/sales-executive.css";
const money = (v: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(v));
const tabs = [
  { id: "home", label: "Mi jornada", icon: LayoutGrid },
  { id: "clients", label: "Cartera", icon: Users },
  { id: "proposals", label: "Propuestas", icon: FileText },
  { id: "plans", label: "Planes y material", icon: BookOpen },
  { id: "reports", label: "Informes", icon: ClipboardCheck },
  { id: "commissions", label: "Comisiones", icon: Wallet },
];
type ReviewTarget = {
  path: string;
  title: string;
  confirmAcceptance?: boolean;
  complete?: boolean;
  record?: WorkRecord;
};
export function SalesExecutiveWorkspace({ section = "home" }: { section?: string }) {
  const { role } = useAccess(),
    isAdmin = role === "GERENTE_GENERAL",
    allowed = isAdmin || role === "EJECUTIVA_VENTAS";
  const [tab, setTab] = useState(tabs.some((t) => t.id === section) ? section : "home"),
    [owner, setOwner] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [search, setSearch] = useState(""),
    [stage, setStage] = useState(""),
    [view, setView] = useState("list"),
    [detail, setDetail] = useState<string | null>(null),
    [recordForm, setRecordForm] = useState<{
      initial?: WorkRecord;
      client?: AssignedClient;
    } | null>(null),
    [proposalForm, setProposalForm] = useState<{
      record?: WorkRecord;
      plan?: PublicPlan;
      initial?: WorkProposal;
    } | null>(null),
    [reportForm, setReportForm] = useState(false),
    [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null),
    [profitTarget, setProfitTarget] = useState<{ record: WorkRecord; receipt: Receipt } | null>(
      null,
    ),
    [readReport, setReadReport] = useState<WorkReport | null>(null),
    [copied, setCopied] = useState(false);
  const query = new URLSearchParams({
    ...(owner ? { owner } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  const load = useLoad(
    () =>
      allowed
        ? workApi.get<WorkBoard>(role, query ? `?${query}` : "")
        : Promise.reject(new Error("Tu rol no tiene acceso a este espacio.")),
    [role, query, allowed],
  );
  const refresh = load.reload;
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 45000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const catalog = useLoad(
    () =>
      allowed
        ? workApi.get<WorkCatalog>(role, "/catalog")
        : Promise.reject(new Error("Acceso restringido.")),
    [role, allowed],
  );
  const action = useAction(() => load.reload()),
    data = load.data;
  const records = useMemo(
    () =>
      data?.records.filter(
        (r) =>
          (!stage || r.stage === stage) &&
          (!search ||
            [r.company_name, r.contact_name, r.rut, r.email, r.interest].some((v) =>
              v?.toLocaleLowerCase("es-CL").includes(search.toLocaleLowerCase("es-CL")),
            )),
      ) ?? [],
    [data, stage, search],
  );
  const reload = () => void load.reload();
  const reviewRecord = (r: WorkRecord) =>
    setReviewTarget({
      path: `/records/${r.id}/review`,
      title: `Revisar alta · ${r.company_name}`,

      record: r,
    });
  const reviewEvent = (e: WorkEvent) =>
    setReviewTarget({ path: `/events/${e.id}/review`, title: "Revisar gestión registrada" });
  const quoteReview = (p: WorkProposal) =>
    setReviewTarget({
      path: `/proposals/${p.quote_id}/review`,
      title: `Autorizar ${p.quote_number}`,
    });
  const nextContacts =
    data?.records
      .filter((r) => r.next_action_at && !["COMPLETED", "LOST"].includes(r.stage))
      .sort((a, b) => String(a.next_action_at).localeCompare(String(b.next_action_at)))
      .slice(0, 6) ?? [];
  const commissionReceipts =
    data?.receipts?.filter((v) => {
      const proposal = data.proposals.find((p) => p.quote_id === v.quote_id);
      return data.records.find((r) => r.id === proposal?.record_id)?.owner_type !== "ADMIN";
    }) ?? [];
  const name = (ownerId: string) =>
    data?.owners.find((o) => o.id === ownerId)?.name ?? "Administración";
  const downloadProposal = (p: WorkProposal) =>
    void action.run(() =>
      workApi.download(role, `/proposals/${p.quote_id}/pdf`, `${p.quote_number}.pdf`),
    );
  const saved = () => {
    setRecordForm(null);
    setProposalForm(null);
    setReportForm(false);
    reload();
  };
  if (!allowed)
    return (
      <div className="sw">
        <Feedback error="Tu rol no tiene acceso a la gestión de ejecutivos." />
      </div>
    );
  return (
    <main className="sw">
      <header className="sw-hero">
        <div>
          <span className="sw-eyebrow">OPERACIONES COMERCIALES</span>
          <h1>{isAdmin ? "Gestión comercial" : "Mi gestión comercial"}</h1>
          <p>
            {isAdmin
              ? "Contactos, seguimiento, propuestas y compras confirmadas."
              : "Cartera personal, seguimientos y propuestas pendientes."}
          </p>
          <div className="sw-hero-tags">
            <span>
              <CheckCircle2 size={14} /> {isAdmin ? "Administración" : "Cartera personal"}
            </span>
            <span>
              <Wallet size={14} />
              Comisión de ejecutivos: 15%
            </span>
          </div>
        </div>
        <div className="sw-hero-actions">
          <button className="sw-new" onClick={() => setRecordForm({})}>
            <Plus size={18} />
            Nuevo contacto comercial
          </button>
          {isAdmin ? (
            <button className="fx-btn ghost" onClick={() => setTab("reports")}>
              <ClipboardCheck size={18} />
              Generar informe
            </button>
          ) : null}
          <button
            className="sw-refresh"
            aria-label="Actualizar gestión comercial"
            onClick={reload}
            disabled={load.loading}
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>
      <Feedback error={action.error || load.error || catalog.error} notice={action.notice} />
      {isAdmin ? (
        <div className="sw-admin-filters">
          <Field label="Responsable de la gestión">
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Toda la gestión comercial</option>
              <option value="administration">Contactos de administración</option>
              {data?.owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Registros desde">
            <DateInput value={from} onChange={setFrom} />
          </Field>
          <Field label="Hasta">
            <DateInput value={to} onChange={setTo} />
          </Field>
          <button
            className="fx-btn ghost"
            onClick={() => {
              setOwner("");
              setFrom("");
              setTo("");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}
      <nav className="sw-tabs" aria-label="Secciones de gestión comercial">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} />
            {isAdmin && t.id === "home" ? "Resumen" : t.label}
            {t.id === "proposals" && data?.summary.pendingProposals ? (
              <span>{data.summary.pendingProposals}</span>
            ) : null}
          </button>
        ))}
      </nav>
      {!data ? (
        <Loading text="Cargando tu gestión comercial…" />
      ) : (
        <>
          {tab === "home" || tab === "reports" ? (
            <section className="sw-kpis" aria-label="Resumen de gestión">
              <Metric
                title="Contactos registrados"
                value={String(data.summary.contacts)}
                icon={<Users size={19} />}
                hint={`${data.summary.interested} con interés o propuesta`}
              />
              <Metric
                title="Clientes por compra confirmada"
                value={String(data.summary.generatedClients)}
                icon={<CheckCircle2 size={19} />}
                hint={`${data.summary.completed} ventas validadas`}
              />
              <Metric
                title="Propuestas por autorizar"
                value={String(data.summary.pendingProposals)}
                icon={<FileText size={19} />}
                hint={`${data.summary.pendingContacts} altas por revisar`}
              />
              <Metric
                title="Comisión ganada"
                value={money(data.summary.earnedCommission)}
                icon={<Wallet size={19} />}
                hint="15% · cobro y utilidad validados"
              />
            </section>
          ) : null}
          {tab === "home" ? (
            <>
              {isAdmin ? (
                <section className="sw-panel">
                  <div className="sw-section-title">
                    <div>
                      <span className="sw-eyebrow">BANDEJA DE VALIDACIÓN</span>
                      <h2>Registros que necesitan tu revisión</h2>
                    </div>
                    <span className="sw-count">
                      {data.summary.pendingContacts +
                        data.summary.pendingProposals +
                        data.summary.pendingReports +
                        data.reviewEvents.length}{" "}
                      pendientes
                    </span>
                  </div>
                  <div className="sw-review-grid">
                    {data.records
                      .filter((r) => r.review_status === "PENDING")
                      .map((r) => (
                        <article className="sw-review-card" key={r.id}>
                          <span className="sw-chip">Alta de contacto o cliente</span>
                          <h3>{r.company_name}</h3>
                          <p>{r.interest}</p>
                          <small>
                            {name(r.owner_id)} · {day(r.created_at)}
                          </small>
                          <div>
                            <button className="fx-btn ghost" onClick={() => setDetail(r.id)}>
                              Ver detalle
                            </button>
                            <button className="fx-btn primary" onClick={() => reviewRecord(r)}>
                              Revisar alta
                            </button>
                          </div>
                        </article>
                      ))}
                    {data.proposals
                      .filter((p) => p.status === "PENDING_APPROVAL")
                      .map((p) => (
                        <article className="sw-review-card" key={p.quote_id}>
                          <span className="sw-chip">Propuesta comercial</span>
                          <h3>{p.quote_number}</h3>
                          <p>
                            {p.company_name} · {money(p.total_amount)}
                          </p>
                          <small>{name(p.owner_id)}</small>
                          <div>
                            <button className="fx-btn ghost" onClick={() => downloadProposal(p)}>
                              Ver borrador PDF
                            </button>
                            <button className="fx-btn primary" onClick={() => quoteReview(p)}>
                              Autorizar
                            </button>
                          </div>
                        </article>
                      ))}
                    {data.reports
                      .filter((r) => r.review_status === "PENDING")
                      .map((r) => (
                        <article className="sw-review-card" key={r.id}>
                          <span className="sw-chip">Informe del ejecutivo</span>
                          <h3>{r.title}</h3>
                          <p>
                            {name(r.owner_id)} · {day(r.period_from)} al {day(r.period_to)}
                          </p>
                          <button className="fx-btn primary" onClick={() => setReadReport(r)}>
                            Leer y revisar
                          </button>
                        </article>
                      ))}
                    {data.reviewEvents.slice(0, 12).map((e) => (
                      <article className="sw-review-card" key={e.id}>
                        <span className="sw-chip">Gestión registrada</span>
                        <h3>
                          {data.records.find((r) => r.id === e.record_id)?.company_name ??
                            "Seguimiento"}
                        </h3>
                        <p>{e.body}</p>
                        <small>{moment(e.created_at)}</small>
                        <button
                          className="fx-btn ghost"
                          onClick={() => {
                            setDetail(e.record_id);
                          }}
                        >
                          Ver historial y revisar
                        </button>
                      </article>
                    ))}
                  </div>
                  {!data.summary.pendingContacts &&
                  !data.summary.pendingProposals &&
                  !data.summary.pendingReports &&
                  !data.reviewEvents.length ? (
                    <Empty
                      title="Revisión al día"
                      text="Las nuevas gestiones aparecerán aquí para que puedas validarlas."
                    />
                  ) : null}
                </section>
              ) : null}
              <div className="sw-home-grid">
                <section className="sw-panel">
                  <div className="sw-section-title">
                    <div>
                      <span className="sw-eyebrow">AGENDA</span>
                      <h2>Próximos contactos</h2>
                    </div>
                    {data.summary.overdue ? (
                      <span className="sw-overdue">{data.summary.overdue} atrasados</span>
                    ) : null}
                  </div>
                  {nextContacts.length ? (
                    <div className="sw-agenda">
                      {nextContacts.map((r) => (
                        <button key={r.id} onClick={() => setDetail(r.id)}>
                          <span className="sw-agenda-icon">
                            <CalendarClock size={18} />
                          </span>
                          <div>
                            <strong>{r.company_name}</strong>
                            <small>
                              {r.contact_name} · {moment(r.next_action_at)}
                            </small>
                          </div>
                          <ArrowRight size={17} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Sin seguimientos programados"
                      text="Los próximos contactos aparecerán aquí al programar una gestión."
                    />
                  )}
                </section>
                <section className="sw-panel">
                  <div className="sw-section-title">
                    <div>
                      <span className="sw-eyebrow">TRAZABILIDAD</span>
                      <h2>Últimas actualizaciones</h2>
                    </div>
                    <span className="sw-count">{data.records.length} contactos</span>
                  </div>
                  {data.records.length ? (
                    <div className="sw-agenda sw-activity">
                      {[...data.records]
                        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                        .slice(0, 5)
                        .map((r) => (
                          <button key={r.id} onClick={() => setDetail(r.id)}>
                            <div>
                              <strong>{r.company_name}</strong>
                              <small>
                                {stageLabels[r.stage]} · {moment(r.updated_at)}
                              </small>
                            </div>
                            <ArrowRight size={16} />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <Empty
                      title="Sin actividad registrada"
                      text="El historial mostrará los avances y las revisiones de cada contacto."
                    />
                  )}
                </section>
              </div>
              <section className="sw-panel">
                <div className="sw-section-title">
                  <h2>Avance de la cartera</h2>
                  <button className="fx-btn ghost" onClick={() => setTab("clients")}>
                    Ver cartera <ArrowRight size={15} />
                  </button>
                </div>
                <div className="sw-pipeline-summary">
                  {Object.entries(stageLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setStage(key);
                        setTab("clients");
                      }}
                    >
                      <strong>{data.records.filter((r) => r.stage === key).length}</strong>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : null}
          {tab === "clients" ? (
            <section className="sw-panel">
              <div className="sw-section-title">
                <div>
                  <span className="sw-eyebrow">
                    {isAdmin ? "CARTERA COMERCIAL" : "MIS CONTACTOS Y CLIENTES"}
                  </span>
                  <h2>{records.length} gestiones</h2>
                </div>
                <div className="sw-inline-actions">
                  <button
                    className={`sw-icon-button ${view === "list" ? "selected" : ""}`}
                    aria-label="Vista de lista"
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                  >
                    <List size={17} />
                  </button>
                  <button
                    className={`sw-icon-button ${view === "cards" ? "selected" : ""}`}
                    aria-label="Vista de tarjetas"
                    onClick={() => setView("cards")}
                  >
                    <LayoutGrid size={17} />
                  </button>
                  <button
                    className={`sw-icon-button ${view === "pipeline" ? "selected" : ""}`}
                    aria-label="Vista por etapas"
                    title="Tablero por etapas"
                    onClick={() => setView("pipeline")}
                  >
                    <List size={17} />
                  </button>
                  {!isAdmin ? (
                    <button className="fx-btn primary" onClick={() => setRecordForm({})}>
                      <Plus size={15} />
                      Nuevo contacto
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="sw-list-tools">
                <label className="sw-search">
                  <Search size={16} />
                  <input
                    aria-label="Buscar en mi cartera"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Empresa, RUT, contacto o necesidad"
                  />
                </label>
                <select
                  aria-label="Filtrar etapa"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option value="">Todas las etapas</option>
                  {Object.entries(stageLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {view === "list" && records.length ? (
                <div className="sw-table-wrap sw-client-table">
                  <table>
                    <caption className="sw-sr-only">
                      Contactos, avance y próximo seguimiento
                    </caption>
                    <thead>
                      <tr>
                        <th>Empresa y contacto</th>
                        <th>Etapa</th>
                        <th>Revisión</th>
                        {isAdmin ? <th>Responsable</th> : null}
                        <th>Próximo seguimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <button className="sw-table-contact" onClick={() => setDetail(r.id)}>
                              <span className="sw-client-avatar">
                                {r.company_name.slice(0, 2).toUpperCase()}
                              </span>
                              <span>
                                <strong>{r.company_name}</strong>
                                <small>
                                  {r.contact_name}
                                  {r.rut ? ` · ${r.rut}` : ""}
                                </small>
                              </span>
                              <ArrowRight size={15} />
                            </button>
                          </td>
                          <td data-label="Etapa">
                            <span className="sw-chip">{stageLabels[r.stage]}</span>
                          </td>
                          <td data-label="Revisión">
                            <span className={`sw-status ${r.review_status.toLowerCase()}`}>
                              {reviewLabels[r.review_status]}
                            </span>
                          </td>
                          {isAdmin ? <td data-label="Responsable">{name(r.owner_id)}</td> : null}
                          <td data-label="Próximo seguimiento">
                            {r.next_action_at ? moment(r.next_action_at) : "Sin programar"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : view === "pipeline" ? (
                <div className="sw-kanban">
                  {Object.entries(stageLabels).map(([key, label]) => (
                    <section key={key}>
                      <header>
                        <h3>{label}</h3>
                        <span>{records.filter((r) => r.stage === key).length}</span>
                      </header>
                      {records
                        .filter((r) => r.stage === key)
                        .map((r) => (
                          <ContactCard
                            key={r.id}
                            record={r}
                            owner={isAdmin ? name(r.owner_id) : undefined}
                            onOpen={() => setDetail(r.id)}
                          />
                        ))}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="sw-client-grid">
                  {records.map((r) => (
                    <ContactCard
                      key={r.id}
                      record={r}
                      owner={isAdmin ? name(r.owner_id) : undefined}
                      onOpen={() => setDetail(r.id)}
                    />
                  ))}
                </div>
              )}
              {!records.length ? (
                <Empty
                  title={search || stage ? "Sin coincidencias" : "No hay contactos registrados"}
                  text={
                    search || stage
                      ? "Ajusta la búsqueda o la etapa."
                      : "Agrega un contacto, registra su necesidad y acuerda el siguiente paso."
                  }
                />
              ) : null}
              {data.assignedClients.some((c) => !data.records.some((r) => r.client_id === c.id)) ? (
                <section className="sw-assigned">
                  <h3>Clientes asignados para seguimiento</h3>
                  {data.assignedClients
                    .filter((c) => !data.records.some((r) => r.client_id === c.id))
                    .map((c) => (
                      <div key={c.id}>
                        <div>
                          <b>{c.legal_name}</b>
                          <small>{c.rut}</small>
                        </div>
                        <button
                          className="fx-btn ghost"
                          onClick={() => setRecordForm({ client: c })}
                        >
                          Incorporar seguimiento
                        </button>
                      </div>
                    ))}
                </section>
              ) : null}
            </section>
          ) : null}
          {tab === "proposals" ? (
            <section className="sw-panel">
              <div className="sw-section-title">
                <div>
                  <span className="sw-eyebrow">PROPUESTAS Y PLANES</span>
                  <h2>
                    {isAdmin ? "Autoriza lo que se comparte" : "De la necesidad a la propuesta"}
                  </h2>
                </div>
                {
                  <button
                    className="fx-btn primary"
                    disabled={!data.records.length}
                    onClick={() => setProposalForm({})}
                  >
                    <FilePlus2 size={16} />
                    Preparar propuesta
                  </button>
                }
              </div>
              <div className="sw-proposal-grid">
                {data.proposals.map((p) => (
                  <article className="sw-proposal-card" key={p.quote_id}>
                    <header>
                      <span
                        className={`sw-status ${p.status === "PENDING_APPROVAL" ? "pending" : p.status === "REJECTED" ? "rejected" : "approved"}`}
                      >
                        {proposalLabels[p.status] ?? p.status}
                      </span>
                      <small>
                        {p.billing_type === "SUBSCRIPTION" ? "Plan mensual" : "Pago único"}
                      </small>
                    </header>
                    <h3>{p.quote_number}</h3>
                    <p>{p.company_name}</p>
                    <strong className="sw-proposal-amount">
                      {money(p.total_amount)}
                      {p.billing_type === "SUBSCRIPTION" ? <small> / mes</small> : null}
                    </strong>
                    <small>
                      {p.items.length} servicios · Vigente hasta {day(p.valid_until)}
                    </small>
                    <details>
                      <summary>Ver alcance y condiciones</summary>
                      <ul>
                        {p.items.map((i, n) => (
                          <li key={n}>
                            {i.quantity} × {i.description} · {money(i.unitPrice)}
                          </li>
                        ))}
                      </ul>
                      <p className="sw-preserve">{p.commercial_terms}</p>
                      <p>{p.payment_terms}</p>
                    </details>
                    {p.review_note ? <p className="sw-review-comment">{p.review_note}</p> : null}
                    <div className="sw-proposal-actions">
                      <button
                        className="fx-btn ghost"
                        disabled={action.busy}
                        onClick={() => downloadProposal(p)}
                      >
                        <Download size={14} />
                        {["DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(p.status)
                          ? "Borrador PDF"
                          : "PDF aprobado"}
                      </button>
                      {isAdmin && p.status === "PENDING_APPROVAL" ? (
                        <button className="fx-btn primary" onClick={() => quoteReview(p)}>
                          Revisar autorización
                        </button>
                      ) : null}
                      {["APPROVED", "READY_TO_SEND"].includes(p.status) ? (
                        <button
                          className="fx-btn primary"
                          onClick={() =>
                            setReviewTarget({
                              path: `/proposals/${p.quote_id}/shared`,
                              title: "Registrar propuesta compartida",
                              confirmAcceptance: true,
                            })
                          }
                        >
                          Registrar entrega al cliente
                        </button>
                      ) : null}
                      {isAdmin && ["SENT", "NEGOTIATING"].includes(p.status) ? (
                        <button
                          className="fx-btn primary"
                          onClick={() =>
                            setReviewTarget({
                              path: `/proposals/${p.quote_id}/accept`,
                              title: "Validar aceptación del cliente",
                              confirmAcceptance: true,
                            })
                          }
                        >
                          Validar aceptación
                        </button>
                      ) : null}
                      {p.status === "REJECTED" ? (
                        <button
                          className="fx-btn ghost"
                          onClick={() => setProposalForm({ initial: p })}
                        >
                          Corregir y volver a presentar
                        </button>
                      ) : null}
                      {isAdmin &&
                      data.receipts?.some((receipt) => receipt.quote_id === p.quote_id) &&
                      data.records.find((r) => r.id === p.record_id)?.purchase_confirmed !==
                        true ? (
                        <button
                          className="fx-btn primary"
                          onClick={() =>
                            setReviewTarget({
                              path: `/records/${p.record_id}/complete`,
                              title: "Confirmar compra y convertir en cliente",
                              complete: true,
                            })
                          }
                        >
                          Convertir a cliente por compra confirmada
                        </button>
                      ) : null}
                      {isAdmin && ["ACCEPTED", "CONVERTED"].includes(p.status) ? (
                        <Link
                          className="fx-btn ghost"
                          href={`/finance/quote-payments?quote=${p.quote_id}`}
                        >
                          Revisar cobro en Finanzas
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              {!data.proposals.length ? (
                <Empty
                  title="Prepara tu primera propuesta"
                  text="Registra al contacto y elige un plan del catálogo. Administración revisará la propuesta antes de que la compartas."
                />
              ) : null}
            </section>
          ) : null}
          {tab === "plans" && catalog.data ? (
            <>
              <section className="sw-panel">
                <span className="sw-eyebrow">INFORMACIÓN PARA TUS CLIENTES</span>
                <h2>Presenta Zyteron con claridad</h2>
                <p>{catalog.data.company.description}</p>
                <div className="sw-presentation">
                  <p>{catalog.data.company.presentation}</p>
                  <button
                    className="fx-btn ghost"
                    onClick={() =>
                      void action.run(async () => {
                        await navigator.clipboard.writeText(catalog.data!.company.presentation);
                        setCopied(true);
                      }, "Presentación copiada.")
                    }
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}Copiar presentación
                  </button>
                </div>
                <div className="sw-company-links">
                  {catalog.data.company.links.map((l) => (
                    <a key={l.url} target="_blank" rel="noreferrer" href={l.url}>
                      {l.title}
                      <ArrowRight size={15} />
                    </a>
                  ))}
                  <a href={`mailto:${catalog.data.company.email}`}>{catalog.data.company.email}</a>
                </div>
                <details className="sw-discovery">
                  <summary>Preguntas para entender la necesidad</summary>
                  <ol>
                    {catalog.data.company.discovery.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ol>
                </details>
              </section>
              <section className="sw-panel">
                <div className="sw-section-title">
                  <div>
                    <span className="sw-eyebrow">CATÁLOGO COMERCIAL</span>
                    <h2>Planes y servicios de Zyteron</h2>
                  </div>
                </div>
                <p className="sw-help">{catalog.data.pricingNote}</p>
                <PlanLibrary
                  plans={catalog.data.plans}
                  onChoose={(plan) => setProposalForm({ plan })}
                />
              </section>
            </>
          ) : null}
          {tab === "reports" ? (
            <section className="sw-panel">
              <div className="sw-section-title">
                <div>
                  <span className="sw-eyebrow">SEGUIMIENTO E INFORMES</span>
                  <h2>{isAdmin ? "Resultados por responsable" : "Tu trabajo registrado"}</h2>
                </div>
                <div className="sw-inline-actions">
                  <button
                    className="fx-btn ghost"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(() =>
                        workApi.download(
                          role,
                          `/export${query ? `?${query}` : ""}`,
                          "gestion-comercial.csv",
                        ),
                      )
                    }
                  >
                    <Download size={15} />
                    Exportar informe CSV
                  </button>
                  {!isAdmin ? (
                    <button className="fx-btn primary" onClick={() => setReportForm(true)}>
                      <Plus size={15} />
                      Presentar informe
                    </button>
                  ) : null}
                </div>
              </div>
              {isAdmin ? (
                <div className="sw-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Responsable</th>
                        <th>Contactos</th>
                        <th>Clientes</th>
                        <th>Propuestas</th>
                        <th>Ventas validadas</th>
                        <th>Comisión ganada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.owners
                        .filter(
                          (o) =>
                            !owner ||
                            (owner === "administration"
                              ? data.records.some(
                                  (r) => r.owner_type === "ADMIN" && r.owner_id === o.id,
                                )
                              : o.id === owner),
                        )
                        .map((o) => {
                          const own = data.records.filter((r) => r.owner_id === o.id);
                          return (
                            <tr key={o.id}>
                              <td>{o.name}</td>
                              <td>{own.length}</td>
                              <td>
                                {
                                  new Set(
                                    own
                                      .filter(
                                        (r) =>
                                          r.client_id &&
                                          r.client_created &&
                                          r.purchase_confirmed &&
                                          r.review_status === "APPROVED",
                                      )
                                      .map((r) => r.client_id),
                                  ).size
                                }
                              </td>
                              <td>{data.proposals.filter((p) => p.owner_id === o.id).length}</td>
                              <td>
                                {
                                  own.filter((r) => r.stage === "COMPLETED" && r.purchase_confirmed)
                                    .length
                                }
                              </td>
                              <td>
                                {money(
                                  data.earnings
                                    .filter((e) => e.owner_id === o.id && e.status === "EARNED")
                                    .reduce((t, e) => t + e.commission_amount, 0),
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="sw-help">
                  Resume contactos, respuestas, oportunidades, bloqueos y próximos pasos. Cada
                  informe queda disponible para revisión de administración.
                </p>
              )}
              <div className="sw-report-list">
                {data.reports.map((r) => (
                  <button key={r.id} onClick={() => setReadReport(r)}>
                    <FileText size={20} />
                    <div>
                      <b>{r.title}</b>
                      <small>
                        {day(r.period_from)} al {day(r.period_to)}
                        {isAdmin ? ` · ${name(r.owner_id)}` : ""}
                      </small>
                    </div>
                    <span className={`sw-status ${r.review_status.toLowerCase()}`}>
                      {reviewLabels[r.review_status]}
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
              {!data.reports.length ? (
                <Empty
                  title="Aún no hay informes presentados"
                  text="Las gestiones y los resultados de la cartera ya pueden consultarse y exportarse."
                />
              ) : null}
            </section>
          ) : null}
          {tab === "commissions" ? (
            <section className="sw-panel">
              <div className="sw-section-title">
                <div>
                  <span className="sw-eyebrow">COMISIONES · 15%</span>
                  <h2>{money(data.summary.earnedCommission)} ganados</h2>
                </div>
                <Wallet size={30} />
              </div>
              <div className="sw-commission-rule">
                <TrendingUp size={21} />
                <div>
                  <b>15% de la utilidad de cada cobro validado</b>
                  <p>
                    Administración confirma el pago y valida los costos. Las ventas sin cobro
                    confirmado o sin costos revisados siguen pendientes. La comisión calculada no
                    equivale a un pago realizado al ejecutivo.
                  </p>
                </div>
              </div>
              {isAdmin &&
              commissionReceipts.filter(
                (v) => !data.earnings.some((e) => e.receipt_key === v.receipt_key),
              ).length ? (
                <>
                  <h3>Cobros listos para validar utilidad</h3>
                  <div className="sw-receipt-list">
                    {commissionReceipts
                      .filter((v) => !data.earnings.some((e) => e.receipt_key === v.receipt_key))
                      .map((v) => {
                        const p = data.proposals.find((p) => p.quote_id === v.quote_id),
                          r = data.records.find((r) => r.id === p?.record_id);
                        return (
                          <div key={v.source_kind + v.source_id}>
                            <div>
                              <b>
                                {p?.company_name} · {p?.quote_number}
                              </b>
                              <small>
                                Cobro {v.period_label} · Neto {money(v.net_revenue)} ·{" "}
                                {day(v.collected_at)}
                              </small>
                            </div>
                            <button
                              className="fx-btn primary"
                              disabled={!r}
                              onClick={() => r && setProfitTarget({ record: r, receipt: v })}
                            >
                              Validar utilidad y comisión
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </>
              ) : null}
              <div className="sw-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Propuesta</th>
                      {isAdmin ? <th>Responsable</th> : null}
                      <th>Validación</th>
                      <th>Estado</th>
                      <th>Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.earnings.map((e) => (
                      <tr key={e.id}>
                        <td>
                          {data.proposals.find((p) => p.quote_id === e.quote_id)?.quote_number ??
                            "Propuesta"}
                        </td>
                        {isAdmin ? <td>{name(e.owner_id)}</td> : null}
                        <td>{day(e.approved_at)}</td>
                        <td>
                          {e.status === "EARNED"
                            ? "Ganada · pendiente de liquidar"
                            : "En revisión del cobro"}
                        </td>
                        <td>{money(e.commission_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.earnings.length ? (
                <Empty
                  title="Tus comisiones aparecerán al validar las ventas cobradas"
                  text="El porcentaje está fijado en 15%. No se estiman ganancias con costos desconocidos."
                />
              ) : null}
              {isAdmin ? (
                <p className="sw-help">
                  Las cuotas mensuales se revisan por cada cobro. Los importes se calculan sin IVA y
                  no se duplica un cobro registrado también como factura.
                </p>
              ) : null}
            </section>
          ) : null}
          <footer className="sw-footnote">
            Actualizado {moment(data.asOf)} ·{" "}
            {isAdmin ? "Vista de administración" : "Sólo tu cartera y tu gestión comercial"}
          </footer>
        </>
      )}
      {recordForm ? (
        <SalesRecordForm {...recordForm} onClose={() => setRecordForm(null)} onSaved={saved} />
      ) : null}
      {proposalForm && data && catalog.data ? (
        <SalesProposalForm
          {...proposalForm}
          records={data.records}
          plans={catalog.data.plans}
          onClose={() => setProposalForm(null)}
          onSaved={saved}
        />
      ) : null}
      {detail ? (
        <SalesRecordDetail
          key={detail}
          recordId={detail}
          admin={isAdmin}
          onClose={() => setDetail(null)}
          onChanged={reload}
          onEdit={(r) => {
            setDetail(null);
            setRecordForm({ initial: r });
          }}
          onQuote={(r) => {
            setDetail(null);
            setProposalForm({ record: r });
          }}
          onReview={reviewRecord}
          onEventReview={reviewEvent}
          onNewOpportunity={(r) => {
            setDetail(null);
            if (r.client_id)
              setRecordForm({
                client: {
                  id: r.client_id,
                  legal_name: r.company_name,
                  rut: r.rut ?? "",
                  general_email: r.email,
                  phone: r.phone,
                  business_activity: r.business_activity,
                  address: r.address,
                  commune: r.commune,
                  account_executive_id: r.owner_id,
                  contact_name: r.contact_name,
                },
              });
          }}
        />
      ) : null}
      {reviewTarget ? (
        <ReviewDialog
          target={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSaved={() => {
            setReviewTarget(null);
            setDetail(null);
            reload();
          }}
        />
      ) : null}
      {reportForm && data ? (
        <ReportForm records={data.records} onClose={() => setReportForm(false)} onSaved={saved} />
      ) : null}
      {readReport ? (
        <Drawer
          open
          title={readReport.title}
          subtitle={`${day(readReport.period_from)} al ${day(readReport.period_to)}`}
          onClose={() => setReadReport(null)}
          wide
          className="sw-drawer"
        >
          <span className={`sw-status ${readReport.review_status.toLowerCase()}`}>
            {reviewLabels[readReport.review_status]}
          </span>
          <p className="sw-preserve">{readReport.body}</p>
          {readReport.review_note ? <div className="sw-note">{readReport.review_note}</div> : null}
          {isAdmin && readReport.review_status === "PENDING" ? (
            <button
              className="fx-btn primary"
              onClick={() => {
                setReviewTarget({
                  path: `/reports/${readReport.id}/review`,
                  title: "Revisar informe del ejecutivo",
                });
                setReadReport(null);
              }}
            >
              Revisar informe
            </button>
          ) : null}
        </Drawer>
      ) : null}
      {profitTarget ? (
        <ProfitForm
          target={profitTarget}
          onClose={() => setProfitTarget(null)}
          onSaved={() => {
            setProfitTarget(null);
            reload();
          }}
        />
      ) : null}
    </main>
  );
}
function Metric({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <article>
      <span className="sw-metric-icon">{icon}</span>
      <small>{title}</small>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="sw-empty">
      <Users size={24} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function ContactCard({
  record: r,
  owner,
  onOpen,
}: {
  record: WorkRecord;
  owner?: string;
  onOpen: () => void;
}) {
  const [now] = useState(() => Date.now());
  const overdue = r.next_action_at && Date.parse(r.next_action_at) < now;
  return (
    <article className="sw-client-card">
      <button onClick={onOpen}>
        <header>
          <span className="sw-client-avatar">{r.company_name.slice(0, 2).toUpperCase()}</span>
          <span className={`sw-status ${r.review_status.toLowerCase()}`}>
            {reviewLabels[r.review_status]}
          </span>
        </header>
        <h3>{r.company_name}</h3>
        <span className="sw-muted">{r.contact_name}</span>
        <p>{r.interest}</p>
        <div className="sw-card-bottom">
          <span className="sw-chip">{stageLabels[r.stage]}</span>
          <ArrowRight size={17} />
        </div>
        {r.next_action_at ? (
          <small className={overdue ? "sw-late" : ""}>
            <CalendarClock size={13} />
            {moment(r.next_action_at)}
          </small>
        ) : (
          <small>Programa el próximo contacto</small>
        )}
        {owner ? <small>{owner}</small> : null}
      </button>
    </article>
  );
}
function PlanLibrary({
  plans,
  onChoose,
}: {
  plans: PublicPlan[];
  onChoose: (plan: PublicPlan) => void;
}) {
  const [category, setCategory] = useState(""),
    [search, setSearch] = useState("");
  const names: Record<string, string> = {
    web: "Sitios web",
    ecommerce: "Tiendas online",
    sistemas: "Sistemas",
    corporativo: "Corporativo",
    mantencion: "Mantención mensual",
    adicional: "Adicionales",
  };
  return (
    <>
      <div className="sw-list-tools">
        <label className="sw-search">
          <Search size={16} />
          <input
            aria-label="Buscar planes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plan o servicio"
          />
        </label>
        <select
          aria-label="Categoría de planes"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todos los planes</option>
          {[...new Set(plans.map((p) => p.category))].map((c) => (
            <option key={c} value={c}>
              {names[c] ?? c}
            </option>
          ))}
        </select>
      </div>
      <div className="sw-plan-grid">
        {plans
          .filter(
            (p) =>
              (!category || p.category === category) &&
              (!search ||
                (p.name + " " + p.description).toLowerCase().includes(search.toLowerCase())),
          )
          .map((p) => (
            <article className="sw-plan" key={p.id}>
              <span className="sw-eyebrow">{names[p.category] ?? p.category}</span>
              <h3>{p.name}</h3>
              <strong>
                Desde {money(p.amount)}
                <small> + IVA{p.billingType === "SUBSCRIPTION" ? " / mes" : ""}</small>
              </strong>
              <p>{p.description}</p>
              {p.features.length ? (
                <ul>
                  {p.features.slice(0, 5).map((f) => (
                    <li key={f}>
                      <Check size={14} />
                      {f}
                    </li>
                  ))}
                </ul>
              ) : null}
              {
                <button className="fx-btn primary" onClick={() => onChoose(p)}>
                  Usar en propuesta
                  <ArrowRight size={15} />
                </button>
              }
            </article>
          ))}
      </div>
    </>
  );
}
function ReviewDialog({
  target,
  onClose,
  onSaved,
}: {
  target: ReviewTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { role } = useAccess(),
    action = useAction(),
    [decision, setDecision] = useState("APPROVED"),
    [reason, setReason] = useState("");
  const save = async () => {
    const saved = await action.run(() => workApi.post(role, target.path, { decision, reason }));
    if (saved) onSaved();
  };
  return (
    <Drawer
      open
      title={target.title}
      subtitle={
        target.confirmAcceptance
          ? "Registra el respaldo de la conversación o entrega. La aceptación prepara la ficha para facturación; no confirma dinero recibido ni convierte al contacto en cliente."
          : target.complete
            ? "Requiere una compra con cobro completo confirmado y respaldo. Se conserva todo el historial; este paso no calcula ni paga comisiones."
            : "Aprueba el contacto o solicita correcciones. La aprobación no lo convierte en cliente."
      }
      onClose={onClose}
      className="sw-drawer"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {!target.confirmAcceptance && !target.complete ? (
          <Field label="Resultado de revisión">
            <select value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="APPROVED">Aprobar</option>
              <option value="REJECTED">Solicitar corrección</option>
            </select>
          </Field>
        ) : null}
        {target.record ? (
          <div className="sw-note">
            <b>{target.record.company_name}</b>
            <p>RUT: {target.record.rut ?? "Pendiente"}</p>
            <p>{target.record.interest}</p>
          </div>
        ) : null}
        <Field
          label={target.confirmAcceptance ? "Detalle y respaldo" : "Observación para el ejecutivo"}
        >
          <textarea
            required={decision === "REJECTED" || target.confirmAcceptance || target.complete}
            maxLength={2000}
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <Feedback error={action.error} />
        <div className="sw-form-footer">
          <button type="button" className="fx-btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="fx-btn primary"
            type="submit"
            disabled={
              action.busy ||
              ((decision === "REJECTED" || target.confirmAcceptance || target.complete) &&
                !reason.trim())
            }
          >
            {action.busy ? "Guardando…" : "Guardar validación"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
function ReportForm({
  records,
  onClose,
  onSaved,
}: {
  records: WorkRecord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { role } = useAccess(),
    action = useAction(),
    [requestId] = useState(() => crypto.randomUUID()),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [record, setRecord] = useState(""),
    [from, setFrom] = useState(() => todayIso()),
    [to, setTo] = useState(() => todayIso());
  const save = async () => {
    const saved = await action.run(() =>
      workApi.post(role, "/reports", {
        requestId,
        title,
        body,
        record_id: record || null,
        period_from: from,
        period_to: to,
      }),
    );
    if (saved) onSaved();
  };
  return (
    <Drawer
      open
      title="Presentar informe de gestión"
      subtitle="Administración podrá revisarlo y devolver sus observaciones."
      onClose={onClose}
      wide
      className="sw-drawer"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Título">
          <input
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Gestión comercial de la semana"
          />
        </Field>
        <div className="sw-form-grid">
          <Field label="Desde">
            <DateInput required value={from} onChange={setFrom} />
          </Field>
          <Field label="Hasta">
            <DateInput required value={to} onChange={setTo} />
          </Field>
        </div>
        <Field label="Cliente relacionado (opcional)">
          <select value={record} onChange={(e) => setRecord(e.target.value)}>
            <option value="">Informe general de mi cartera</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.company_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Resultados, necesidades y próximos pasos">
          <textarea
            required
            maxLength={10000}
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contactos realizados, respuestas, propuestas, obstáculos y compromisos para el próximo período."
          />
        </Field>
        <Feedback error={action.error} />
        <div className="sw-form-footer">
          <button type="button" className="fx-btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="fx-btn primary"
            disabled={action.busy || !title.trim() || !body.trim()}
          >
            {action.busy ? "Enviando…" : "Enviar a revisión"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
function ProfitForm({
  target,
  onClose,
  onSaved,
}: {
  target: { record: WorkRecord; receipt: Receipt };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { role } = useAccess(),
    action = useAction(),
    [cost, setCost] = useState(""),
    [note, setNote] = useState("");
  const revenue = Number(target.receipt.net_revenue),
    commission = Math.round(Math.max(0, revenue - Number(cost || 0)) * 0.15);
  const save = async () => {
    const saved = await action.run(() =>
      workApi.post(role, `/records/${target.record.id}/profit`, {
        source_kind: target.receipt.source_kind,
        source_id: target.receipt.source_id,
        validated_cost: Number(cost),
        cost_note: note,
      }),
    );
    if (saved) onSaved();
  };
  return (
    <Drawer
      open
      title="Validar utilidad y comisión"
      subtitle={`${target.record.company_name} · Cobro confirmado ${target.receipt.period_label}`}
      onClose={onClose}
      className="sw-drawer"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="sw-note">
          Ingreso neto cobrado: <b>{money(revenue)}</b>. Se excluye IVA.
        </div>
        <Field label="Costo neto validado de este cobro">
          <input
            required
            type="number"
            min="0"
            max="1000000000000"
            step="1"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </Field>
        <Field label="Respaldo y detalle de los costos">
          <textarea
            required
            maxLength={2000}
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Costos directos, período y fuente de revisión."
          />
        </Field>
        <dl className="sw-data">
          <div>
            <dt>Utilidad</dt>
            <dd>{cost !== "" ? money(Math.max(0, revenue - Number(cost))) : "Pendiente"}</dd>
          </div>
          <div>
            <dt>Comisión 15%</dt>
            <dd>{cost !== "" ? money(commission) : "Pendiente"}</dd>
          </div>
        </dl>
        <p className="sw-help">
          Esta validación genera el cálculo de la comisión. Su liquidación y pago son posteriores.
          Los costos quedan reservados a administración.
        </p>
        <Feedback error={action.error} />
        <div className="sw-form-footer">
          <button type="button" className="fx-btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="fx-btn primary"
            disabled={
              action.busy ||
              cost === "" ||
              !note.trim() ||
              !Number.isFinite(Number(cost)) ||
              Number(cost) < 0
            }
          >
            {action.busy ? "Validando…" : "Confirmar utilidad y comisión"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

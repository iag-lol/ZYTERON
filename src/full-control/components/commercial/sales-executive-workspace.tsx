"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlarmClock,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Columns3,
  Command,
  Copy,
  Download,
  FileDown,
  FilePlus2,
  FileText,
  Flame,
  Gauge,
  Hourglass,
  LayoutGrid,
  MessageCircle,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "../routed-link";
import { useAccess } from "../access-context";
import { DateInput, Drawer, Feedback, Field, useAction, useLoad } from "../finance/fx-ui";
import { day, moment, todayIso } from "@control/lib/finance-format";
import {
  workApi,
  stageLabels,
  reviewLabels,
  proposalLabels,
  type Stage,
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
import {
  agenda,
  agendaIcs,
  agendaLabels,
  dateKey,
  daysUntil,
  expiringProposals,
  funnel,
  isCooling,
  isOpen,
  matches,
  monthLabel,
  monthlyCommission,
  pipeline,
  priority,
  priorityLabels,
  proposalGroup,
  proposalGroupLabels,
  proposalMessage,
  proposalProbability,
  reportDraft,
  sharedProposalStatuses,
  shortDay,
  stageOrder,
  toCsv,
  weeklySeries,
  whatsappLink,
  whatsappShare,
  winRate,
  type AgendaBucket,
  type ProposalGroup,
} from "@control/lib/sales-insights";
import { SalesRecordForm } from "./sales-record-form";
import { SalesProposalForm } from "./sales-proposal-form";
import { SalesRecordDetail } from "./sales-record-detail";
import {
  Columns,
  CommandPalette,
  ContactActions,
  HBars,
  PriorityBadge,
  QuickLog,
  Ring,
  Sparkline,
  type LogIntent,
  type PaletteItem,
} from "./sales-workspace-ui";
import "@control/styles/sales-executive.css";
import "@control/styles/sales-executive-pro.css";

const money = (v: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(v));
const compact = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `$${(v / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} M`
    : Math.abs(v) >= 10_000
      ? `$${Math.round(v / 1000).toLocaleString("es-CL")} mil`
      : money(v);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const tabs = [
  { id: "home", label: "Mi jornada", short: "Jornada", icon: LayoutGrid },
  { id: "clients", label: "Cartera", short: "Cartera", icon: Users },
  { id: "proposals", label: "Propuestas", short: "Propuestas", icon: FileText },
  { id: "plans", label: "Planes y material", short: "Planes", icon: BookOpen },
  { id: "reports", label: "Informes", short: "Informes", icon: ClipboardCheck },
  { id: "commissions", label: "Comisiones", short: "Comisión", icon: Wallet },
];
const segments = [
  { id: "all", label: "Todos" },
  { id: "focus", label: "Prioridad alta" },
  { id: "overdue", label: "Atrasados" },
  { id: "today", label: "Hoy" },
  { id: "unscheduled", label: "Sin seguimiento" },
  { id: "cooling", label: "Enfriándose" },
  { id: "pending", label: "Por validar" },
  { id: "rejected", label: "Requiere corrección" },
] as const;
type Segment = (typeof segments)[number]["id"];
const sorts = [
  { id: "priority", label: "Prioridad" },
  { id: "next", label: "Próximo seguimiento" },
  { id: "updated", label: "Última actividad" },
  { id: "created", label: "Más recientes" },
  { id: "name", label: "Empresa A–Z" },
] as const;
type Sort = (typeof sorts)[number]["id"];
type View = "list" | "cards" | "pipeline";
type ReviewTarget = {
  path: string;
  title: string;
  confirmAcceptance?: boolean;
  complete?: boolean;
  record?: WorkRecord;
};
const PREFS = "zy.sales-workspace.prefs.v1";
function readPrefs(): { view?: View; sort?: Sort } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(PREFS) ?? "{}");
  } catch {
    return {};
  }
}
function savePrefs(value: { view: View; sort: Sort }) {
  try {
    window.localStorage.setItem(PREFS, JSON.stringify(value));
  } catch {
    /* preferencia opcional del navegador */
  }
}
function saveFile(name: string, content: string, type: string) {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
const hourIn = (ms: number) =>
  Number(
    new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(ms),
  );
const longDate = (ms: number) =>
  new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(ms);
function ago(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "··";

export function SalesExecutiveWorkspace({ section = "home" }: { section?: string }) {
  const { role } = useAccess(),
    isAdmin = role === "GERENTE_GENERAL",
    allowed = isAdmin || role === "EJECUTIVA_VENTAS";
  const [tab, setTab] = useState(tabs.some((t) => t.id === section) ? section : "home"),
    [owner, setOwner] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [filtersOpen, setFiltersOpen] = useState(false),
    [search, setSearch] = useState(""),
    [stage, setStage] = useState(""),
    [segment, setSegment] = useState<Segment>("all"),
    [view, setView] = useState<View>(() => readPrefs().view ?? "list"),
    [sort, setSort] = useState<Sort>(() => readPrefs().sort ?? "priority"),
    [agendaTab, setAgendaTab] = useState<AgendaBucket>("overdue"),
    [inboxFilter, setInboxFilter] = useState("all"),
    [proposalFilter, setProposalFilter] = useState<ProposalGroup | "all">("all"),
    [proposalSearch, setProposalSearch] = useState(""),
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
    [logIntent, setLogIntent] = useState<LogIntent | null>(null),
    [palette, setPalette] = useState(false),
    [dragging, setDragging] = useState<string | null>(null),
    [dropStage, setDropStage] = useState<Stage | null>(null),
    [copied, setCopied] = useState(false),
    [now, setNow] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);
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
      setNow(Date.now());
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
  useEffect(() => savePrefs({ view, sort }), [view, sort]);

  const go = useCallback((id: string) => {
    setTab(id);
    try {
      const path = window.location.pathname;
      const marker = "/commercial/workspace";
      const i = path.indexOf(marker);
      if (i >= 0) {
        const base = path.slice(0, i + marker.length);
        window.history.replaceState(null, "", id === "home" ? base : `${base}/${id}`);
      }
    } catch {
      /* la navegación por pestañas funciona aunque no se actualice la dirección */
    }
  }, []);

  const proposals = useMemo(() => data?.proposals ?? [], [data]);
  const allRecords = useMemo(() => data?.records ?? [], [data]);
  const scored = useMemo(
    () => new Map(allRecords.map((r) => [r.id, priority(r, proposals, now)])),
    [allRecords, proposals, now],
  );
  const groups = useMemo(() => agenda(allRecords, now), [allRecords, now]);
  const pipe = useMemo(() => pipeline(proposals), [proposals]);
  const steps = useMemo(() => funnel(allRecords), [allRecords]);
  const rate = useMemo(() => winRate(allRecords), [allRecords]);
  const expiring = useMemo(() => expiringProposals(proposals, 5, now), [proposals, now]);
  const contactWeeks = useMemo(
    () =>
      weeklySeries(
        allRecords.map((r) => r.created_at),
        8,
        now,
      ).map((w, i, all) => ({ label: shortDay(w.start), value: w.value, detail: `Semana del ${shortDay(w.start)} al ${shortDay(w.end)}${i === all.length - 1 ? " (en curso)" : ""}` })),
    [allRecords, now],
  );
  const proposalWeeks = useMemo(
    () =>
      weeklySeries(
        proposals.map((p) => p.created_at),
        8,
        now,
      ).map((w, i, all) => ({ label: shortDay(w.start), value: w.value, detail: `Semana del ${shortDay(w.start)} al ${shortDay(w.end)}${i === all.length - 1 ? " (en curso)" : ""}` })),
    [proposals, now],
  );
  const commissionMonths = useMemo(
    () =>
      monthlyCommission(data?.earnings ?? [], 6, now).map((m) => ({
        label: monthLabel(m.month),
        value: m.value,
      })),
    [data, now],
  );

  const segmentCount = useCallback(
    (id: Segment) =>
      allRecords.filter((r) => inSegment(r, id, scored, now)).length,
    [allRecords, scored, now],
  );
  const records = useMemo(() => {
    const list = allRecords.filter(
      (r) =>
        (!stage || r.stage === stage) &&
        matches(search, r.company_name, r.contact_name, r.rut, r.email, r.phone, r.interest, r.commune) &&
        inSegment(r, segment, scored, now),
    );
    const by: Record<Sort, (a: WorkRecord, b: WorkRecord) => number> = {
      priority: (a, b) => (scored.get(b.id)?.score ?? 0) - (scored.get(a.id)?.score ?? 0),
      next: (a, b) =>
        (a.next_action_at ?? "9999").localeCompare(b.next_action_at ?? "9999"),
      updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
      created: (a, b) => b.created_at.localeCompare(a.created_at),
      name: (a, b) => a.company_name.localeCompare(b.company_name, "es-CL"),
    };
    return [...list].sort(by[sort]);
  }, [allRecords, stage, search, segment, scored, now, sort]);

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
  const exportView = () => {
    const rows = records.map((r) => {
      const p = scored.get(r.id);
      return [
        r.company_name,
        r.contact_name,
        r.rut,
        r.email,
        r.phone,
        r.commune,
        r.interest,
        stageLabels[r.stage],
        reviewLabels[r.review_status],
        p ? `${priorityLabels[p.level]} (${p.score})` : "",
        ...(isAdmin ? [name(r.owner_id)] : []),
        r.next_action_at ? moment(r.next_action_at) : "",
        moment(r.updated_at),
      ];
    });
    saveFile(
      `cartera-comercial-${todayIso()}.csv`,
      toCsv([
        [
          "Empresa",
          "Contacto",
          "RUT",
          "Correo",
          "Teléfono",
          "Comuna",
          "Necesidad",
          "Etapa",
          "Revisión",
          "Prioridad",
          ...(isAdmin ? ["Responsable"] : []),
          "Próximo seguimiento",
          "Última actividad",
        ],
        ...rows,
      ]),
      "text/csv;charset=utf-8",
    );
    action.setNotice(`Cartera exportada: ${rows.length} registros de la vista actual.`);
  };
  const exportAgenda = () => {
    const scheduled = allRecords.filter((r) => r.next_action_at && isOpen(r));
    saveFile(`seguimientos-zyteron-${todayIso()}.ics`, agendaIcs(scheduled, Date.now()), "text/calendar;charset=utf-8");
    action.setNotice(
      `${scheduled.length} seguimientos exportados. Ábrelo con Google Calendar, Outlook o Calendario de Apple.`,
    );
  };
  const openCommission = () => go("commissions");
  const startDrop = (r: WorkRecord, target: Stage) => {
    if (r.stage === target) return;
    if (target === "COMPLETED") {
      action.setError("La venta validada la confirma administración al registrar la compra con cobro completo.");
      return;
    }
    if (
      target === "ACCEPTED" &&
      !proposals.some((p) => p.record_id === r.id && sharedProposalStatuses.includes(p.status))
    ) {
      action.setError("Para informar aceptación, primero registra la entrega de una propuesta autorizada.");
      return;
    }
    action.setError("");
    setLogIntent({ record: r, stage: target });
  };

  const anyOverlay =
    palette ||
    !!detail ||
    !!recordForm ||
    !!proposalForm ||
    reportForm ||
    !!reviewTarget ||
    !!profitTarget ||
    !!readReport ||
    !!logIntent;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        anyOverlay ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
      )
        return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setRecordForm({});
      } else if (e.key === "/") {
        e.preventDefault();
        go("clients");
        window.setTimeout(() => searchRef.current?.focus(), 30);
      } else if (/^[1-6]$/.test(e.key)) {
        go(tabs[Number(e.key) - 1].id);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [anyOverlay, go]);

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      ...tabs.map((t, i) => ({
        id: `tab-${t.id}`,
        group: "Ir a",
        label: isAdmin && t.id === "home" ? "Resumen" : t.label,
        hint: `Atajo ${i + 1}`,
        icon: <t.icon size={16} />,
        run: () => go(t.id),
      })),
      {
        id: "new-contact",
        group: "Acciones",
        label: "Nuevo contacto comercial",
        hint: "Atajo N",
        icon: <Plus size={16} />,
        run: () => setRecordForm({}),
      },
      {
        id: "new-proposal",
        group: "Acciones",
        label: "Preparar propuesta",
        icon: <FilePlus2 size={16} />,
        run: () => setProposalForm({}),
      },
      {
        id: "export-view",
        group: "Acciones",
        label: "Exportar cartera a Excel (CSV)",
        icon: <FileDown size={16} />,
        run: exportView,
      },
      {
        id: "export-ics",
        group: "Acciones",
        label: "Descargar agenda de seguimientos (.ics)",
        hint: "Google Calendar, Outlook, Apple",
        icon: <CalendarDays size={16} />,
        run: exportAgenda,
      },
      {
        id: "refresh",
        group: "Acciones",
        label: "Actualizar datos",
        icon: <RefreshCw size={16} />,
        run: reload,
      },
    ];
    if (!isAdmin)
      items.push({
        id: "report",
        group: "Acciones",
        label: "Presentar informe de gestión",
        icon: <ClipboardCheck size={16} />,
        run: () => setReportForm(true),
      });
    for (const r of allRecords)
      items.push({
        id: `r-${r.id}`,
        group: "Contactos y clientes",
        label: r.company_name,
        hint: `${r.contact_name} · ${stageLabels[r.stage]}${isAdmin ? ` · ${name(r.owner_id)}` : ""}`,
        keywords: [r.rut, r.email, r.phone, r.interest, r.commune].filter(Boolean).join(" "),
        icon: <span className="swx-mini-avatar">{initials(r.company_name)}</span>,
        run: () => setDetail(r.id),
      });
    for (const p of proposals)
      items.push({
        id: `p-${p.quote_id}`,
        group: "Propuestas",
        label: `${p.quote_number} · ${p.company_name}`,
        hint: `${proposalLabels[p.status] ?? p.status} · ${money(p.total_amount)}`,
        icon: <FileText size={16} />,
        run: () => {
          setProposalFilter("all");
          setProposalSearch(p.quote_number);
          go("proposals");
        },
      });
    for (const plan of catalog.data?.plans ?? [])
      items.push({
        id: `plan-${plan.id}`,
        group: "Planes",
        label: plan.name,
        hint: `Desde ${money(plan.amount)} + IVA · usar en propuesta`,
        keywords: plan.description,
        icon: <BookOpen size={16} />,
        run: () => setProposalForm({ plan }),
      });
    return items;
    // exportView/exportAgenda/reload/name dependen de los mismos datos memorizados aquí.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRecords, proposals, catalog.data, isAdmin, go, records]);

  if (!allowed)
    return (
      <div className="sw swx">
        <Feedback error="Tu rol no tiene acceso a la gestión de ejecutivos." />
      </div>
    );

  const pendingTotal = data
    ? data.summary.pendingContacts +
      data.summary.pendingProposals +
      data.summary.pendingReports +
      data.reviewEvents.length
    : 0;
  const hour = hourIn(now);
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const openCount = allRecords.filter(isOpen).length;
  const lostCount = allRecords.filter((r) => r.stage === "LOST").length;

  return (
    <main className="sw swx">
      {load.loading && data ? <div className="swx-progress" aria-hidden="true" /> : null}
      <header className="swx-hero">
        <div className="swx-hero-orbit" aria-hidden="true" />
        <div className="swx-hero-main">
          <span className="swx-eyebrow">
            OPERACIONES COMERCIALES{data ? ` · ${longDate(now).toUpperCase()}` : ""}
          </span>
          <h1>{isAdmin ? "Gestión comercial" : "Mi gestión comercial"}</h1>
          <p>
            {data ? (
              <>
                {greeting}.{" "}
                {groups.overdue.length || groups.today.length ? (
                  <>
                    Tienes{" "}
                    <b>
                      {plural(groups.overdue.length, "seguimiento atrasado", "seguimientos atrasados")}
                    </b>{" "}
                    y{" "}
                    <b>{groups.today.length} para hoy</b>
                  </>
                ) : (
                  <>Tu agenda de seguimientos está al día</>
                )}
                {isAdmin && pendingTotal ? (
                  <>
                    {" "}
                    · <b>{plural(pendingTotal, "registro por validar", "registros por validar")}</b>
                  </>
                ) : !isAdmin && data.summary.pendingProposals ? (
                  <>
                    {" "}
                    ·{" "}
                    <b>
                      {plural(
                        data.summary.pendingProposals,
                        "propuesta esperando autorización",
                        "propuestas esperando autorización",
                      )}
                    </b>
                  </>
                ) : null}
                .
              </>
            ) : isAdmin ? (
              "Contactos, seguimiento, propuestas y compras confirmadas."
            ) : (
              "Cartera personal, seguimientos y propuestas pendientes."
            )}
          </p>
          <div className="swx-hero-tags">
            <span className={`swx-live${load.error ? " off" : ""}`}>
              <i aria-hidden="true" />
              {load.error
                ? "Sin conexión con la gestión"
                : data
                  ? `En vivo · actualizado ${ago(data.asOf, now)}`
                  : "Conectando…"}
            </span>
            <span>
              <CheckCircle2 size={14} /> {isAdmin ? "Administración" : "Cartera personal"}
            </span>
            <button type="button" onClick={openCommission}>
              <Wallet size={14} />
              Comisión de ejecutivos: 15%
            </button>
          </div>
        </div>
        <div className="swx-hero-actions">
          <button
            type="button"
            className="swx-search-trigger"
            onClick={() => setPalette(true)}
            aria-label="Buscar y ejecutar acciones"
          >
            <Search size={16} />
            <span>Buscar o ejecutar…</span>
            <kbd>
              <Command size={11} />K
            </kbd>
          </button>
          <div className="swx-hero-buttons">
            <button type="button" className="swx-btn-primary" onClick={() => setRecordForm({})}>
              <Plus size={17} />
              Nuevo contacto
            </button>
            <button
              type="button"
              className="swx-btn-glass"
              disabled={!data?.records.length}
              onClick={() => setProposalForm({})}
            >
              <FilePlus2 size={16} />
              Propuesta
            </button>
            {isAdmin ? (
              <button type="button" className="swx-btn-glass" onClick={() => go("reports")}>
                <ClipboardCheck size={16} />
                Informe
              </button>
            ) : null}
            <button
              type="button"
              className="swx-btn-icon"
              aria-label="Actualizar gestión comercial"
              title="Actualizar"
              onClick={reload}
              disabled={load.loading}
            >
              <RefreshCw size={16} className={load.loading ? "swx-spin" : ""} />
            </button>
          </div>
        </div>
      </header>
      <Feedback error={action.error || load.error || catalog.error} notice={action.notice} />
      {isAdmin ? (
        <section className={`swx-filters${filtersOpen || owner || from || to ? " open" : ""}`}>
          <button
            type="button"
            className="swx-filters-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal size={15} />
            Filtros de administración
            {owner || from || to ? <span className="swx-dot-count">{[owner, from, to].filter(Boolean).length}</span> : null}
          </button>
          <div className="swx-filters-body">
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
              type="button"
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
        </section>
      ) : null}
      <nav className="swx-tabs" aria-label="Secciones de gestión comercial">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            className={tab === t.id ? "active" : ""}
            onClick={() => go(t.id)}
            title={`Atajo ${i + 1}`}
          >
            <t.icon size={16} />
            {isAdmin && t.id === "home" ? "Resumen" : t.label}
            {t.id === "proposals" && data?.summary.pendingProposals ? (
              <span className="swx-badge">{data.summary.pendingProposals}</span>
            ) : null}
            {t.id === "home" && isAdmin && pendingTotal ? (
              <span className="swx-badge">{pendingTotal}</span>
            ) : null}
          </button>
        ))}
      </nav>
      {!data ? (
        <div className="swx-skeleton" aria-busy="true" aria-label="Cargando tu gestión comercial">
          <div className="swx-kpis">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="swx-skel" />
            ))}
          </div>
          <div className="swx-home-grid">
            <span className="swx-skel tall" />
            <span className="swx-skel tall" />
          </div>
          <p className="sw-sr-only">Cargando tu gestión comercial…</p>
        </div>
      ) : (
        <div className="swx-view" key={tab}>
          {tab === "home" || tab === "reports" ? (
            <section className="swx-kpis" aria-label="Resumen de gestión">
              <Kpi
                title="Cartera activa"
                value={String(openCount)}
                icon={<Users size={18} />}
                hint={`${plural(data.summary.contacts, "contacto", "contactos")} · ${data.summary.interested} con interés o propuesta`}
                onClick={() => {
                  setSegment("all");
                  setStage("");
                  go("clients");
                }}
              >
                <Sparkline points={contactWeeks} label="Contactos nuevos por semana" />
              </Kpi>
              <Kpi
                title="Pipeline abierto (neto)"
                value={compact(pipe.value)}
                icon={<TrendingUp size={18} />}
                hint={`Ponderado ${compact(pipe.weighted)} · ${plural(pipe.open, "propuesta", "propuestas")}`}
                onClick={() => go("proposals")}
              >
                <Sparkline points={proposalWeeks} label="Propuestas preparadas por semana" />
              </Kpi>
              <Kpi
                title="Tasa de cierre"
                value={pct(rate)}
                icon={<Target size={18} />}
                hint={`${plural(data.summary.completed, "venta validada", "ventas validadas")} · ${plural(data.summary.generatedClients, "cliente", "clientes")} por compra`}
                aside={<Ring value={rate} label="Tasa de cierre" />}
              />
              <Kpi
                title="Comisión ganada"
                value={compact(data.summary.earnedCommission)}
                icon={<Wallet size={18} />}
                hint="15% · cobro y utilidad validados"
                onClick={openCommission}
              >
                <Sparkline points={commissionMonths} format={compact} label="Comisión ganada por mes" />
              </Kpi>
              {isAdmin ? (
                <Kpi
                  title="Por validar"
                  value={String(pendingTotal)}
                  icon={<ClipboardCheck size={18} />}
                  hint={`${plural(data.summary.pendingContacts, "alta", "altas")} · ${plural(data.summary.pendingProposals, "propuesta", "propuestas")} · ${plural(data.summary.pendingReports, "informe", "informes")}`}
                  tone={pendingTotal ? "warn" : undefined}
                  onClick={() => go("home")}
                />
              ) : (
                <Kpi
                  title="Seguimientos atrasados"
                  value={String(groups.overdue.length)}
                  icon={<AlarmClock size={18} />}
                  hint={`${groups.today.length} para hoy · ${groups.unscheduled.length} sin programar`}
                  tone={groups.overdue.length ? "bad" : undefined}
                  onClick={() => {
                    setSegment("overdue");
                    go("clients");
                  }}
                />
              )}
            </section>
          ) : null}

          {tab === "home" ? (
            <>
              {isAdmin ? (
                <section className="swx-panel">
                  <PanelTitle
                    eyebrow="BANDEJA DE VALIDACIÓN"
                    title="Registros que necesitan tu revisión"
                    aside={<span className="swx-count">{pendingTotal} pendientes</span>}
                  />
                  <div className="swx-chips" role="group" aria-label="Filtrar bandeja">
                    {[
                      ["all", "Todo", pendingTotal],
                      ["records", "Altas", data.summary.pendingContacts],
                      ["proposals", "Propuestas", data.summary.pendingProposals],
                      ["reports", "Informes", data.summary.pendingReports],
                      ["events", "Gestiones", data.reviewEvents.length],
                    ].map(([id, label, count]) => (
                      <button
                        key={String(id)}
                        type="button"
                        aria-pressed={inboxFilter === id}
                        className={inboxFilter === id ? "on" : ""}
                        onClick={() => setInboxFilter(String(id))}
                      >
                        {label}
                        <span>{count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="swx-review-grid">
                    {["all", "records"].includes(inboxFilter)
                      ? data.records
                          .filter((r) => r.review_status === "PENDING")
                          .map((r) => (
                            <article className="swx-review-card" key={r.id}>
                              <span className="swx-kind contact">Alta de contacto o cliente</span>
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
                          ))
                      : null}
                    {["all", "proposals"].includes(inboxFilter)
                      ? data.proposals
                          .filter((p) => p.status === "PENDING_APPROVAL")
                          .map((p) => (
                            <article className="swx-review-card" key={p.quote_id}>
                              <span className="swx-kind proposal">Propuesta comercial</span>
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
                          ))
                      : null}
                    {["all", "reports"].includes(inboxFilter)
                      ? data.reports
                          .filter((r) => r.review_status === "PENDING")
                          .map((r) => (
                            <article className="swx-review-card" key={r.id}>
                              <span className="swx-kind report">Informe del ejecutivo</span>
                              <h3>{r.title}</h3>
                              <p>
                                {name(r.owner_id)} · {day(r.period_from)} al {day(r.period_to)}
                              </p>
                              <div>
                                <button className="fx-btn primary" onClick={() => setReadReport(r)}>
                                  Leer y revisar
                                </button>
                              </div>
                            </article>
                          ))
                      : null}
                    {["all", "events"].includes(inboxFilter)
                      ? data.reviewEvents.slice(0, 12).map((e) => (
                          <article className="swx-review-card" key={e.id}>
                            <span className="swx-kind event">Gestión registrada</span>
                            <h3>
                              {data.records.find((r) => r.id === e.record_id)?.company_name ??
                                "Seguimiento"}
                            </h3>
                            <p>{e.body}</p>
                            <small>{moment(e.created_at)}</small>
                            <div>
                              <button className="fx-btn ghost" onClick={() => setDetail(e.record_id)}>
                                Ver historial y revisar
                              </button>
                            </div>
                          </article>
                        ))
                      : null}
                  </div>
                  {!pendingTotal ? (
                    <Empty
                      icon={<CheckCircle2 size={22} />}
                      title="Revisión al día"
                      text="Las nuevas gestiones aparecerán aquí para que puedas validarlas."
                    />
                  ) : null}
                </section>
              ) : null}
              <div className="swx-home-grid">
                <div className="swx-stack">
                <section className="swx-panel swx-focus">
                  <PanelTitle
                    eyebrow="AGENDA"
                    title="Foco de hoy"
                    aside={
                      <button type="button" className="fx-btn ghost" onClick={exportAgenda}>
                        <CalendarDays size={15} />
                        Exportar agenda
                      </button>
                    }
                  />
                  <div className="swx-agenda-tabs" role="tablist" aria-label="Seguimientos por urgencia">
                    {(["overdue", "today", "week", "unscheduled"] as AgendaBucket[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        role="tab"
                        aria-selected={agendaTab === b}
                        className={`${agendaTab === b ? "on" : ""} ${b}`}
                        onClick={() => setAgendaTab(b)}
                      >
                        <strong>{groups[b].length}</strong>
                        <span>{agendaLabels[b]}</span>
                      </button>
                    ))}
                  </div>
                  {groups[agendaTab].length ? (
                    <ul className="swx-agenda">
                      {groups[agendaTab].slice(0, 8).map((r) => (
                        <li key={r.id}>
                          <button type="button" className="swx-agenda-main" onClick={() => setDetail(r.id)}>
                            <span className="swx-avatar">{initials(r.company_name)}</span>
                            <span>
                              <strong>{r.company_name}</strong>
                              <small>
                                {r.contact_name} · {stageLabels[r.stage]}
                              </small>
                            </span>
                            <span className={`swx-when ${agendaTab}`}>
                              {r.next_action_at ? (
                                <>
                                  <CalendarClock size={13} />
                                  {moment(r.next_action_at)}
                                </>
                              ) : (
                                `Sin actividad ${ago(r.updated_at, now)}`
                              )}
                            </span>
                          </button>
                          <ContactActions record={r} compact onLog={setLogIntent} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Empty
                      icon={<CheckCircle2 size={22} />}
                      title={
                        agendaTab === "overdue"
                          ? "Sin seguimientos atrasados"
                          : agendaTab === "unscheduled"
                            ? "Todos tus contactos tienen próximo paso"
                            : "Sin seguimientos en este período"
                      }
                      text="Programa el próximo contacto al registrar cada gestión."
                    />
                  )}
                  {groups[agendaTab].length > 8 ? (
                    <button
                      type="button"
                      className="swx-more"
                      onClick={() => {
                        setSegment(agendaTab === "week" ? "all" : (agendaTab as Segment));
                        setSort("next");
                        go("clients");
                      }}
                    >
                      Ver los {groups[agendaTab].length} en la cartera <ArrowRight size={14} />
                    </button>
                  ) : null}
                </section>
                <section className="swx-panel">
                  <PanelTitle eyebrow="RITMO" title="Contactos nuevos por semana" aside={<Gauge size={18} />} />
                  <Columns points={contactWeeks} label="Contactos registrados por semana (8 semanas)" height={120} />
                </section>
                </div>
                <div className="swx-stack">
                  <section className="swx-panel">
                    <PanelTitle
                      eyebrow="EMBUDO COMERCIAL"
                      title="Avance de la cartera"
                      aside={<span className="swx-count">{lostCount} no continúan</span>}
                    />
                    <HBars
                      label="Distribución acumulada según la etapa actual; no representa el historial de avances"
                      accentLast
                      rows={steps.map((s) => ({
                        key: s.stage,
                        label: stageLabels[s.stage],
                        value: s.reached,
                        note:
                          s.conversion === null
                            ? `${s.current} en esta etapa`
                            : `${pct(s.conversion)} de la etapa previa · ${s.current} aquí`,
                      }))}
                      onSelect={(key) => {
                        setStage(key);
                        setSegment("all");
                        go("clients");
                      }}
                    />
                    <p className="swx-footnote-inline">
                      Distribución acumulada según la etapa actual. No reconstruye el historial de avances.
                    </p>
                  </section>
                  <section className="swx-panel">
                    <PanelTitle eyebrow="VIGENCIA" title="Propuestas por vencer" aside={<Hourglass size={18} />} />
                    {expiring.length ? (
                      <ul className="swx-expiring">
                        {expiring.slice(0, 5).map((p) => {
                          const left = daysUntil(p.valid_until, now);
                          return (
                            <li key={p.quote_id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setProposalFilter("all");
                                  setProposalSearch(p.quote_number);
                                  go("proposals");
                                }}
                              >
                                <span>
                                  <strong>{p.quote_number}</strong>
                                  <small>
                                    {p.company_name} · {compact(p.net_amount)} neto
                                  </small>
                                </span>
                                <span className={`swx-days${left <= 1 ? " urgent" : ""}`}>
                                  {left <= 0 ? "Vence hoy" : left === 1 ? "Vence mañana" : `${left} días`}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="swx-inline-empty">
                        <CheckCircle2 size={16} />
                        Sin propuestas que venzan en los próximos 5 días.
                      </p>
                    )}
                  </section>
                <section className="swx-panel">
                  <PanelTitle
                    eyebrow="TRAZABILIDAD"
                    title="Últimas actualizaciones"
                    aside={<span className="swx-count">{data.records.length} contactos</span>}
                  />
                  {data.records.length ? (
                    <ol className="swx-timeline">
                      {[...data.records]
                        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                        .slice(0, 6)
                        .map((r) => (
                          <li key={r.id}>
                            <button type="button" onClick={() => setDetail(r.id)}>
                              <i className={`stage-${r.stage.toLowerCase()}`} aria-hidden="true" />
                              <span>
                                <strong>{r.company_name}</strong>
                                <small>
                                  {stageLabels[r.stage]} · {ago(r.updated_at, now)}
                                  {isAdmin ? ` · ${name(r.owner_id)}` : ""}
                                </small>
                              </span>
                              <ArrowRight size={15} />
                            </button>
                          </li>
                        ))}
                    </ol>
                  ) : (
                    <p className="swx-inline-empty">
                      <CheckCircle2 size={16} />
                      El historial mostrará los avances y revisiones de cada contacto.
                    </p>
                  )}
                </section>
                </div>
              </div>
            </>
          ) : null}

          {tab === "clients" ? (
            <section className="swx-panel">
              <PanelTitle
                eyebrow={isAdmin ? "CARTERA COMERCIAL" : "MIS CONTACTOS Y CLIENTES"}
                title={`${records.length} gestiones${records.length !== allRecords.length ? ` de ${allRecords.length}` : ""}`}
                aside={
                  <div className="swx-inline">
                    <div className="swx-views" role="group" aria-label="Vista de la cartera">
                      {(
                        [
                          ["list", Rows3, "Lista"],
                          ["cards", LayoutGrid, "Tarjetas"],
                          ["pipeline", Columns3, "Tablero por etapas"],
                        ] as const
                      ).map(([id, Icon, label]) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={view === id}
                          aria-label={label}
                          title={label}
                          className={view === id ? "on" : ""}
                          onClick={() => setView(id)}
                        >
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                    <button type="button" className="fx-btn ghost" onClick={exportView} title="Exportar la vista actual">
                      <FileDown size={15} />
                      <span className="swx-hide-sm">Exportar</span>
                    </button>
                    {!isAdmin ? (
                      <button type="button" className="fx-btn primary" onClick={() => setRecordForm({})}>
                        <Plus size={15} />
                        Nuevo contacto
                      </button>
                    ) : null}
                  </div>
                }
              />
              <div className="swx-toolbar">
                <label className="swx-search">
                  <Search size={16} />
                  <input
                    ref={searchRef}
                    aria-label="Buscar en la cartera"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Empresa, RUT, contacto, comuna o necesidad"
                  />
                  {search ? (
                    <button type="button" onClick={() => setSearch("")} aria-label="Limpiar búsqueda">
                      ×
                    </button>
                  ) : (
                    <kbd>/</kbd>
                  )}
                </label>
                <label className="swx-select">
                  <span className="sw-sr-only">Filtrar etapa</span>
                  <select aria-label="Filtrar etapa" value={stage} onChange={(e) => setStage(e.target.value)}>
                    <option value="">Todas las etapas</option>
                    {Object.entries(stageLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="swx-select">
                  <ArrowUpDown size={14} />
                  <select aria-label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                    {sorts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="swx-chips scroll" role="group" aria-label="Segmentos inteligentes">
                {segments.map((s) => {
                  const count = s.id === "all" ? allRecords.length : segmentCount(s.id);
                  if (s.id !== "all" && !count && segment !== s.id) return null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={segment === s.id}
                      className={`${segment === s.id ? "on" : ""} seg-${s.id}`}
                      onClick={() => setSegment(s.id)}
                    >
                      {s.id === "focus" ? <Flame size={13} /> : null}
                      {s.label}
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
              {view === "list" && records.length ? (
                <div className="swx-table-wrap">
                  <table className="swx-table">
                    <caption className="sw-sr-only">Contactos, avance y próximo seguimiento</caption>
                    <thead>
                      <tr>
                        <th>Empresa y contacto</th>
                        <th>Etapa</th>
                        <th>Prioridad</th>
                        <th>Revisión</th>
                        {isAdmin ? <th>Responsable</th> : null}
                        <th>Próximo seguimiento</th>
                        <th>
                          <span className="sw-sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => {
                        const late = r.next_action_at && Date.parse(r.next_action_at) < now && isOpen(r);
                        return (
                          <tr key={r.id}>
                            <td>
                              <button className="swx-contact" onClick={() => setDetail(r.id)}>
                                <span className="swx-avatar">{initials(r.company_name)}</span>
                                <span>
                                  <strong>{r.company_name}</strong>
                                  <small>
                                    {r.contact_name}
                                    {r.rut ? ` · ${r.rut}` : ""}
                                  </small>
                                </span>
                              </button>
                            </td>
                            <td data-label="Etapa">
                              <span className={`swx-stage stage-${r.stage.toLowerCase()}`}>{stageLabels[r.stage]}</span>
                            </td>
                            <td data-label="Prioridad">
                              <PriorityBadge record={r} proposals={proposals} now={now} />
                            </td>
                            <td data-label="Revisión">
                              <span className={`sw-status ${r.review_status.toLowerCase()}`}>
                                {reviewLabels[r.review_status]}
                              </span>
                            </td>
                            {isAdmin ? <td data-label="Responsable">{name(r.owner_id)}</td> : null}
                            <td data-label="Próximo seguimiento" className={late ? "swx-late" : ""}>
                              {r.next_action_at ? moment(r.next_action_at) : "Sin programar"}
                            </td>
                            <td className="swx-row-actions">
                              <ContactActions record={r} compact onLog={setLogIntent} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : view === "pipeline" ? (
                <>
                  <p className="swx-hint">
                    <Sparkles size={14} />
                    Arrastra una tarjeta a otra etapa para registrar la gestión que justifica el cambio.
                  </p>
                  <div className="swx-kanban">
                    {stageOrder.map((key) => {
                      const column = records.filter((r) => r.stage === key);
                      const value = proposals
                        .filter((p) => column.some((r) => r.id === p.record_id) && !["DECLINED", "EXPIRED", "CANCELLED"].includes(p.status))
                        .reduce((t, p) => t + Number(p.net_amount || 0), 0);
                      return (
                        <section
                          key={key}
                          className={`swx-column stage-${key.toLowerCase()}${dropStage === key ? " drop" : ""}`}
                          onDragOver={(e) => {
                            if (!dragging) return;
                            e.preventDefault();
                            setDropStage(key);
                          }}
                          onDragLeave={() => setDropStage((s) => (s === key ? null : s))}
                          onDrop={(e) => {
                            e.preventDefault();
                            const r = allRecords.find((x) => x.id === dragging);
                            setDragging(null);
                            setDropStage(null);
                            if (r) startDrop(r, key);
                          }}
                        >
                          <header>
                            <h3>{stageLabels[key]}</h3>
                            <span>{column.length}</span>
                          </header>
                          {value ? <small className="swx-column-value">{compact(value)} en propuestas</small> : null}
                          <div className="swx-column-body">
                            {column.map((r) => (
                              <ContactCard
                                key={r.id}
                                record={r}
                                proposals={proposals}
                                now={now}
                                owner={isAdmin ? name(r.owner_id) : undefined}
                                onOpen={() => setDetail(r.id)}
                                onLog={setLogIntent}
                                draggable={r.stage !== "COMPLETED"}
                                onDragStart={() => setDragging(r.id)}
                                onDragEnd={() => {
                                  setDragging(null);
                                  setDropStage(null);
                                }}
                              />
                            ))}
                            {!column.length ? <p className="swx-column-empty">Sin gestiones</p> : null}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="swx-card-grid">
                  {records.map((r) => (
                    <ContactCard
                      key={r.id}
                      record={r}
                      proposals={proposals}
                      now={now}
                      owner={isAdmin ? name(r.owner_id) : undefined}
                      onOpen={() => setDetail(r.id)}
                      onLog={setLogIntent}
                    />
                  ))}
                </div>
              )}
              {!records.length ? (
                <Empty
                  title={search || stage || segment !== "all" ? "Sin coincidencias" : "No hay contactos registrados"}
                  text={
                    search || stage || segment !== "all"
                      ? "Ajusta la búsqueda, la etapa o el segmento."
                      : "Agrega un contacto, registra su necesidad y acuerda el siguiente paso."
                  }
                  action={
                    search || stage || segment !== "all" ? (
                      <button
                        type="button"
                        className="fx-btn ghost"
                        onClick={() => {
                          setSearch("");
                          setStage("");
                          setSegment("all");
                        }}
                      >
                        Limpiar filtros
                      </button>
                    ) : (
                      <button type="button" className="fx-btn primary" onClick={() => setRecordForm({})}>
                        <Plus size={15} />
                        Nuevo contacto
                      </button>
                    )
                  }
                />
              ) : null}
              {data.assignedClients.some((c) => !data.records.some((r) => r.client_id === c.id)) ? (
                <section className="swx-assigned">
                  <h3>Clientes asignados para seguimiento</h3>
                  <div>
                    {data.assignedClients
                      .filter((c) => !data.records.some((r) => r.client_id === c.id))
                      .map((c) => (
                        <article key={c.id}>
                          <span className="swx-avatar">{initials(c.legal_name)}</span>
                          <div>
                            <b>{c.legal_name}</b>
                            <small>{c.rut}</small>
                          </div>
                          <button className="fx-btn ghost" onClick={() => setRecordForm({ client: c })}>
                            Incorporar seguimiento
                          </button>
                        </article>
                      ))}
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}

          {tab === "proposals" ? (
            <ProposalsView
              data={data}
              isAdmin={isAdmin}
              busy={action.busy}
              now={now}
              filter={proposalFilter}
              setFilter={setProposalFilter}
              search={proposalSearch}
              setSearch={setProposalSearch}
              name={name}
              onNew={() => setProposalForm({})}
              onDownload={downloadProposal}
              onReview={quoteReview}
              onTarget={setReviewTarget}
              onCorrect={(p) => setProposalForm({ initial: p })}
              onCopy={(text) =>
                void action.run(() => navigator.clipboard.writeText(text), "Mensaje copiado. Pégalo en tu correo o chat.")
              }
            />
          ) : null}

          {tab === "plans" && catalog.data ? (
            <>
              <section className="swx-panel swx-pitch">
                <div>
                  <span className="swx-eyebrow">INFORMACIÓN PARA TUS CLIENTES</span>
                  <h2>Presenta Zyteron con claridad</h2>
                  <p>{catalog.data.company.description}</p>
                </div>
                <blockquote>{catalog.data.company.presentation}</blockquote>
                <div className="swx-inline">
                  <button
                    type="button"
                    className="fx-btn primary"
                    onClick={() =>
                      void action.run(async () => {
                        await navigator.clipboard.writeText(catalog.data!.company.presentation);
                        setCopied(true);
                      }, "Presentación copiada.")
                    }
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}Copiar presentación
                  </button>
                  <a
                    className="fx-btn ghost"
                    href={whatsappShare(
                      `${catalog.data.company.presentation}\n\n${catalog.data.company.website}`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={15} />
                    Compartir por WhatsApp
                  </a>
                </div>
                <div className="swx-links">
                  {catalog.data.company.links.map((l) => (
                    <a key={l.url} target="_blank" rel="noreferrer" href={l.url}>
                      {l.title}
                      <ArrowRight size={15} />
                    </a>
                  ))}
                  <a href={`mailto:${catalog.data.company.email}`}>{catalog.data.company.email}</a>
                </div>
                <details className="swx-discovery">
                  <summary>Preguntas para entender la necesidad</summary>
                  <ol>
                    {catalog.data.company.discovery.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ol>
                </details>
              </section>
              <section className="swx-panel">
                <PanelTitle eyebrow="CATÁLOGO COMERCIAL" title="Planes y servicios de Zyteron" />
                <p className="sw-help">{catalog.data.pricingNote}</p>
                <PlanLibrary
                  plans={catalog.data.plans}
                  onChoose={(plan) => setProposalForm({ plan })}
                  onCopy={(text) => void action.run(() => navigator.clipboard.writeText(text), "Ficha del plan copiada.")}
                />
              </section>
            </>
          ) : tab === "plans" ? (
            <section className="swx-panel">
              <Empty title="Cargando catálogo" text="Estamos obteniendo los planes vigentes." />
            </section>
          ) : null}

          {tab === "reports" ? (
            <section className="swx-panel">
              <PanelTitle
                eyebrow="SEGUIMIENTO E INFORMES"
                title={isAdmin ? "Resultados por responsable" : "Tu trabajo registrado"}
                aside={
                  <div className="swx-inline">
                    <button
                      className="fx-btn ghost"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(() =>
                          workApi.download(role, `/export${query ? `?${query}` : ""}`, "gestion-comercial.csv"),
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
                }
              />
              <div className="swx-home-grid even">
                <div className="swx-subpanel">
                  <h3>Contactos nuevos por semana</h3>
                  <Columns points={contactWeeks} label="Contactos registrados por semana (8 semanas)" height={110} />
                </div>
                <div className="swx-subpanel">
                  <h3>Propuestas preparadas por semana</h3>
                  <Columns points={proposalWeeks} label="Propuestas preparadas por semana (8 semanas)" height={110} />
                </div>
              </div>
              {isAdmin ? (
                <>
                  <div className="swx-table-wrap">
                    <table className="swx-table plain">
                      <thead>
                        <tr>
                          <th>Responsable</th>
                          <th>Contactos</th>
                          <th>Clientes</th>
                          <th>Propuestas</th>
                          <th>Pipeline neto</th>
                          <th>Ventas validadas</th>
                          <th>Cierre</th>
                          <th>Comisión ganada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerRows(data, owner).map((o) => (
                          <tr key={o.id}>
                            <td>
                              <span className="swx-contact static">
                                <span className="swx-avatar">{initials(o.name)}</span>
                                <strong>{o.name}</strong>
                              </span>
                            </td>
                            <td data-label="Contactos">{o.contacts}</td>
                            <td data-label="Clientes">{o.clients}</td>
                            <td data-label="Propuestas">{o.proposals}</td>
                            <td data-label="Pipeline neto">{money(o.pipeline)}</td>
                            <td data-label="Ventas validadas">{o.sales}</td>
                            <td data-label="Cierre">{pct(o.rate)}</td>
                            <td data-label="Comisión ganada">{money(o.commission)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="swx-subpanel">
                    <h3>Pipeline neto abierto por responsable</h3>
                    <HBars
                      label="Pipeline neto abierto por responsable"
                      format={compact}
                      rows={ownerRows(data, owner)
                        .sort((a, b) => b.pipeline - a.pipeline)
                        .map((o) => ({ key: o.id, label: o.name, value: o.pipeline, note: plural(o.proposals, "propuesta", "propuestas") }))}
                    />
                  </div>
                </>
              ) : (
                <p className="sw-help">
                  Resume contactos, respuestas, oportunidades, bloqueos y próximos pasos. Puedes generar un
                  borrador automático con tus datos del período y revisarlo antes de enviarlo a administración.
                </p>
              )}
              <div className="swx-report-list">
                {data.reports.map((r) => (
                  <button key={r.id} onClick={() => setReadReport(r)}>
                    <span className="swx-report-icon">
                      <FileText size={18} />
                    </span>
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
            <CommissionsView
              data={data}
              isAdmin={isAdmin}
              months={commissionMonths}
              receipts={commissionReceipts}
              name={name}
              onProfit={setProfitTarget}
            />
          ) : null}
          <footer className="swx-footnote">
            Actualizado {moment(data.asOf)} ·{" "}
            {isAdmin ? "Vista de administración" : "Sólo tu cartera y tu gestión comercial"} ·{" "}
            <button type="button" onClick={() => setPalette(true)}>
              <Command size={11} />K para buscar
            </button>
          </footer>
        </div>
      )}

      <nav className="swx-dock" aria-label="Secciones (móvil)">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            className={tab === t.id ? "active" : ""}
            onClick={() => {
              go(t.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <t.icon size={19} />
            <span>{isAdmin && t.id === "home" ? "Resumen" : t.short}</span>
            {t.id === "proposals" && data?.summary.pendingProposals ? <i>{data.summary.pendingProposals}</i> : null}
          </button>
        ))}
      </nav>
      <button type="button" className="swx-fab" aria-label="Nuevo contacto comercial" onClick={() => setRecordForm({})}>
        <Plus size={22} />
      </button>

      <CommandPalette open={palette} items={paletteItems} onClose={() => setPalette(false)} />
      {logIntent ? (
        <QuickLog
          key={logIntent.record.id + (logIntent.stage ?? "") + (logIntent.kind ?? "")}
          intent={logIntent}
          proposals={proposals}
          onClose={() => setLogIntent(null)}
          onSaved={() => {
            setLogIntent(null);
            action.setNotice("Gestión registrada.");
            reload();
          }}
        />
      ) : null}
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
        <ReportForm
          records={data.records}
          proposals={data.proposals}
          onClose={() => setReportForm(false)}
          onSaved={saved}
        />
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

function inSegment(
  r: WorkRecord,
  id: Segment,
  scored: Map<string, ReturnType<typeof priority>>,
  now: number,
) {
  switch (id) {
    case "all":
      return true;
    case "focus":
      return scored.get(r.id)?.level === "high";
    case "overdue":
      return isOpen(r) && !!r.next_action_at && Date.parse(r.next_action_at) < now;
    case "today":
      return (
        isOpen(r) &&
        !!r.next_action_at &&
        Date.parse(r.next_action_at) >= now &&
        dateKey(r.next_action_at) === dateKey(now)
      );
    case "unscheduled":
      return isOpen(r) && !r.next_action_at;
    case "cooling":
      return isCooling(r, now);
    case "pending":
      return r.review_status === "PENDING";
    case "rejected":
      return r.review_status === "REJECTED";
  }
}

function ownerRows(data: WorkBoard, owner: string) {
  return data.owners
    .filter(
      (o) =>
        !owner ||
        (owner === "administration"
          ? data.records.some((r) => r.owner_type === "ADMIN" && r.owner_id === o.id)
          : o.id === owner),
    )
    .map((o) => {
      const own = data.records.filter((r) => r.owner_id === o.id);
      const ownProposals = data.proposals.filter((p) => p.owner_id === o.id);
      return {
        id: o.id,
        name: o.name,
        contacts: own.length,
        clients: new Set(
          own
            .filter((r) => r.client_id && r.client_created && r.purchase_confirmed && r.review_status === "APPROVED")
            .map((r) => r.client_id),
        ).size,
        proposals: ownProposals.length,
        pipeline: pipeline(ownProposals).value,
        sales: own.filter((r) => r.stage === "COMPLETED" && r.purchase_confirmed).length,
        rate: winRate(own),
        commission: data.earnings
          .filter((e) => e.owner_id === o.id && e.status === "EARNED")
          .reduce((t, e) => t + e.commission_amount, 0),
      };
    });
}

function Kpi({
  title,
  value,
  hint,
  icon,
  children,
  aside,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  tone?: "warn" | "bad";
  onClick?: () => void;
}) {
  const body = (
    <>
      <header>
        <span className="swx-kpi-icon">{icon}</span>
        <small>{title}</small>
      </header>
      <div className="swx-kpi-value">
        <strong>{value}</strong>
        {aside}
      </div>
      <p>{hint}</p>
      {children}
    </>
  );
  return (
    <article className={`swx-kpi${tone ? ` ${tone}` : ""}${onClick ? " link" : ""}`}>
      {onClick ? (
        <button type="button" onClick={onClick} aria-label={`${title}: ${value}. ${hint}`}>
          {body}
        </button>
      ) : (
        <div>{body}</div>
      )}
    </article>
  );
}

function PanelTitle({ eyebrow, title, aside }: { eyebrow?: string; title: string; aside?: ReactNode }) {
  return (
    <div className="swx-title">
      <div>
        {eyebrow ? <span className="swx-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      {aside ? <div className="swx-title-aside">{aside}</div> : null}
    </div>
  );
}

function Empty({
  title,
  text,
  icon,
  action,
}: {
  title: string;
  text: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="swx-empty">
      <span>{icon ?? <Users size={22} />}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function ContactCard({
  record: r,
  proposals,
  now,
  owner,
  onOpen,
  onLog,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  record: WorkRecord;
  proposals: WorkProposal[];
  now: number;
  owner?: string;
  onOpen: () => void;
  onLog: (intent: LogIntent) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const overdue = r.next_action_at && Date.parse(r.next_action_at) < now && isOpen(r);
  const open = proposals.filter((p) => p.record_id === r.id && !["DECLINED", "EXPIRED", "CANCELLED"].includes(p.status));
  return (
    <article
      className={`swx-card${draggable ? " draggable" : ""}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", r.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
    >
      <button type="button" className="swx-card-open" onClick={onOpen}>
        <header>
          <span className="swx-avatar">{initials(r.company_name)}</span>
          <span>
            <h3>{r.company_name}</h3>
            <small>{r.contact_name}</small>
          </span>
        </header>
        <p>{r.interest}</p>
        <div className="swx-card-meta">
          <span className={`swx-stage stage-${r.stage.toLowerCase()}`}>{stageLabels[r.stage]}</span>
          <PriorityBadge record={r} proposals={proposals} now={now} />
          {r.review_status !== "APPROVED" ? (
            <span className={`sw-status ${r.review_status.toLowerCase()}`}>{reviewLabels[r.review_status]}</span>
          ) : null}
        </div>
        {open.length ? (
          <small className="swx-card-money">
            {open.length} propuesta{open.length > 1 ? "s" : ""} ·{" "}
            {compact(open.reduce((t, p) => t + Number(p.net_amount || 0), 0))} neto
          </small>
        ) : null}
        <small className={`swx-card-next${overdue ? " late" : ""}`}>
          <CalendarClock size={13} />
          {r.next_action_at ? moment(r.next_action_at) : isOpen(r) ? "Programa el próximo contacto" : "Gestión cerrada"}
        </small>
        {owner ? <small className="swx-card-owner">{owner}</small> : null}
      </button>
      <ContactActions record={r} compact onLog={onLog} />
    </article>
  );
}

function ProposalsView({
  data,
  isAdmin,
  busy,
  now,
  filter,
  setFilter,
  search,
  setSearch,
  name,
  onNew,
  onDownload,
  onReview,
  onTarget,
  onCorrect,
  onCopy,
}: {
  data: WorkBoard;
  isAdmin: boolean;
  busy: boolean;
  now: number;
  filter: ProposalGroup | "all";
  setFilter: (v: ProposalGroup | "all") => void;
  search: string;
  setSearch: (v: string) => void;
  name: (id: string) => string;
  onNew: () => void;
  onDownload: (p: WorkProposal) => void;
  onReview: (p: WorkProposal) => void;
  onTarget: (t: ReviewTarget) => void;
  onCorrect: (p: WorkProposal) => void;
  onCopy: (text: string) => void;
}) {
  const groupsOrder: ProposalGroup[] = ["review", "share", "negotiation", "won", "fix", "closed"];
  const totals = groupsOrder.map((g) => {
    const list = data.proposals.filter((p) => proposalGroup(p.status) === g);
    return { g, count: list.length, value: list.reduce((t, p) => t + Number(p.net_amount || 0), 0) };
  });
  const list = data.proposals
    .filter(
      (p) =>
        (filter === "all" || proposalGroup(p.status) === filter) &&
        matches(search, p.quote_number, p.company_name, p.contact_name, name(p.owner_id)),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pipe = pipeline(data.proposals);
  return (
    <section className="swx-panel">
      <PanelTitle
        eyebrow="PROPUESTAS Y PLANES"
        title={isAdmin ? "Autoriza lo que se comparte" : "De la necesidad a la propuesta"}
        aside={
          <button className="fx-btn primary" disabled={!data.records.length} onClick={onNew}>
            <FilePlus2 size={16} />
            Preparar propuesta
          </button>
        }
      />
      <div className="swx-pipe-strip" role="group" aria-label="Propuestas por estado">
        <button type="button" className={filter === "all" ? "on" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          <small>Todas</small>
          <strong>{data.proposals.length}</strong>
          <span>{compact(pipe.value)} abiertas · {compact(pipe.weighted)} ponderado</span>
        </button>
        {totals.map((t) =>
          t.count || filter === t.g ? (
            <button
              key={t.g}
              type="button"
              className={`${filter === t.g ? "on" : ""} g-${t.g}`}
              aria-pressed={filter === t.g}
              onClick={() => setFilter(t.g)}
            >
              <small>{proposalGroupLabels[t.g]}</small>
              <strong>{t.count}</strong>
              <span>{compact(t.value)} neto</span>
            </button>
          ) : null,
        )}
      </div>
      <div className="swx-toolbar">
        <label className="swx-search">
          <Search size={16} />
          <input
            aria-label="Buscar propuestas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Número, empresa, contacto o responsable"
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} aria-label="Limpiar búsqueda">
              ×
            </button>
          ) : null}
        </label>
        <span className="swx-hint inline" title="Supuestos indicativos del pronóstico; no son cobros ni ventas garantizadas">
          <Gauge size={14} />
          Supuestos: enviada {Math.round(proposalProbability.SENT * 100)}% · negociación{" "}
          {Math.round(proposalProbability.NEGOTIATING * 100)}% · autorizada {Math.round(proposalProbability.APPROVED * 100)}%
        </span>
      </div>
      <div className="swx-proposal-grid">
        {list.map((p) => {
          const record = data.records.find((r) => r.id === p.record_id);
          const left = p.valid_until ? daysUntil(p.valid_until, now) : null;
          const shareable = ["APPROVED", "READY_TO_SEND", "SENT", "NEGOTIATING"].includes(p.status);
          const message = proposalMessage(p, money);
          const wa = shareable ? whatsappLink(record?.phone, message) : null;
          const group = proposalGroup(p.status);
          return (
            <article className={`swx-proposal g-${group}`} key={p.quote_id}>
              <header>
                <span
                  className={`sw-status ${p.status === "PENDING_APPROVAL" ? "pending" : p.status === "REJECTED" ? "rejected" : "approved"}`}
                >
                  {proposalLabels[p.status] ?? p.status}
                </span>
                <small>{p.billing_type === "SUBSCRIPTION" ? "Plan mensual" : "Pago único"}</small>
              </header>
              <div className="swx-proposal-head">
                <h3>{p.quote_number}</h3>
                <p>
                  {p.company_name}
                  {isAdmin ? <small> · {name(p.owner_id)}</small> : null}
                </p>
              </div>
              <strong className="swx-amount">
                {money(p.total_amount)}
                {p.billing_type === "SUBSCRIPTION" ? <small> / mes</small> : null}
              </strong>
              <div className="swx-proposal-meta">
                <span>{plural(p.items.length, "servicio", "servicios")}</span>
                <span>Neto {money(p.net_amount)}</span>
                {left !== null && group !== "won" && group !== "closed" ? (
                  <span className={left < 0 ? "expired" : left <= 5 ? "soon" : ""}>
                    {left < 0 ? `Venció el ${day(p.valid_until)}` : left === 0 ? "Vence hoy" : `Vigente ${left} días · ${day(p.valid_until)}`}
                  </span>
                ) : (
                  <span>Vigente hasta {day(p.valid_until)}</span>
                )}
              </div>
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
              {shareable ? (
                <div className="swx-share">
                  {wa ? (
                    <a className="swx-act wa" href={wa} target="_blank" rel="noreferrer">
                      <MessageCircle size={15} />
                      <span>Enviar por WhatsApp</span>
                    </a>
                  ) : null}
                  <button type="button" className="swx-act" onClick={() => onCopy(message)}>
                    <Copy size={15} />
                    <span>Copiar mensaje</span>
                  </button>
                </div>
              ) : null}
              <div className="swx-proposal-actions">
                <button className="fx-btn ghost" disabled={busy} onClick={() => onDownload(p)}>
                  <Download size={14} />
                  {["DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(p.status) ? "Borrador PDF" : "PDF aprobado"}
                </button>
                {isAdmin && p.status === "PENDING_APPROVAL" ? (
                  <button className="fx-btn primary" onClick={() => onReview(p)}>
                    Revisar autorización
                  </button>
                ) : null}
                {["APPROVED", "READY_TO_SEND"].includes(p.status) ? (
                  <button
                    className="fx-btn primary"
                    onClick={() =>
                      onTarget({
                        path: `/proposals/${p.quote_id}/shared`,
                        title: "Registrar propuesta compartida",
                        confirmAcceptance: true,
                      })
                    }
                  >
                    <Send size={14} />
                    Registrar entrega al cliente
                  </button>
                ) : null}
                {isAdmin && ["SENT", "NEGOTIATING"].includes(p.status) ? (
                  <button
                    className="fx-btn primary"
                    onClick={() =>
                      onTarget({
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
                  <button className="fx-btn ghost" onClick={() => onCorrect(p)}>
                    Corregir y volver a presentar
                  </button>
                ) : null}
                {isAdmin &&
                data.receipts?.some((receipt) => receipt.quote_id === p.quote_id) &&
                record?.purchase_confirmed !== true ? (
                  <button
                    className="fx-btn primary"
                    onClick={() =>
                      onTarget({
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
                  <Link className="fx-btn ghost" href={`/finance/quote-payments?quote=${p.quote_id}`}>
                    Revisar cobro en Finanzas
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {!data.proposals.length ? (
        <Empty
          icon={<FileText size={22} />}
          title="Prepara tu primera propuesta"
          text="Registra al contacto y elige un plan del catálogo. Administración revisará la propuesta antes de que la compartas."
        />
      ) : !list.length ? (
        <Empty title="Sin coincidencias" text="Ajusta la búsqueda o el estado seleccionado." />
      ) : null}
    </section>
  );
}

function CommissionsView({
  data,
  isAdmin,
  months,
  receipts,
  name,
  onProfit,
}: {
  data: WorkBoard;
  isAdmin: boolean;
  months: Array<{ label: string; value: number }>;
  receipts: Receipt[];
  name: (id: string) => string;
  onProfit: (t: { record: WorkRecord; receipt: Receipt }) => void;
}) {
  const [revenue, setRevenue] = useState(""),
    [cost, setCost] = useState("");
  const earned = data.earnings.filter((e) => e.status === "EARNED");
  const hold = data.earnings.filter((e) => e.status !== "EARNED");
  const sum = (list: typeof earned) => list.reduce((t, e) => t + Number(e.commission_amount || 0), 0);
  const pending = receipts.filter((v) => !data.earnings.some((e) => e.receipt_key === v.receipt_key));
  const simulationReady = revenue.trim() !== "" && cost.trim() !== "" &&
    Number.isFinite(Number(revenue)) && Number.isFinite(Number(cost)) &&
    Number(revenue) >= 0 && Number(cost) >= 0;
  const simProfit = simulationReady ? Math.max(0, Number(revenue) - Number(cost)) : null;
  return (
    <>
      <section className="swx-panel">
        <PanelTitle eyebrow="COMISIONES · 15%" title={`${money(data.summary.earnedCommission)} ganados`} aside={<Wallet size={26} />} />
        <div className="swx-stat-row">
          <div>
            <small>Comisión validada</small>
            <strong>{money(sum(earned))}</strong>
            <span>{plural(earned.length, "validación", "validaciones")}</span>
          </div>
          <div>
            <small>En revisión del cobro</small>
            <strong>{money(sum(hold))}</strong>
            <span>{plural(hold.length, "registro", "registros")}</span>
          </div>
          <div>
            <small>{isAdmin ? "Cobros por validar" : "Ventas validadas"}</small>
            <strong>{isAdmin ? pending.length : data.summary.completed}</strong>
            <span>{isAdmin ? "Esperan validación de utilidad" : "Con compra confirmada"}</span>
          </div>
        </div>
        <div className="swx-home-grid even">
          <div className="swx-subpanel">
            <h3>Comisión ganada por mes</h3>
            <Columns points={months} format={compact} label="Comisión ganada por mes (6 meses)" height={120} />
          </div>
          <div className="swx-subpanel swx-sim">
            <h3>
              <Calculator size={16} /> Simulador de comisión
            </h3>
            <div className="sw-form-grid">
              <Field label="Ingreso neto cobrado (sin IVA)">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="numeric"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  placeholder="1.000.000"
                />
              </Field>
              <Field label="Costo neto directo">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="numeric"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="400.000"
                />
              </Field>
            </div>
            <dl className="swx-sim-result">
              <div>
                <dt>Utilidad</dt>
                <dd>{simProfit === null ? "—" : money(simProfit)}</dd>
              </div>
              <div>
                <dt>Comisión 15%</dt>
                <dd>{simProfit === null ? "—" : money(Math.round(simProfit * 0.15))}</dd>
              </div>
            </dl>
            <small>Ingresa ingreso y costo para simular. No es una comisión ganada ni un compromiso de pago.</small>
          </div>
        </div>
        <div className="swx-rule">
          <TrendingUp size={21} />
          <div>
            <b>15% de la utilidad de cada cobro validado</b>
            <p>
              Administración confirma el pago y valida los costos. Las ventas sin cobro confirmado o sin costos
              revisados siguen pendientes. La comisión calculada no equivale a un pago realizado al ejecutivo.
            </p>
          </div>
        </div>
      </section>
      {isAdmin && pending.length ? (
        <section className="swx-panel">
          <PanelTitle eyebrow="POR VALIDAR" title="Cobros listos para validar utilidad" />
          <div className="swx-receipts">
            {pending.map((v) => {
              const p = data.proposals.find((p) => p.quote_id === v.quote_id),
                r = data.records.find((r) => r.id === p?.record_id);
              return (
                <div key={v.source_kind + v.source_id}>
                  <div>
                    <b>
                      {p?.company_name} · {p?.quote_number}
                    </b>
                    <small>
                      Cobro {v.period_label} · Neto {money(v.net_revenue)} · {day(v.collected_at)}
                    </small>
                  </div>
                  <button className="fx-btn primary" disabled={!r} onClick={() => r && onProfit({ record: r, receipt: v })}>
                    Validar utilidad y comisión
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <section className="swx-panel">
        <PanelTitle eyebrow="DETALLE" title="Comisiones registradas" />
        {data.earnings.length ? (
          <div className="swx-table-wrap">
            <table className="swx-table plain">
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
                    <td>{data.proposals.find((p) => p.quote_id === e.quote_id)?.quote_number ?? "Propuesta"}</td>
                    {isAdmin ? <td data-label="Responsable">{name(e.owner_id)}</td> : null}
                    <td data-label="Validación">{day(e.approved_at)}</td>
                    <td data-label="Estado">
                      <span className={`sw-status ${e.status === "EARNED" ? "approved" : "pending"}`}>
                        {e.status === "EARNED" ? "Comisión validada" : "En revisión del cobro"}
                      </span>
                    </td>
                    <td data-label="Comisión">
                      <b>{money(e.commission_amount)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={<Wallet size={22} />}
            title="Tus comisiones aparecerán al validar las ventas cobradas"
            text="El porcentaje está fijado en 15%. No se estiman ganancias con costos desconocidos."
          />
        )}
        {isAdmin ? (
          <p className="sw-help">
            Las cuotas mensuales se revisan por cada cobro. Los importes se calculan sin IVA y no se duplica un cobro
            registrado también como factura.
          </p>
        ) : null}
      </section>
    </>
  );
}

function PlanLibrary({
  plans,
  onChoose,
  onCopy,
}: {
  plans: PublicPlan[];
  onChoose: (plan: PublicPlan) => void;
  onCopy: (text: string) => void;
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
  const categories = [...new Set(plans.map((p) => p.category))];
  const shown = plans.filter(
    (p) => (!category || p.category === category) && matches(search, p.name, p.description, ...p.features),
  );
  return (
    <>
      <div className="swx-toolbar">
        <label className="swx-search">
          <Search size={16} />
          <input
            aria-label="Buscar planes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plan, servicio o característica"
          />
        </label>
      </div>
      <div className="swx-chips scroll" role="group" aria-label="Categoría de planes">
        <button type="button" aria-pressed={!category} className={!category ? "on" : ""} onClick={() => setCategory("")}>
          Todos <span>{plans.length}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            className={category === c ? "on" : ""}
            onClick={() => setCategory(c)}
          >
            {names[c] ?? c}
            <span>{plans.filter((p) => p.category === c).length}</span>
          </button>
        ))}
      </div>
      <div className="swx-plan-grid">
        {shown.map((p) => (
          <article className="swx-plan" key={p.id}>
            <span className="swx-eyebrow">{names[p.category] ?? p.category}</span>
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
            <footer>
              <button
                type="button"
                className="fx-btn ghost"
                onClick={() =>
                  onCopy(
                    `${p.name} · Zyteron\nDesde ${money(p.amount)} + IVA${p.billingType === "SUBSCRIPTION" ? " mensual" : ""}\n${p.description}${p.features.length ? `\n\nIncluye:\n${p.features.map((f) => `• ${f}`).join("\n")}` : ""}`,
                  )
                }
                aria-label={`Copiar ficha de ${p.name}`}
              >
                <Copy size={14} />
              </button>
              <button className="fx-btn primary" onClick={() => onChoose(p)}>
                Usar en propuesta
                <ArrowRight size={15} />
              </button>
            </footer>
          </article>
        ))}
      </div>
      {!shown.length ? <Empty title="Sin planes que coincidan" text="Prueba con otra búsqueda o categoría." /> : null}
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
          <fieldset className="swx-segment">
            <legend>Resultado de revisión</legend>
            {[
              ["APPROVED", "Aprobar"],
              ["REJECTED", "Solicitar corrección"],
            ].map(([id, label]) => (
              <label key={id} className={decision === id ? `on ${id === "REJECTED" ? "bad" : ""}` : ""}>
                <input type="radio" name="decision" value={id} checked={decision === id} onChange={() => setDecision(id)} />
                {label}
              </label>
            ))}
          </fieldset>
        ) : null}
        {target.record ? (
          <div className="sw-note">
            <b>{target.record.company_name}</b>
            <p>RUT: {target.record.rut ?? "Pendiente"}</p>
            <p>{target.record.interest}</p>
          </div>
        ) : null}
        <Field label={target.confirmAcceptance ? "Detalle y respaldo" : "Observación para el ejecutivo"}>
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
              action.busy || ((decision === "REJECTED" || target.confirmAcceptance || target.complete) && !reason.trim())
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
  proposals,
  onClose,
  onSaved,
}: {
  records: WorkRecord[];
  proposals: WorkProposal[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { role } = useAccess(),
    action = useAction(),
    [requestId] = useState(() => crypto.randomUUID()),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [record, setRecord] = useState(""),
    [from, setFrom] = useState(() => {
      const d = new Date(`${todayIso()}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      return d.toISOString().slice(0, 10);
    }),
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
  const draft = () => {
    if (body.trim() && !window.confirm("¿Reemplazar el texto actual por un borrador generado con tus datos?")) return;
    const scopeRecords = record ? records.filter((r) => r.id === record) : records;
    const scopeProposals = record ? proposals.filter((p) => p.record_id === record) : proposals;
    setBody(reportDraft({ records: scopeRecords, proposals: scopeProposals, from, to, labels: stageLabels, money }));
    if (!title.trim())
      setTitle(
        `Informe de gestión ${from.slice(8, 10)}-${from.slice(5, 7)} al ${to.slice(8, 10)}-${to.slice(5, 7)}${record ? ` · ${scopeRecords[0]?.company_name ?? ""}` : ""}`,
      );
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
        <div className="swx-draft">
          <Sparkles size={16} />
          <div>
            <b>Borrador automático</b>
            <small>Resume contactos, propuestas, etapas y seguimientos reales del período. Revísalo y complétalo antes de enviar.</small>
          </div>
          <button type="button" className="fx-btn ghost" disabled={!from || !to} onClick={draft}>
            Generar borrador
          </button>
        </div>
        <Field label="Resultados, necesidades y próximos pasos">
          <textarea
            required
            maxLength={10000}
            rows={12}
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
          <button type="submit" className="fx-btn primary" disabled={action.busy || !title.trim() || !body.trim()}>
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
          Esta validación genera el cálculo de la comisión. Su liquidación y pago son posteriores. Los costos quedan
          reservados a administración.
        </p>
        <Feedback error={action.error} />
        <div className="sw-form-footer">
          <button type="button" className="fx-btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="fx-btn primary"
            disabled={action.busy || cost === "" || !note.trim() || !Number.isFinite(Number(cost)) || Number(cost) < 0}
          >
            {action.busy ? "Validando…" : "Confirmar utilidad y comisión"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

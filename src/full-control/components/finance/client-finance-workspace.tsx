"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileText,
  Landmark,
  LayoutDashboard,
  ListFilter,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type { ClientFinanceSummary } from "@zyteron/contracts";
import { useAccess } from "@control/components/access-context";
import { commercialApi } from "@control/lib/commercial-api";
import { financeApi } from "@control/lib/finance-api";
import { canFinance, day, label, money } from "@control/lib/finance-format";
import { formatDate, formatDateTime, formatTime, todayInChile } from "@control/lib/date-time";
import {
  clientPaymentRows,
  financeCivilDay,
  financeCsv,
  financeStatusLabel,
  isLiveQuote,
  isOpenReceivable,
  matchesFinanceSearch,
  nextReceivables,
  paymentMethodLabel,
  receivableState,
  receivableCaption,
  selectClientPayments,
  selectClientQuotes,
  type ClientQuote,
  type ClientReceivable,
  type FinanceSection,
  type PaymentRegisterRow,
  type PortalFinance,
} from "@control/lib/client-finance-model";
import { ClientFinancePanel as PortalPaymentForm } from "@/components/admin/client-finance-panel";
import { QuoteEditor } from "@control/components/commercial/quote-editor";
import { WebsiteQuoteBillingButton } from "@control/components/commercial/quote-billing";
import {
  Drawer,
  DateInput,
  Empty,
  Feedback,
  KeyValue,
  LoadError,
  Loading,
  Pill,
  ReasonDialog,
  Register,
  useAction,
  useLoad,
  useQueryParams,
} from "./fx-ui";
import { InvoiceDetail, PaymentDetail, RecordPayment } from "./views-revenue";
import { QuotePaymentPanel } from "./quote-payments";
import { ReceivableDueButton } from "./receivable-due-button";
import s from "./client-finance.module.css";

const sectionLabels: Record<FinanceSection, string> = {
  overview: "Resumen",
  quotes: "Cotizaciones",
  receivables: "Cuentas por cobrar",
  payments: "Pagos",
  invoices: "Documentos",
};
const sourceName = (source: string) =>
  source === "commercial" ? "Cuenta comercial" : "Documentos contables";
const pageSize = 8;

function Badge({ value, text }: { value: string; text?: string }) {
  return <Pill value={value} text={text ?? financeStatusLabel(value)} />;
}
function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={s.panel}>
      <header className={s.panelHeader}>
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
function Pager({
  page,
  count,
  setPage,
}: {
  page: number;
  count: number;
  setPage: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <footer className={s.pager}>
      <span>
        {count
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} de ${count} registros`
          : "Sin resultados"}
      </span>
      <div>
        <button aria-label="Página anterior" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          aria-label="Página siguiente"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </footer>
  );
}
function downloadRegister(name: string, headers: string[], rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob([financeCsv(headers, rows)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name}-${todayInChile()}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ClientFinancePanel({ clientId }: { clientId: string }) {
  const { role } = useAccess();
  const allowed = canFinance(role, "invoice.view"),
    canManage = canFinance(role, "quote_payment.manage"),
    canRecord = canFinance(role, "payment.record"),
    canExport = canFinance(role, "report.finance.export");
  const [section, setSection] = useState<FinanceSection>("overview");
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [frequency, setFrequency] = useState("ALL"),
    [quoteStatus, setQuoteStatus] = useState("ALL"),
    [sort, setSort] = useState("recent"),
    [showArchived, setShowArchived] = useState(false);
  const [receivableFilter, setReceivableFilter] = useState("OPEN"),
    [paymentSource, setPaymentSource] = useState("ALL"),
    [paymentStatus, setPaymentStatus] = useState("ALL"),
    [invoiceStatus, setInvoiceStatus] = useState("ALL"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [accountView, setAccountView] = useState("commercial"),
    [updatedAt, setUpdatedAt] = useState("");
  const [quoteId, setQuoteId] = useState<string | null>(null),
    [billingQuoteId, setBillingQuoteId] = useState<string | null>(null),
    [schedule, setSchedule] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [archive, setArchive] = useState<ClientQuote | null>(null);
  const [payment, setPayment] = useState<PaymentRegisterRow | null>(null),
    [voidPayment, setVoidPayment] = useState<PaymentRegisterRow | null>(null),
    [invoice, setInvoice] = useState<string | null>(null);
  const [record, setRecord] = useState<"commercial" | "accounting" | null>(null),
    [recordReceivable, setRecordReceivable] = useState("");
  const [recordRequested, setRecordRequested] = useState(false);
  const [receivableArchive, setReceivableArchive] = useState<ClientReceivable | null>(null),
    [restoreReceivable, setRestoreReceivable] = useState(false),
    [stopRenewal, setStopRenewal] = useState(false);
  const summary = useLoad(
    () =>
      allowed
        ? financeApi.get<ClientFinanceSummary>(role, `/clients/${clientId}/summary`)
        : Promise.resolve(null),
    [role, clientId, allowed],
  );
  const quotes = useLoad(
    () =>
      allowed
        ? (commercialApi.allQuotes(
            role,
            `&clientId=${encodeURIComponent(clientId)}&includeArchived=true`,
          ) as Promise<ClientQuote[]>)
        : Promise.resolve([]),
    [role, clientId, allowed],
  );
  const portal = useLoad(async () => {
    if (!allowed) return null;
    const r = await fetch(`/api/portal/admin/clients/${clientId}/finance`, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "No fue posible consultar la cuenta.");
    return d as PortalFinance;
  }, [clientId, allowed]);
  const refresh = useCallback(async () => {
    await Promise.all([summary.reload(), quotes.reload(), portal.reload()]);
    setUpdatedAt(new Date().toISOString());
  }, [summary.reload, quotes.reload, portal.reload]);
  const action = useAction(refresh);
  useEffect(() => {
    if (!portal.loading && !summary.loading) setUpdatedAt(new Date().toISOString());
  }, [portal.loading, summary.loading]);
  const hadPending = useRef(false);
  useEffect(() => {
    if (!quotes.data?.some((q) => q.archivePending)) {
      if (hadPending.current) action.setNotice("Eliminación completada. Historial conservado.");
      hadPending.current = false;
      return;
    }
    hadPending.current = true;
    const timer = setInterval(() => void quotes.reload(), 8000);
    return () => clearInterval(timer);
  }, [quotes.data, quotes.reload]);
  useQueryParams((p) => {
    if (p.get("recordPayment") === "1") {
      setSection("payments");
      setRecordRequested(true);
    }
    const tab = p.get("financeTab") as FinanceSection;
    if (tab && Object.hasOwn(sectionLabels, tab)) setSection(tab);
  });
  useEffect(
    () => setPage(1),
    [
      section,
      query,
      frequency,
      quoteStatus,
      sort,
      showArchived,
      receivableFilter,
      paymentSource,
      paymentStatus,
      invoiceStatus,
      from,
      to,
    ],
  );
  const account = portal.data;
  const commercial = account?.summary?.available ? account.summary : null;
  useEffect(() => {
    if (!recordRequested || portal.loading) return;
    setRecord(commercial && account?.userId ? "commercial" : "accounting");
    setRecordRequested(false);
  }, [recordRequested, portal.loading, commercial, account?.userId]);
  const d = summary.data;
  const payments = useMemo(() => clientPaymentRows(commercial, d), [commercial, d]);
  const today = todayInChile();
  const allQuotes = quotes.data ?? [],
    receivables = commercial?.receivables ?? [];
  const recordSummary = useMemo(
    () =>
      commercial
        ? {
            ...commercial,
            receivables: commercial.receivables.map((r) => ({
              ...r,
              description: receivableCaption(r, quotes.data ?? []),
            })),
          }
        : null,
    [commercial, quotes.data],
  );
  const openReceivables = nextReceivables(receivables, today);
  const monthly = allQuotes.filter((q) => isLiveQuote(q) && q.billing?.frequency === "MONTHLY");
  const selectedQuote = allQuotes.find((q) => q.id === quoteId),
    scheduledQuote = allQuotes.find((q) => q.id === schedule),
    billingQuote = allQuotes.find((q) => q.id === billingQuoteId);
  const quoteRows = selectClientQuotes(allQuotes, {
    query,
    frequency,
    status: quoteStatus,
    archived: showArchived,
    sort,
  });
  const receivableRows = receivables
    .filter(
      (r) =>
        matchesFinanceSearch(
          query,
          receivableCaption(r, allQuotes),
          financeStatusLabel(receivableState(r, today)),
        ) &&
        (receivableFilter === "REMOVED"
          ? r.archivedByAdmin
          : receivableFilter === "ALL" ||
            (receivableFilter === "OPEN"
              ? isOpenReceivable(r)
              : receivableFilter === "PARTIAL"
                ? isOpenReceivable(r) && r.appliedAmount > 0
                : receivableState(r, today) === receivableFilter)),
    )
    .sort((a, b) =>
      (financeCivilDay(a.dueAt) || "9999").localeCompare(financeCivilDay(b.dueAt) || "9999"),
    );
  const paymentRows = selectClientPayments(payments, {
    query,
    source: paymentSource,
    status: paymentStatus,
    from,
    to,
  });
  const invoiceRows = (d?.invoices ?? []).filter(
    (i) =>
      matchesFinanceSearch(query, i.invoiceNumber, i.description, label(i.effectiveStatus)) &&
      (invoiceStatus === "ALL" ||
        (invoiceStatus === "BALANCE"
          ? i.balanceDue > 0 && ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(i.effectiveStatus)
          : i.effectiveStatus === invoiceStatus)),
  );
  const recentPayments = payments.filter((p) => p.status === "CONFIRMED").slice(0, 4);
  const activeAccount = commercial && accountView === "commercial" ? "commercial" : "accounting";
  const balance =
    activeAccount === "commercial" ? commercial!.totals.outstandingAmount : d?.balance;
  const overdue = activeAccount === "commercial" ? commercial!.totals.overdueAmount : d?.overdue;
  const received = activeAccount === "commercial" ? commercial!.totals.receivedAmount : d?.paid;
  const credit =
    activeAccount === "commercial" ? commercial!.totals.creditAmount : d?.creditBalance;
  const currency = activeAccount === "commercial" ? "CLP" : d?.currency || "CLP";
  const count =
    section === "quotes"
      ? quoteRows.length
      : section === "receivables"
        ? receivableRows.length
        : section === "payments"
          ? paymentRows.length
          : invoiceRows.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(count / pageSize)));
  const paged = <T,>(rows: T[]) => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const go = (tab: FinanceSection) => {
    setSection(tab);
    setQuery("");
  };
  const openRecord = (r?: ClientReceivable) => {
    setRecordReceivable(r?.id || "");
    setRecord(commercial && account?.userId ? "commercial" : "accounting");
  };
  const exportRows = () => {
    if (section === "quotes")
      downloadRegister(
        "cotizaciones-cliente",
        [
          "Cotización",
          "Fecha",
          "Modalidad",
          "Estado",
          "Moneda",
          "Importe",
          "Pagado",
          "Saldo registrado",
        ],
        quoteRows.map((q) => [
          q.quoteNumber,
          formatDate(q.createdAt),
          q.billing?.frequency === "MONTHLY" ? "Mensual" : "Pago único",
          financeStatusLabel(q.status),
          q.currency,
          q.totalAmount,
          q.billing?.paid,
          q.billing?.balance,
        ]),
      );
    if (section === "receivables")
      downloadRegister(
        "cuentas-por-cobrar",
        ["Descripción", "Emisión", "Vencimiento", "Estado", "Moneda", "Total", "Abonado", "Saldo"],
        receivableRows.map((r) => [
          receivableCaption(r, allQuotes),
          formatDate(r.issuedAt),
          formatDate(r.dueAt),
          financeStatusLabel(receivableState(r, today)),
          "CLP",
          r.totalAmount,
          r.appliedAmount,
          r.balanceAmount,
        ]),
      );
    if (section === "payments")
      downloadRegister(
        "pagos-cliente",
        [
          "Registro",
          "Referencia",
          "Fecha",
          "Medio",
          "Estado",
          "Moneda",
          "Monto",
          "Aplicado",
          "Sin asignar",
        ],
        paymentRows.map((p) => [
          sourceName(p.source),
          p.reference,
          formatDateTime(p.receivedAt),
          paymentMethodLabel(p.method),
          financeStatusLabel(p.status),
          p.currency,
          p.amount,
          p.allocated,
          p.credit,
        ]),
      );
    if (section === "invoices")
      downloadRegister(
        "documentos-cliente",
        ["Documento", "Emisión", "Vencimiento", "Estado", "Moneda", "Total", "Saldo"],
        invoiceRows.map((i) => [
          i.invoiceNumber,
          day(i.issueDate),
          day(i.dueDate),
          label(i.effectiveStatus),
          i.currency,
          i.totalAmount,
          i.balanceDue,
        ]),
      );
  };
  if (!allowed) return <Empty title="Sin acceso a la información financiera del cliente" />;
  return (
    <div className={s.workspace}>
      <header className={s.heading}>
        <div className={s.headingTitle}>
          <span className={s.seal}>
            <Landmark size={22} />
          </span>
          <div>
            <span className={s.eyebrow}>CUENTA DEL CLIENTE</span>
            <h2>Finanzas</h2>
            <p>Saldos, vencimientos y movimientos del cliente.</p>
          </div>
        </div>
        <div className={s.headingActions}>
          <button
            className={s.iconButton}
            title="Actualizar información financiera"
            aria-label="Actualizar información financiera"
            disabled={summary.loading || portal.loading || quotes.loading}
            onClick={() => void refresh()}
          >
            <RefreshCw size={17} className={summary.loading || portal.loading ? s.spinning : ""} />
          </button>
          {canRecord ? (
            <button className={s.primary} disabled={portal.loading} onClick={() => openRecord()}>
              <Plus size={16} /> Registrar pago
            </button>
          ) : null}
        </div>
      </header>
      <Feedback error={action.error} notice={action.notice} />
      <div className={s.accountBar}>
        <div>
          <span className={s.liveDot} />
          {!commercial || !d ? <strong>{sourceName(activeAccount)}</strong> : null}
          {commercial && d ? (
            <select
              aria-label="Cuenta del resumen financiero"
              value={activeAccount}
              onChange={(e) => setAccountView(e.target.value)}
            >
              <option value="commercial">Cuenta comercial</option>
              <option value="accounting">Documentos contables</option>
            </select>
          ) : null}
        </div>
        <small>
          {updatedAt ? `Actualizado a las ${formatTime(updatedAt)}` : "Consultando información…"}
        </small>
      </div>
      <div className={s.metrics}>
        {[
          {
            title: "Saldo por cobrar",
            value: balance,
            hint:
              activeAccount === "commercial"
                ? `${openReceivables.length} cuentas pendientes`
                : "Saldo de documentos contables",
            icon: Wallet,
            kind: "balance",
            onClick: () => {
              go(activeAccount === "commercial" ? "receivables" : "invoices");
              setReceivableFilter("OPEN");
              setInvoiceStatus("BALANCE");
            },
          },
          {
            title: "Saldo vencido",
            value: overdue,
            hint:
              overdue === undefined
                ? "Consultando saldo…"
                : overdue
                  ? "Requiere seguimiento"
                  : "Sin vencimientos pendientes",
            icon: CalendarDays,
            kind: overdue ? "overdue" : "neutral",
            onClick: () => {
              go(activeAccount === "commercial" ? "receivables" : "invoices");
              setReceivableFilter("OVERDUE");
              setInvoiceStatus("OVERDUE");
            },
          },
          {
            title: activeAccount === "commercial" ? "Pagos recibidos" : "Pagos aplicados",
            value: received,
            hint:
              activeAccount === "commercial"
                ? "Confirmados en cuenta comercial"
                : "Aplicados a documentos contables",
            icon: ArrowDownLeft,
            kind: "received",
            onClick: () => {
              go("payments");
              setPaymentSource(activeAccount);
              setPaymentStatus("CONFIRMED");
            },
          },
          {
            title: "Crédito disponible",
            value: credit,
            hint: "Anticipos sin asignar",
            icon: CircleDollarSign,
            kind: "neutral",
            onClick: () => {
              go("payments");
              setPaymentSource(activeAccount);
              setPaymentStatus("CREDIT");
            },
          },
        ].map((m) => (
          <button key={m.title} className={`${s.metric} ${s[m.kind]}`} onClick={m.onClick}>
            <span className={s.metricTop}>
              {m.title}
              <m.icon size={17} />
            </span>
            <strong>{money(m.value, currency)}</strong>
            <span className={s.metricHint}>
              {m.hint}
              <ArrowRight size={13} />
            </span>
          </button>
        ))}
      </div>
      {portal.error ? (
        <LoadError error={portal.error} retry={() => void portal.reload()} />
      ) : account?.summary && !account.summary.available ? (
        <Feedback
          error={account.summary.unavailableReason || "La cuenta comercial no está disponible."}
        />
      ) : null}
      {summary.error ? (
        <LoadError error={summary.error} retry={() => void summary.reload()} />
      ) : null}
      <nav className={s.tabs} aria-label="Secciones financieras">
        {(Object.keys(sectionLabels) as FinanceSection[]).map((key) => {
          const Icon = {
            overview: LayoutDashboard,
            quotes: FileText,
            receivables: CalendarDays,
            payments: ArrowDownLeft,
            invoices: Landmark,
          }[key];
          const badge = {
            overview: 0,
            quotes: allQuotes.filter((q) => !q.archivedAt).length,
            receivables: openReceivables.length,
            payments: payments.length,
            invoices: d?.invoices.length ?? 0,
          }[key];
          return (
            <button
              key={key}
              aria-current={section === key ? "page" : undefined}
              className={section === key ? s.activeTab : ""}
              onClick={() => go(key)}
            >
              <Icon size={16} />
              {sectionLabels[key]}
              {badge ? <span>{badge}</span> : null}
            </button>
          );
        })}
      </nav>
      {section === "overview" ? (
        <div className={s.overview}>
          <Panel
            title="Próximos cobros"
            subtitle="Primero los vencidos; luego los próximos vencimientos."
            action={
              <button
                className={s.textButton}
                onClick={() => {
                  go("receivables");
                  setReceivableFilter("OPEN");
                }}
              >
                Ver todos <ArrowRight size={14} />
              </button>
            }
          >
            {portal.loading && !account ? (
              <Loading />
            ) : openReceivables.length ? (
              <div className={s.dueList}>
                {openReceivables.slice(0, 5).map((r) => (
                  <div key={r.id} className={s.dueRow}>
                    <span
                      className={`${s.dateTile} ${receivableState(r, today) === "OVERDUE" ? s.lateTile : ""}`}
                    >
                      <CalendarDays size={17} />
                      <small>{r.dueAt ? formatDate(r.dueAt).slice(0, 5) : "S/F"}</small>
                    </span>
                    <div>
                      <strong title={receivableCaption(r, allQuotes)}>
                        {receivableCaption(r, allQuotes)}
                      </strong>
                      <span>
                        {r.dueAt ? `Vence ${formatDate(r.dueAt)}` : "Sin vencimiento definido"}
                        <Badge value={receivableState(r, today)} />
                      </span>
                    </div>
                    <div className={s.dueAmount}>
                      <strong>{money(r.balanceAmount)}</strong>
                      {canRecord ? (
                        <button className={s.textButton} onClick={() => openRecord(r)}>
                          Registrar pago <ArrowRight size={13} />
                        </button>
                      ) : null}
                      {canManage ? (
                        <button
                          className={s.removeCollection}
                          aria-label={`Eliminar cobro ${receivableCaption(r, allQuotes)} por ${money(r.balanceAmount)}`}
                          onClick={() => {
                            setReceivableArchive(r);
                            setRestoreReceivable(false);
                            setStopRenewal(false);
                          }}
                        >
                          <Trash2 size={12} /> Eliminar cobro
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="Sin cobros pendientes"
                text="Las nuevas cuentas aparecerán aquí con su vencimiento."
              />
            )}
          </Panel>
          <Panel
            title="Mensualidades"
            subtitle={`${monthly.length} propuestas mensuales vigentes`}
            action={
              <span className={s.iconSoft}>
                <Repeat2 size={18} />
              </span>
            }
          >
            <div className={s.monthlyList}>
              {monthly.slice(0, 3).map((q) => (
                <button key={q.id} onClick={() => setQuoteId(q.id)}>
                  <span>
                    <strong>{q.quoteNumber}</strong>
                    <small>
                      {q.billing?.paidThrough
                        ? `Período confirmado hasta ${formatDate(q.billing.paidThrough)}`
                        : financeStatusLabel(q.status)}
                    </small>
                  </span>
                  <span>
                    <strong>
                      {money(q.billing?.monthlyAmount ?? q.totalAmount, q.currency)}
                      <small>/ mes</small>
                    </strong>
                    <ChevronRight size={15} />
                  </span>
                </button>
              ))}
              {!monthly.length ? <Empty title="Sin propuestas mensuales" /> : null}
            </div>
            <button
              className={s.secondary}
              onClick={() => {
                go("quotes");
                setFrequency("MONTHLY");
                setQuoteStatus("ALL");
                setShowArchived(false);
              }}
            >
              Gestionar mensualidades <ArrowRight size={14} />
            </button>
          </Panel>
          <Panel
            title="Últimos pagos"
            subtitle="Movimientos confirmados, con su registro de origen."
            action={
              <button className={s.textButton} onClick={() => go("payments")}>
                Ver historial <ArrowRight size={14} />
              </button>
            }
          >
            {recentPayments.length ? (
              <div className={s.recentList}>
                {recentPayments.map((p) => (
                  <button key={p.key} onClick={() => setPayment(p)}>
                    <span className={s.paymentIcon}>
                      <ArrowDownLeft size={17} />
                    </span>
                    <span>
                      <strong>{p.reference}</strong>
                      <small>
                        {formatDate(p.receivedAt)} · {paymentMethodLabel(p.method)}
                      </small>
                    </span>
                    <span>
                      <strong>{money(p.amount, p.currency)}</strong>
                      <small>{sourceName(p.source)}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <Empty title="Sin pagos confirmados" />
            )}
          </Panel>
          <Panel
            title="Documentos y acuerdos"
            subtitle="Seguimiento de la facturación y compromisos de pago."
          >
            <div className={s.documentSummary}>
              <FileText size={24} />
              <div>
                <strong>
                  {d?.invoices.length ?? 0} {d?.invoices.length === 1 ? "documento" : "documentos"}
                </strong>
                <span>{money(d?.balance, d?.currency)} pendientes en documentos contables</span>
              </div>
            </div>
            {(d?.promises ?? [])
              .filter((p) => p.status === "OPEN")
              .slice(0, 2)
              .map((p) => (
                <div key={p.id} className={s.promise}>
                  <span>Compromiso al {day(p.promisedDate)}</span>
                  <strong>{money(p.amount, d?.currency)}</strong>
                </div>
              ))}
            <button className={s.secondary} onClick={() => go("invoices")}>
              Revisar documentos <ArrowRight size={14} />
            </button>
          </Panel>
        </div>
      ) : (
        <section className={s.registerPanel}>
          <header className={s.registerHeader}>
            <div>
              <h3>{sectionLabels[section]}</h3>
              <p>
                {section === "quotes"
                  ? "Propuestas y mensualidades asignadas a este cliente."
                  : section === "receivables"
                    ? "Vencimientos, abonos y saldos de la cuenta comercial."
                    : section === "payments"
                      ? "Busca un movimiento para revisar su detalle y aplicaciones."
                      : "Facturación y documentos contables del cliente."}
              </p>
            </div>
            {canExport ? (
              <button className={s.secondary} disabled={!count} onClick={exportRows}>
                <Download size={15} /> Exportar CSV
              </button>
            ) : null}
          </header>
          <div className={s.toolbar}>
            <label className={s.search}>
              <Search size={16} />
              <input
                aria-label={`Buscar en ${sectionLabels[section].toLowerCase()}`}
                placeholder={
                  section === "payments"
                    ? "Buscar referencia o medio de pago…"
                    : "Buscar por número, descripción o estado…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <button aria-label="Limpiar búsqueda" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              ) : null}
            </label>
            {section === "quotes" ? (
              <>
                <select
                  aria-label="Modalidad de cotización"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="ALL">Todas las modalidades</option>
                  <option value="MONTHLY">Mensualidades</option>
                  <option value="ONE_TIME">Pago único</option>
                </select>
                <select
                  aria-label="Estado de cotización"
                  value={quoteStatus}
                  onChange={(e) => setQuoteStatus(e.target.value)}
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="BALANCE">Con saldo registrado</option>
                  {Array.from(new Set(allQuotes.map((q) => q.status))).map((status) => (
                    <option key={status} value={status}>
                      {financeStatusLabel(status)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Orden de cotizaciones"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="recent">Más recientes</option>
                  <option value="oldest">Más antiguas</option>
                  <option value="balance">Mayor saldo</option>
                </select>
              </>
            ) : null}
            {section === "receivables" ? (
              <select
                aria-label="Estado del cobro"
                value={receivableFilter}
                onChange={(e) => setReceivableFilter(e.target.value)}
              >
                <option value="OPEN">Pendientes de cobro</option>
                <option value="OVERDUE">Vencidos</option>
                <option value="PARTIAL">Con abonos</option>
                <option value="PAID">Pagados</option>
                <option value="CANCELLED">Anulados</option>
                <option value="REMOVED">Eliminados</option>
                <option value="ALL">Todos los cobros</option>
              </select>
            ) : null}
            {section === "payments" ? (
              <>
                <select
                  aria-label="Registro de pagos"
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value)}
                >
                  <option value="ALL">Todos los registros</option>
                  <option value="commercial">Cuenta comercial</option>
                  <option value="accounting">Documentos contables</option>
                </select>
                <select
                  aria-label="Estado del pago"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="CREDIT">Con crédito disponible</option>
                  {Array.from(new Set(payments.map((p) => p.status))).map((status) => (
                    <option key={status} value={status}>
                      {financeStatusLabel(status)}
                    </option>
                  ))}
                </select>
                <label className={s.dateFilter}>
                  Desde
                  <DateInput value={from} onChange={setFrom} />
                </label>
                <label className={s.dateFilter}>
                  Hasta
                  <DateInput value={to} onChange={setTo} />
                </label>
              </>
            ) : null}
            {section === "invoices" ? (
              <select
                aria-label="Estado del documento"
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value)}
              >
                <option value="ALL">Todos los documentos</option>
                <option value="BALANCE">Con saldo pendiente</option>
                {Array.from(new Set((d?.invoices ?? []).map((i) => i.effectiveStatus))).map(
                  (status) => (
                    <option key={status} value={status}>
                      {label(status)}
                    </option>
                  ),
                )}
              </select>
            ) : null}
          </div>
          {section === "quotes" ? (
            <>
              <div className={s.listMeta}>
                <span>
                  <ListFilter size={14} /> {quoteRows.length} cotizaciones
                </span>
                <label>
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />{" "}
                  Mostrar eliminadas
                </label>
              </div>
              {quotes.error ? (
                <LoadError error={quotes.error} retry={() => void quotes.reload()} />
              ) : quotes.loading && !quotes.data ? (
                <Loading />
              ) : (
                <Register
                  rows={paged(quoteRows)}
                  rowKey={(q) => q.id}
                  columns={[
                    {
                      key: "n",
                      label: "Cotización",
                      render: (q) => (
                        <button className={s.rowTitle} onClick={() => setQuoteId(q.id)}>
                          <strong>{q.quoteNumber}</strong>
                          <small>{formatDate(q.createdAt)}</small>
                        </button>
                      ),
                    },
                    {
                      key: "f",
                      label: "Modalidad",
                      render: (q) => (
                        <span
                          className={
                            q.billing?.frequency === "MONTHLY" ? s.recurringBadge : s.oneTimeBadge
                          }
                        >
                          {q.billing?.frequency === "MONTHLY" ? (
                            <Repeat2 size={12} />
                          ) : (
                            <FileText size={12} />
                          )}
                          {q.billing?.frequency === "MONTHLY" ? "Mensual" : "Pago único"}
                        </span>
                      ),
                    },
                    {
                      key: "s",
                      label: "Estado",
                      render: (q) => (
                        <Badge
                          value={
                            q.archivedAt ? "ARCHIVED" : q.archivePending ? "PENDING" : q.status
                          }
                          text={q.archivePending ? "Eliminando…" : undefined}
                        />
                      ),
                    },
                    {
                      key: "t",
                      label: "Importe",
                      align: "right",
                      render: (q) => <strong>{money(q.totalAmount, q.currency)}</strong>,
                    },
                    {
                      key: "p",
                      label: "Pagado",
                      align: "right",
                      render: (q) => (
                        <span className={s.paidAmount}>{money(q.billing?.paid, q.currency)}</span>
                      ),
                    },
                    {
                      key: "b",
                      label: "Saldo registrado",
                      align: "right",
                      render: (q) => <strong>{money(q.billing?.balance, q.currency)}</strong>,
                    },
                    {
                      key: "a",
                      label: "",
                      align: "right",
                      render: (q) => (
                        <button className={s.rowAction} onClick={() => setQuoteId(q.id)}>
                          Gestionar <ChevronRight size={14} />
                        </button>
                      ),
                    },
                  ]}
                  empty="No hay cotizaciones con estos filtros"
                />
              )}
            </>
          ) : null}
          {section === "receivables" ? (
            portal.loading && !account ? (
              <Loading />
            ) : (
              <Register
                rows={paged(receivableRows)}
                rowKey={(r) => r.id}
                columns={[
                  {
                    key: "d",
                    label: "Cobro",
                    render: (r) => (
                      <div className={s.rowTitle}>
                        <strong>{receivableCaption(r, allQuotes)}</strong>
                        <small>Emitido {formatDate(r.issuedAt)}</small>
                      </div>
                    ),
                  },
                  {
                    key: "v",
                    label: "Vencimiento",
                    render: (r) => (
                      <span
                        className={receivableState(r, today) === "OVERDUE" ? s.overdueText : ""}
                      >
                        {formatDate(r.dueAt)}
                      </span>
                    ),
                  },
                  {
                    key: "s",
                    label: "Estado",
                    render: (r) => <Badge value={receivableState(r, today)} />,
                  },
                  { key: "t", label: "Total", align: "right", render: (r) => money(r.totalAmount) },
                  {
                    key: "p",
                    label: "Abonado",
                    align: "right",
                    render: (r) => <span className={s.paidAmount}>{money(r.appliedAmount)}</span>,
                  },
                  {
                    key: "b",
                    label: "Pendiente",
                    align: "right",
                    render: (r) => <strong>{money(r.balanceAmount)}</strong>,
                  },
                  {
                    key: "a",
                    label: "",
                    align: "right",
                    render: (r) => (
                      <div className={s.rowActions}>
                        {isOpenReceivable(r) ? (
                          <>
                            {canRecord ? (
                              <button className={s.rowAction} onClick={() => openRecord(r)}>
                                Registrar pago
                              </button>
                            ) : null}
                            {canManage ? (
                              <ReceivableDueButton
                                clientId={clientId}
                                item={r}
                                onChanged={refresh}
                              />
                            ) : null}
                            {canManage ? (
                              <button
                                className={s.dangerButton}
                                onClick={() => {
                                  setReceivableArchive(r);
                                  setRestoreReceivable(false);
                                  setStopRenewal(false);
                                }}
                              >
                                <Trash2 size={12} /> Eliminar
                              </button>
                            ) : null}
                          </>
                        ) : r.archivedByAdmin && canManage ? (
                          <button
                            className={s.rowAction}
                            onClick={() => {
                              setReceivableArchive(r);
                              setRestoreReceivable(true);
                              setStopRenewal(false);
                            }}
                          >
                            Restaurar cobro
                          </button>
                        ) : (
                          <Check size={15} />
                        )}
                      </div>
                    ),
                  },
                ]}
                empty="No hay cuentas con estos filtros"
              />
            )
          ) : null}
          {section === "payments" ? (
            <>
              {from && to && from > to ? (
                <Feedback error="La fecha inicial debe ser anterior a la fecha final." />
              ) : null}
              <Register
                rows={paged(paymentRows)}
                rowKey={(p) => p.key}
                columns={[
                  {
                    key: "r",
                    label: "Movimiento",
                    render: (p) => (
                      <button className={s.rowTitle} onClick={() => setPayment(p)}>
                        <strong>{p.reference}</strong>
                        <small>{sourceName(p.source)}</small>
                      </button>
                    ),
                  },
                  {
                    key: "d",
                    label: "Recibido",
                    render: (p) => (
                      <div className={s.rowTitle}>
                        <span>{formatDate(p.receivedAt)}</span>
                        <small>{formatTime(p.receivedAt)}</small>
                      </div>
                    ),
                  },
                  { key: "m", label: "Medio", render: (p) => paymentMethodLabel(p.method) },
                  {
                    key: "a",
                    label: "Monto",
                    align: "right",
                    render: (p) => <strong>{money(p.amount, p.currency)}</strong>,
                  },
                  {
                    key: "p",
                    label: "Aplicado",
                    align: "right",
                    render: (p) => (
                      <span className={s.paidAmount}>{money(p.allocated, p.currency)}</span>
                    ),
                  },
                  { key: "s", label: "Estado", render: (p) => <Badge value={p.status} /> },
                  {
                    key: "v",
                    label: "",
                    align: "right",
                    render: (p) => (
                      <button className={s.rowAction} onClick={() => setPayment(p)}>
                        Ver detalle <ChevronRight size={14} />
                      </button>
                    ),
                  },
                ]}
                empty="No hay pagos con estos filtros"
              />
            </>
          ) : null}
          {section === "invoices" ? (
            <Register
              rows={paged(invoiceRows)}
              rowKey={(i) => i.id}
              columns={[
                {
                  key: "n",
                  label: "Documento",
                  render: (i) => (
                    <button className={s.rowTitle} onClick={() => setInvoice(i.id)}>
                      <strong>{i.invoiceNumber}</strong>
                      <small>{i.description || "Documento contable"}</small>
                    </button>
                  ),
                },
                { key: "e", label: "Emisión", render: (i) => day(i.issueDate) },
                { key: "v", label: "Vencimiento", render: (i) => day(i.dueDate) },
                {
                  key: "t",
                  label: "Total",
                  align: "right",
                  render: (i) => money(i.totalAmount, i.currency),
                },
                {
                  key: "b",
                  label: "Saldo",
                  align: "right",
                  render: (i) => <strong>{money(i.balanceDue, i.currency)}</strong>,
                },
                { key: "s", label: "Estado", render: (i) => <Pill value={i.effectiveStatus} /> },
                {
                  key: "a",
                  label: "",
                  render: (i) => (
                    <button className={s.rowAction} onClick={() => setInvoice(i.id)}>
                      Ver documento <ChevronRight size={14} />
                    </button>
                  ),
                },
              ]}
              empty="No hay documentos con estos filtros"
            />
          ) : null}
          <Pager page={currentPage} count={count} setPage={setPage} />
        </section>
      )}
      <p className={s.footnote}>
        Los saldos del resumen corresponden a la cuenta seleccionada. Los documentos contables y la
        cuenta comercial conservan sus propios movimientos.
      </p>
      {typeof document !== "undefined"
        ? createPortal(
            <div className="zy-full-control">
              <Drawer
                open={Boolean(selectedQuote)}
                title={selectedQuote?.quoteNumber || "Cotización"}
                subtitle="Gestiona la propuesta, sus cobros y renovación."
                onClose={() => setQuoteId(null)}
              >
                {selectedQuote ? (
                  <div className={s.detail}>
                    <div className={s.detailStatus}>
                      <Badge value={selectedQuote.status} />
                      <span className={s.recurringBadge}>
                        {selectedQuote.billing?.frequency === "MONTHLY" ? "Mensual" : "Pago único"}
                      </span>
                    </div>
                    <KeyValue
                      items={[
                        [
                          "Importe de la propuesta",
                          money(selectedQuote.totalAmount, selectedQuote.currency),
                        ],
                        [
                          "Pagado confirmado",
                          money(selectedQuote.billing?.paid, selectedQuote.currency),
                        ],
                        [
                          "Saldo registrado",
                          money(selectedQuote.billing?.balance, selectedQuote.currency),
                        ],
                        ["Fecha", formatDate(selectedQuote.createdAt)],
                      ]}
                    />
                    {selectedQuote.archivedAt || selectedQuote.archivePending ? (
                      <p className={s.detailNote}>
                        {selectedQuote.archivePending
                          ? "La eliminación está en proceso. Flow debe confirmar la cancelación; esta ficha se actualiza automáticamente."
                          : "Cotización eliminada del listado. El historial de pagos se conserva."}
                      </p>
                    ) : (
                      <>
                        <h4>Cobros y renovación</h4>
                        <p className={s.detailNote}>
                          Consulta pagos, configura vencimientos y administra la renovación mensual.
                        </p>
                        {selectedQuote.billing &&
                        (selectedQuote.billing.source === "WEBSITE" ||
                          (selectedQuote.billing.frequency === "MONTHLY" &&
                            selectedQuote.billing.basis !== "CALENDAR")) ? (
                          <button
                            className="fx-btn primary"
                            onClick={() => {
                              setBillingQuoteId(selectedQuote.id);
                              setQuoteId(null);
                            }}
                          >
                            <CalendarDays size={15} /> Abrir calendario y renovación
                          </button>
                        ) : (
                          <button
                            className="fx-btn primary"
                            onClick={() => {
                              setSchedule(selectedQuote.id);
                              setQuoteId(null);
                            }}
                          >
                            <CalendarDays size={15} /> Abrir calendario y pagos
                          </button>
                        )}
                        {canManage ? (
                          <>
                            <h4>Administrar cotización</h4>
                            <div className={s.detailActions}>
                              <button
                                className={s.secondary}
                                onClick={() => {
                                  setEditing(selectedQuote.id);
                                  setQuoteId(null);
                                }}
                              >
                                <Pencil size={15} /> Editar propuesta
                              </button>
                              {["SENT", "NEGOTIATING"].includes(selectedQuote.status) ? (
                                <button
                                  className={s.secondary}
                                  disabled={action.busy}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `¿Registrar la aceptación comercial de ${selectedQuote.quoteNumber}?`,
                                      )
                                    )
                                      void action.run(
                                        () =>
                                          commercialApi.quoteAction(
                                            role,
                                            selectedQuote.id,
                                            "accept",
                                            {},
                                            true,
                                          ),
                                        "Aceptación registrada.",
                                      );
                                  }}
                                >
                                  <Check size={15} /> Registrar aceptación
                                </button>
                              ) : null}
                            </div>
                            <div className={s.dangerZone}>
                              <div>
                                <strong>Eliminar del listado</strong>
                                <p>Detiene la renovación y conserva los pagos recibidos.</p>
                              </div>
                              <button
                                className={s.dangerButton}
                                disabled={action.busy}
                                onClick={() => {
                                  setArchive(selectedQuote);
                                  setQuoteId(null);
                                }}
                              >
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </Drawer>
              {billingQuote?.billing ? (
                <WebsiteQuoteBillingButton
                  key={billingQuote.id}
                  quoteId={billingQuote.id}
                  quoteNumber={billingQuote.quoteNumber}
                  clientId={clientId}
                  currency={billingQuote.currency}
                  billing={billingQuote.billing}
                  onChanged={refresh}
                  initialOpen
                  hideTrigger
                  onClosed={() => setBillingQuoteId(null)}
                />
              ) : null}
              <Drawer
                open={Boolean(schedule)}
                wide
                title={`Calendario y pagos · ${scheduledQuote?.quoteNumber || ""}`}
                onClose={() => setSchedule(null)}
              >
                {schedule ? (
                  <QuotePaymentPanel
                    key={schedule}
                    quoteId={schedule}
                    onChanged={() => void refresh()}
                  />
                ) : null}
              </Drawer>
              {editing ? (
                <QuoteEditor
                  id={editing}
                  role={role}
                  onClose={() => setEditing(null)}
                  onSelect={setEditing}
                  onChanged={refresh}
                />
              ) : null}
              <Drawer
                open={record === "commercial" && Boolean(account?.userId && commercial)}
                title="Registrar pago recibido"
                subtitle="Cuenta comercial del cliente"
                onClose={() => setRecord(null)}
              >
                {record === "commercial" && account?.userId && commercial ? (
                  <div className={s.recordForm}>
                    <PortalPaymentForm
                      key={`${clientId}:${recordReceivable}`}
                      clientId={account.userId}
                      businessClientId={clientId}
                      mode="record"
                      initialReceivableId={recordReceivable}
                      initialSummary={recordSummary || commercial}
                      onChanged={refresh}
                      onRecorded={() => {
                        setRecord(null);
                        go("payments");
                        action.setNotice("Pago registrado y saldo actualizado.");
                      }}
                    />
                    {canRecord ? (
                      <button className={s.textButton} onClick={() => setRecord("accounting")}>
                        Registrar para documentos contables <ArrowRight size={13} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </Drawer>
              {record === "accounting" && canRecord ? (
                <RecordPayment
                  key={`${clientId}:record`}
                  open
                  initialClientId={clientId}
                  onClose={() => setRecord(null)}
                  onDone={(id) => {
                    setRecord(null);
                    setPayment({
                      id,
                      key: `accounting:${id}`,
                      source: "accounting",
                    } as PaymentRegisterRow);
                    void refresh();
                  }}
                />
              ) : null}
              {payment?.source === "accounting" ? (
                <PaymentDetail
                  id={payment.id}
                  onClose={() => setPayment(null)}
                  onChanged={() => void refresh()}
                />
              ) : null}
              <Drawer
                open={payment?.source === "commercial"}
                title="Detalle del pago"
                subtitle={payment?.reference}
                onClose={() => setPayment(null)}
              >
                {payment?.source === "commercial" ? (
                  <div className={s.detail}>
                    <div className={s.paymentHero}>
                      <span className={s.paymentIcon}>
                        <ArrowDownLeft size={24} />
                      </span>
                      <strong>{money(payment.amount, payment.currency)}</strong>
                      <Badge value={payment.status} />
                    </div>
                    <KeyValue
                      items={[
                        ["Recibido", formatDateTime(payment.receivedAt)],
                        ["Medio", paymentMethodLabel(payment.method)],
                        ["Referencia", payment.reference],
                        ["Aplicado a cobros", money(payment.allocated, payment.currency)],
                        ["Crédito sin asignar", money(payment.credit, payment.currency)],
                        ["Registro", "Cuenta comercial"],
                      ]}
                    />
                    {payment.voidReason ? (
                      <p className={s.detailNote}>Motivo de anulación: {payment.voidReason}</p>
                    ) : null}
                    {canRecord && payment.status === "CONFIRMED" ? (
                      <div className={s.dangerZone}>
                        <div>
                          <strong>Anular pago</strong>
                          <p>Revierte sus aplicaciones y recalcula los saldos.</p>
                        </div>
                        <button
                          className={s.dangerButton}
                          onClick={() => {
                            setVoidPayment(payment);
                            setPayment(null);
                          }}
                        >
                          Anular pago
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Drawer>
              {invoice ? (
                <InvoiceDetail
                  id={invoice}
                  onClose={() => setInvoice(null)}
                  onChanged={() => void refresh()}
                />
              ) : null}
              <ReasonDialog
                open={Boolean(receivableArchive)}
                minReasonLength={5}
                title={restoreReceivable ? "Restaurar cobro eliminado" : "Eliminar cobro pendiente"}
                description={
                  receivableArchive
                    ? `${receivableCaption(receivableArchive, allQuotes)} · ${money(receivableArchive.balanceAmount)}. ${restoreReceivable ? "El cobro volverá a la cuenta del cliente. No reactiva una renovación detenida." : "Se retira de Próximos cobros y del saldo por cobrar. Los pagos y documentos asociados se conservan. Puedes recuperarlo desde Cuentas por cobrar → Eliminados."}`
                    : ""
                }
                confirm={restoreReceivable ? "Restaurar cobro" : "Eliminar cobro"}
                extra={
                  !restoreReceivable && receivableArchive?.quoteId ? (
                    <label className="fx-check">
                      <input
                        type="checkbox"
                        checked={stopRenewal}
                        onChange={(e) => setStopRenewal(e.target.checked)}
                      />{" "}
                      Detener también la renovación y retirar la cotización del listado
                    </label>
                  ) : undefined
                }
                onCancel={() => setReceivableArchive(null)}
                onConfirm={(reason) => {
                  const r = receivableArchive,
                    restoring = restoreReceivable;
                  setReceivableArchive(null);
                  if (r)
                    void action
                      .run(async () => {
                        const response = await fetch(
                          `/api/portal/admin/clients/${clientId}/receivables/${encodeURIComponent(r.id)}/archive`,
                          {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              operation: restoring ? "restore" : "archive",
                              reason,
                              expectedBalance: r.balanceAmount,
                              stopRenewal: !restoring && stopRenewal,
                            }),
                          },
                        );
                        const result = await response.json();
                        if (!response.ok) throw Error(result.error);
                        return result;
                      })
                      .then((result) => {
                        if (result) {
                          action.setNotice(
                            restoring
                              ? "Cobro restaurado."
                              : result.renewal === "pending"
                                ? "Cobro eliminado. La cancelación de la renovación está pendiente de confirmación de Flow."
                                : result.renewal === "stopped"
                                  ? "Cobro eliminado y renovación detenida."
                                  : "Cobro eliminado de Próximos cobros. Disponible en Eliminados.",
                          );
                          if (result.renewal === "failed")
                            action.setError(
                              "El cobro se eliminó, pero no se confirmó la detención de la renovación. Revisa la cotización antes del próximo período.",
                            );
                        }
                      });
                }}
              />
              <ReasonDialog
                open={Boolean(voidPayment)}
                title="Anular pago recibido"
                description="El movimiento quedará anulado y sus abonos se revertirán. Su historial se conserva."
                confirm="Anular pago"
                onCancel={() => setVoidPayment(null)}
                onConfirm={(reason) => {
                  const p = voidPayment;
                  setVoidPayment(null);
                  if (p && account?.userId)
                    void action.run(async () => {
                      const r = await fetch(
                        `/administracion/clientes/${account.userId}/pagos/${p.id}/anular`,
                        {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ reason }),
                        },
                      );
                      const data = await r.json();
                      if (!r.ok) throw Error(data.error);
                      return data;
                    }, "Pago anulado. Saldos actualizados.");
                }}
              />
              <ReasonDialog
                open={Boolean(archive)}
                title={`Eliminar ${archive?.quoteNumber || "cotización"}`}
                description="Detiene la renovación. Si usa Flow, su cancelación se gestiona desde aquí al final del período pagado. Los pagos recibidos se conservan."
                confirm="Eliminar y detener renovación"
                onCancel={() => setArchive(null)}
                onConfirm={(reason) => {
                  const q = archive;
                  setArchive(null);
                  if (q)
                    void action
                      .run(async () => {
                        const r = await fetch(`/api/portal/admin/quotes/${q.id}/archive`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ clientId, reason }),
                        });
                        const data = await r.json();
                        if (!r.ok) throw Error(data.error);
                        return data;
                      })
                      .then((result) => {
                        if (result)
                          action.setNotice(
                            result.pending
                              ? "Eliminación en proceso. Se completará cuando Flow confirme la cancelación."
                              : "Cotización eliminada del listado. Historial conservado.",
                          );
                      });
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

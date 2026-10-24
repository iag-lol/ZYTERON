"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Info,
  RefreshCw,
  Repeat2,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { pendingBilling } from "@/lib/client-experience/pending-billing";
import type { ClientRecurring } from "@/lib/payments/client-recurring-projection";
import { recurringStateLabel } from "@/lib/payments/client-recurring-projection";
import { paymentCivilDate, projectMonthlyPayments } from "@/lib/payments/payment-projection";
import { money, civil } from "./production-model";
import s from "./billing-workspace.module.css";

type Tab = "overview" | "plans" | "bills" | "payments" | "calendar";
type Props = {
  data: PortalData;
  initialInvoiceId?: string | null;
  onHelp: () => void;
  onQuote: (id: string) => void;
  onPay: (id: string) => void;
};
const tabs: [Tab, string][] = [
  ["overview", "Resumen"],
  ["plans", "Mensualidades"],
  ["bills", "Cobros y facturas"],
  ["payments", "Pagos recibidos"],
  ["calendar", "Calendario"],
];
export default function BillingWorkspace({
  data,
  initialInvoiceId,
  onHelp,
  onQuote,
  onPay,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview"),
    [query, setQuery] = useState(""),
    [billState, setBillState] = useState("Pendientes"),
    [year, setYear] = useState(Number(paymentCivilDate(data.asOf)?.slice(0, 4))),
    [month, setMonth] = useState(Number(paymentCivilDate(data.asOf)?.slice(5, 7))),
    [plan, setPlan] = useState<ClientRecurring | null>(null),
    [billId, setBillId] = useState<string | null>(initialInvoiceId || null),
    [payment, setPayment] = useState<PortalData["payments"][number] | null>(null),
    [challenge, setChallenge] = useState(""),
    [cancelling, setCancelling] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const plans = data.recurring;
  const bill = data.invoices.find((i) => i.id === billId);
  const openInvoice = (id: string) => {
    setPlan(null);
    setPayment(null);
    setBillId(id);
  };
  const { pending, totals } = pendingBilling(data.invoices),
    clp = totals.find((group) => group.currency === "CLP"),
    balance = clp?.balance || 0,
    overdue = clp?.overdue || 0;
  const search = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(
        query
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase(),
      );
  const caption = (i: PortalData["invoices"][number]) =>
    [data.quotes.find((q) => q.id === i.quoteId)?.number, i.concept].filter(Boolean).join(" · ");
  const close = () => {
    setPlan(null);
    setPayment(null);
    setBillId(null);
    setCancelling(false);
    setChallenge("");
    setMessage("");
  };
  useEffect(() => {
    if (!plan && !payment && !bill) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
      if (event.key !== "Tab") return;
      const nodes = dialog.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled),input,a[href]",
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [plan, payment, bill, busy]);
  // La actualización del servidor también invalida un detalle abierto que ya fue retirado.
  useEffect(() => {
    if (plan) {
      const fresh = data.recurring.find((p) => p.quoteId === plan.quoteId);
      if (!fresh) close();
      else if (fresh !== plan) setPlan(fresh);
    }
    if (payment && !data.payments.some((p) => p.id === payment.id && p.source === payment.source))
      close();
    if (billId && !data.invoices.some((i) => i.id === billId)) close();
  }, [data.recurring, plan, data.payments, payment, data.invoices, billId]);
  const switchTab = (value: Tab) => {
    setTab(value);
    setQuery("");
  };
  const openPlan = (p: ClientRecurring) => {
    setPlan(p);
    setMessage("");
    setCancelling(false);
    setChallenge("");
  };
  function PlanRows({ compact = false }: { compact?: boolean }) {
    const rows = plans.filter((p) => search(p.label));
    return rows.length ? (
      <div className={s.planList}>
        {(compact ? rows.slice(0, 3) : rows).map((p) => (
          <button key={p.quoteId} className={s.planRow} onClick={() => openPlan(p)}>
            <span className={s.icon}>
              <Repeat2 size={18} />
            </span>
            <span className={s.grow}>
              <strong>{p.label}</strong>
              <small>
                {recurringStateLabel(p.state)}
                {p.nextDate ? ` · Próximo ${civil(p.nextDate)}` : " · Sin fecha activada"}
              </small>
            </span>
            <span className={s.amount}>
              <strong>{money(p.amount, p.currency)}</strong>
              <small>por mes</small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
    ) : (
      <div className={s.empty}>No hay mensualidades asignadas.</div>
    );
  }
  function Bills({ compact = false }: { compact?: boolean }) {
    const rows = data.invoices.filter(
      (i) =>
        (compact
          ? i.balance > 0
          : billState === "Todos" ||
            (billState === "Pendientes" ? i.balance > 0 : i.status === billState)) &&
        search(caption(i)),
    );
    return rows.length ? (
      <div className={s.register}>
        {(compact ? rows.slice(0, 4) : rows).map((i) => (
          <div key={i.id} className={s.billRow}>
            <span className={s.icon}>
              <FileText size={18} />
            </span>
            <button className={s.rowTitle} onClick={() => openInvoice(i.id)}>
              <strong>{caption(i)}</strong>
              <small>{i.due ? `Vence ${civil(i.due)}` : "Sin vencimiento definido"}</small>
            </button>
            <span className={`${s.badge} ${i.status === "Vencida" ? s.late : ""}`}>
              {i.balance === 0 ? "Pagada" : i.status}
            </span>
            <span className={s.amount}>
              <strong>{money(i.balance > 0 ? i.balance : i.total, i.currency)}</strong>
              <small>{i.balance > 0 ? "Saldo pendiente" : "Total pagado"}</small>
            </span>
            <button className={s.smallButton} onClick={() => openInvoice(i.id)}>
              Ver detalle <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className={s.empty}>
        <Check size={24} />
        <strong>Sin cobros en este filtro</strong>
        <span>Los cobros retirados por administración no forman parte del saldo pendiente.</span>
      </div>
    );
  }
  function Payments({ compact = false }: { compact?: boolean }) {
    const rows = data.payments.filter((p) => search(`${p.reference} ${p.amount} ${civil(p.date)}`));
    return rows.length ? (
      <div className={s.register}>
        {(compact ? rows.slice(0, 4) : rows).map((p) => (
          <div className={s.paymentRow} key={`${p.source}:${p.id}`}>
            <span className={s.paidIcon}>
              <ArrowDownLeft size={18} />
            </span>
            <button className={s.rowTitle} onClick={() => setPayment(p)}>
              <strong>{p.reference}</strong>
              <small>
                {civil(p.date)} ·{" "}
                {p.source === "commercial" ? "Cuenta comercial" : "Documentos contables"}
              </small>
            </button>
            <span className={s.amount}>
              <strong>{money(p.amount)}</strong>
              <small>Confirmado</small>
            </span>
            <button className={s.smallButton} onClick={() => setPayment(p)}>
              Ver pago <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className={s.empty}>No hay pagos confirmados con esta búsqueda.</div>
    );
  }
  const calendar = [
    ...data.payments.map((p) => ({
      id: `${p.source}:${p.id}`,
      label: p.reference,
      date: paymentCivilDate(p.date),
      amount: p.amount,
      currency: "CLP",
      kind: "paid",
      invoiceId: null as string | null,
    })),
    ...pending.map((i) => ({
      id: i.id,
      label: caption(i),
      date: paymentCivilDate(i.due || i.issued),
      amount: i.balance,
      currency: i.currency,
      kind: "pending",
      invoiceId: i.id,
    })),
    ...plans
      .filter((p) => p.currency === "CLP")
      .flatMap((p) => projectMonthlyPayments(p, year))
      .filter(
        (p) =>
          !data.invoices.some(
            (i) => i.quoteId === p.quoteId && paymentCivilDate(i.due || i.issued) === p.date,
          ),
      )
      .map((p) => ({
        ...p,
        id: `forecast:${p.quoteId}:${p.date}`,
        currency: "CLP",
        kind: "forecast",
        invoiceId: null as string | null,
      })),
  ]
    .filter((r) => r.date?.startsWith(`${year}-${String(month).padStart(2, "0")}`))
    .sort((a, b) => a.date!.localeCompare(b.date!));
  return (
    <section className={s.root} aria-label="Centro de pagos del cliente">
      <div className={s.heading}>
        <div>
          <span className={s.eyebrow}>CUENTA DEL CLIENTE</span>
          <h2>Tu cuenta, en orden</h2>
          <p>Cobros, mensualidades y pagos vinculados a tu empresa.</p>
        </div>
        <button className={s.secondary} onClick={() => router.refresh()}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>
      <div className={s.metrics}>
        <button className={s.balanceMetric} onClick={() => switchTab("bills")}>
          <span>Saldo pendiente · CLP</span>
          <strong>{money(balance)}</strong>
          <small>{pending.length} cobros pendientes</small>
        </button>
        <button
          onClick={() => {
            switchTab("bills");
            setBillState("Vencida");
          }}
        >
          <span>Saldo vencido · CLP</span>
          <strong>{money(overdue)}</strong>
          <small>{overdue ? "Revisa tus vencimientos" : "Sin vencimientos pendientes"}</small>
        </button>
        <button onClick={() => switchTab("plans")}>
          <span>Mensualidades asignadas</span>
          <strong>{plans.length}</strong>
          <small>
            {plans.filter((p) => p.state === "ACTIVE").length} activas ·{" "}
            {plans.filter((p) => p.state === "ASSIGNED").length} por activar
          </small>
        </button>
        <button onClick={() => switchTab("payments")}>
          <span>Pagos confirmados</span>
          <strong>{data.payments.length}</strong>
          <small>Consulta cada movimiento y su origen</small>
        </button>
      </div>
      <nav className={s.tabs} aria-label="Secciones de pagos">
        {tabs.map(([key, title]) => (
          <button key={key} aria-pressed={tab === key} onClick={() => switchTab(key)}>
            {title}
            {key === "plans" ? (
              <span>{plans.length}</span>
            ) : key === "bills" ? (
              <span>{pending.length}</span>
            ) : null}
          </button>
        ))}
      </nav>
      {tab !== "overview" && tab !== "calendar" ? (
        <div className={s.toolbar}>
          <label className={s.search}>
            <Search size={16} />
            <input
              aria-label="Buscar en pagos y facturas"
              placeholder="Buscar por cotización, concepto o referencia…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {tab === "bills" ? (
            <select
              aria-label="Estado de cobros"
              value={billState}
              onChange={(e) => setBillState(e.target.value)}
            >
              {["Pendientes", "Todos", "Vencida", "Pagada"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
      {tab === "overview" ? (
        <div className={s.overview}>
          <section className={s.panel}>
            <header>
              <div>
                <h3>Próximos cobros</h3>
                <p>Importes registrados pendientes de pago.</p>
              </div>
              <button onClick={() => switchTab("bills")}>
                Ver todos <ArrowRight size={14} />
              </button>
            </header>
            <Bills compact />
          </section>
          <section className={s.panel}>
            <header>
              <div>
                <h3>Mensualidades</h3>
                <p>Importe mensual y estado de activación.</p>
              </div>
              <button onClick={() => switchTab("plans")}>
                Ver todas <ArrowRight size={14} />
              </button>
            </header>
            <PlanRows compact />
          </section>
          <section className={`${s.panel} ${s.full}`}>
            <header>
              <div>
                <h3>Últimos pagos recibidos</h3>
                <p>Movimientos confirmados, con acceso a sus cobros vinculados.</p>
              </div>
              <button onClick={() => switchTab("payments")}>
                Ver historial <ArrowRight size={14} />
              </button>
            </header>
            <Payments compact />
          </section>
        </div>
      ) : tab === "plans" ? (
        <section className={s.panel}>
          <header>
            <div>
              <h3>Mensualidades de tu empresa</h3>
              <p>Una mensualidad pendiente de activación todavía no genera cargos automáticos.</p>
            </div>
          </header>
          <PlanRows />
        </section>
      ) : tab === "bills" ? (
        <section className={s.panel}>
          <header>
            <div>
              <h3>Cobros y documentos</h3>
              <p>Consulta el importe, los abonos y el saldo de cada cuenta.</p>
            </div>
          </header>
          <Bills />
        </section>
      ) : tab === "payments" ? (
        <section className={s.panel}>
          <header>
            <div>
              <h3>Pagos recibidos</h3>
              <p>El historial conserva los pagos efectivos, incluso si se retira una renovación.</p>
            </div>
          </header>
          <Payments />
        </section>
      ) : (
        <section className={s.panel}>
          <header>
            <div>
              <h3>Calendario de pagos</h3>
              <p>Los cobros emitidos y las proyecciones se distinguen de los pagos confirmados.</p>
            </div>
            <div className={s.calendarControls}>
              <button
                aria-label="Año anterior"
                disabled={year <= 2020}
                onClick={() => setYear(year - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <strong>{year}</strong>
              <button
                aria-label="Año siguiente"
                disabled={year >= 2100}
                onClick={() => setYear(year + 1)}
              >
                <ChevronRight size={16} />
              </button>
              <select
                aria-label="Mes del calendario"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(
                      new Date(Date.UTC(year, i, 1)),
                    )}
                  </option>
                ))}
              </select>
            </div>
          </header>
          <div className={s.calendarList}>
            {calendar.map((r) => (
              <article key={r.id}>
                <span className={r.kind === "paid" ? s.paidIcon : s.icon}>
                  {r.kind === "paid" ? <Check size={18} /> : <CalendarDays size={18} />}
                </span>
                <div className={s.grow}>
                  <strong>{r.label}</strong>
                  <small>
                    {civil(r.date)} ·{" "}
                    {r.kind === "paid"
                      ? "Pago confirmado"
                      : r.kind === "pending"
                        ? "Cobro pendiente"
                        : "Proyección mensual"}
                  </small>
                </div>
                <strong>{money(r.amount, r.currency)}</strong>
                {r.invoiceId ? (
                  <button className={s.smallButton} onClick={() => openInvoice(r.invoiceId!)}>
                    Ver cobro
                  </button>
                ) : null}
              </article>
            ))}
          </div>
          {!calendar.length ? (
            <div className={s.empty}>Sin movimientos ni proyecciones para este mes.</div>
          ) : null}
        </section>
      )}
      <p className={s.footnote}>
        <Info size={14} /> La asignación de una mensualidad y la autorización de una tarjeta no
        acreditan un pago. Los comprobantes se habilitan después de confirmar la transacción.
      </p>
      {plan || payment || bill ? (
        <div className={s.backdrop}>
          <div
            className={s.drawer}
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-detail-title"
          >
            <header>
              <div>
                <span className={s.eyebrow}>
                  {plan ? "MENSUALIDAD" : bill ? "CUENTA POR COBRAR" : "PAGO CONFIRMADO"}
                </span>
                <h3 id="billing-detail-title">
                  {plan?.label || (bill ? caption(bill) : payment?.reference)}
                </h3>
              </div>
              <button disabled={busy} aria-label="Cerrar detalle" onClick={close}>
                <X size={19} />
              </button>
            </header>
            {plan ? (
              <div className={s.detail}>
                <span className={s.badge}>{recurringStateLabel(plan.state)}</span>
                <div className={s.hero}>
                  {money(plan.amount, plan.currency)}
                  <small>por mes</small>
                </div>
                <dl>
                  <div>
                    <dt>Próximo cobro</dt>
                    <dd>{plan.nextDate ? civil(plan.nextDate) : "Sin fecha activada"}</dd>
                  </div>
                  <div>
                    <dt>Cobertura confirmada</dt>
                    <dd>{plan.paidThrough ? civil(plan.paidThrough) : "Sin período acreditado"}</dd>
                  </div>
                  <div>
                    <dt>Modalidad</dt>
                    <dd>
                      {plan.managedBy === "FLOW"
                        ? "Suscripción Flow"
                        : plan.managedBy === "MANUAL"
                          ? "Calendario administrado"
                          : "Mensualidad asignada"}
                    </dd>
                  </div>
                </dl>
                {plan.state === "ASSIGNED" ? (
                  <p className={s.note}>
                    La mensualidad está asignada a tu empresa. Su calendario aún no está activo; no
                    se programan cargos automáticos hasta completar la activación.
                  </p>
                ) : null}
                <h4>Cobros de esta mensualidad</h4>
                {data.invoices
                  .filter((i) => i.quoteId === plan.quoteId)
                  .map((i) => (
                    <button
                      className={s.related}
                      key={i.id}
                      onClick={() => {
                        close();
                        openInvoice(i.id);
                      }}
                    >
                      <span>
                        {caption(i)}
                        <small>{i.status}</small>
                      </span>
                      <strong>{money(i.balance, i.currency)}</strong>
                      <ArrowRight size={14} />
                    </button>
                  ))}
                {!data.invoices.some((i) => i.quoteId === plan.quoteId) ? (
                  <p className={s.note}>No tiene cobros emitidos pendientes de revisión.</p>
                ) : null}
                {data.quotes.some((q) => q.id === plan.quoteId) ? (
                  <button
                    className={s.secondary}
                    onClick={() => {
                      const id = plan.quoteId;
                      close();
                      onQuote(id);
                    }}
                  >
                    <FileText size={15} /> Ver cotización
                  </button>
                ) : null}
                <button
                  className={s.secondary}
                  onClick={() => {
                    close();
                    onHelp();
                  }}
                >
                  Solicitar cambio del plan <ArrowRight size={15} />
                </button>
                {plan.state === "ACTIVE" && plan.managedBy === "FLOW" ? (
                  <button className={s.cancelButton} onClick={() => setCancelling(true)}>
                    Cancelar suscripción
                  </button>
                ) : null}
                {cancelling ? (
                  <form
                    className={s.cancelForm}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (busy) return;
                      const form = e.currentTarget;
                      setBusy(true);
                      setMessage("");
                      try {
                        const r = await fetch(`/api/portal/payments/recurring/${plan.quoteId}`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify(
                            challenge
                              ? {
                                  action: "cancel",
                                  challengeId: challenge,
                                  code: new FormData(form).get("code"),
                                }
                              : { action: "send-code" },
                          ),
                        });
                        const b = await r.json();
                        if (!r.ok) throw Error(b.error || "No se pudo completar la solicitud.");
                        if (b.challengeId) {
                          setChallenge(b.challengeId);
                          setMessage("Código enviado a tu correo.");
                        } else {
                          close();
                          router.refresh();
                        }
                      } catch (e) {
                        setMessage(
                          e instanceof Error ? e.message : "No se pudo completar la solicitud.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <p>La cancelación conserva la cobertura efectivamente pagada.</p>
                    {challenge ? (
                      <label>
                        Código recibido
                        <input
                          required
                          name="code"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                        />
                      </label>
                    ) : null}
                    <button className={s.primary} disabled={busy}>
                      {busy
                        ? "Procesando…"
                        : challenge
                          ? "Confirmar cancelación"
                          : "Enviar código de confirmación"}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : bill ? (
              <div className={s.detail}>
                <span className={s.badge}>{bill.status}</span>
                <div className={s.hero}>
                  {money(bill.balance, bill.currency)}
                  <small>saldo pendiente</small>
                </div>
                <dl>
                  <div>
                    <dt>Total del cobro</dt>
                    <dd>{money(bill.total, bill.currency)}</dd>
                  </div>
                  <div>
                    <dt>Importe cubierto</dt>
                    <dd>{money(Math.max(0, bill.total - bill.balance), bill.currency)}</dd>
                  </div>
                  <div>
                    <dt>Vencimiento</dt>
                    <dd>{bill.due ? civil(bill.due) : "Sin vencimiento definido"}</dd>
                  </div>
                </dl>
                <h4>Pagos aplicados</h4>
                {data.payments
                  .filter((p) => p.allocations.some((a) => a.receivableId === bill.id))
                  .map((p) => (
                    <button
                      key={`${p.source}:${p.id}`}
                      className={s.related}
                      onClick={() => {
                        setBillId(null);
                        setPayment(p);
                      }}
                    >
                      <span>
                        {p.reference}
                        <small>{civil(p.date)}</small>
                      </span>
                      <strong>
                        {money(
                          p.allocations
                            .filter((a) => a.receivableId === bill.id)
                            .reduce((n, a) => n + a.amount, 0),
                        )}
                      </strong>
                      <ArrowRight size={14} />
                    </button>
                  ))}
                {!data.payments.some((p) =>
                  p.allocations.some((a) => a.receivableId === bill.id),
                ) ? (
                  <p className={s.note}>
                    No hay aplicaciones de pagos disponibles para este cobro.
                  </p>
                ) : null}
                {data.quotes.some((q) => q.id === bill.quoteId) ? (
                  <button
                    className={s.secondary}
                    onClick={() => {
                      const id = bill.quoteId!;
                      close();
                      onQuote(id);
                    }}
                  >
                    Ver cotización de origen <ArrowRight size={14} />
                  </button>
                ) : null}
                {bill.balance > 0 && data.quotes.some((q) => q.id === bill.quoteId && q.payable) ? (
                  <button
                    className={s.primary}
                    onClick={() => {
                      const id = bill.id;
                      close();
                      onPay(id);
                    }}
                  >
                    <CreditCard size={15} /> Revisar opciones de pago
                  </button>
                ) : bill.balance > 0 ? (
                  <button
                    className={s.secondary}
                    onClick={() => {
                      close();
                      onHelp();
                    }}
                  >
                    Consultar opciones de pago
                  </button>
                ) : null}
              </div>
            ) : payment ? (
              <div className={s.detail}>
                <span className={s.badge}>Confirmado</span>
                <div className={s.hero}>{money(payment.amount)}</div>
                <dl>
                  <div>
                    <dt>Fecha de recepción</dt>
                    <dd>{civil(payment.date)}</dd>
                  </div>
                  <div>
                    <dt>Registro</dt>
                    <dd>
                      {payment.source === "commercial"
                        ? "Cuenta comercial"
                        : "Documentos contables"}
                    </dd>
                  </div>
                </dl>
                <h4>Cobros vinculados</h4>
                {payment.allocations.map((a) => {
                  const i = data.invoices.find((i) => i.id === a.receivableId);
                  return i ? (
                    <button
                      key={a.receivableId}
                      className={s.related}
                      onClick={() => {
                        close();
                        openInvoice(i.id);
                      }}
                    >
                      <span>
                        {caption(i)}
                        <small>Abono aplicado</small>
                      </span>
                      <strong>{money(a.amount)}</strong>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <p className={s.note} key={a.receivableId}>
                      Abono aplicado de {money(a.amount)}. Su cobro ya no está en el listado
                      vigente.
                    </p>
                  );
                })}
                {!payment.allocations.length ? (
                  <p className={s.note}>
                    El pago está confirmado en su registro de origen. No hay aplicaciones vinculadas
                    disponibles en esta vista.
                  </p>
                ) : null}
                {payment.receipt ? (
                  <a className={s.primary} href={`/api/portal/payments/receipts/${payment.id}`}>
                    <Download size={16} /> Descargar comprobante
                  </a>
                ) : null}
              </div>
            ) : null}
            {message ? (
              <p className={s.note} role="status">
                {message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

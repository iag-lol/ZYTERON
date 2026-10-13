"use client";
import { useState } from "react";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { money, civil } from "./production-model";
import { paymentCivilDate, projectMonthlyPayments } from "@/lib/payments/payment-projection";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Globe2,
  Info,
  LockKeyhole,
  Repeat2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  const value = await r.json();
  if (!r.ok) throw new Error(value.error || "No se pudo completar la operación.");
  return value;
}
export function FlowCheckoutPreview({
  document,
  amount,
  quote,
}: {
  document: string;
  amount: string;
  quote?: PortalData["quotes"][number];
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [challenge, setChallenge] = useState("");
  const monthly = quote?.billingType === "SUBSCRIPTION";
  const payable = quote?.stages.find(
    (s) =>
      s.dueEnabled &&
      s.channel === "FLOW" &&
      ["READY", "REJECTED", "PROCESSING"].includes(s.status),
  );
  return (
    <form
      className="flow-review support-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !quote) return;
        const form = e.currentTarget;
        setBusy(true);
        setError("");
        try {
          if (monthly && !challenge) {
            const b = await post(`/api/portal/payments/recurring/${quote.id}`, {
              action: "send-start-code",
            });
            setChallenge(b.challengeId);
            return;
          }
          const b = await post(
            `/api/portal/payments/quotes/${quote.id}/${monthly ? "subscription/start" : "flow/create"}`,
            {
              acceptTerms: true,
              acceptPrivacy: true,
              ...(monthly ? { challengeId: challenge, code: new FormData(form).get("code") } : {}),
            },
          );
          const target = new URL(b.checkoutUrl || b.redirectUrl);
          if (
            target.protocol !== "https:" ||
            !(target.hostname === "flow.cl" || target.hostname.endsWith(".flow.cl"))
          )
            throw new Error("No se recibió una dirección de pago autorizada.");
          window.location.assign(target.href);
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo conectar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {quote?.stages.some((s) => s.status === "REJECTED") && (
        <div className="info-note" role="alert">
          <Info size={17} />
          El intento fue rechazado. No se registró un abono y el saldo sigue pendiente.
        </div>
      )}
      {quote?.stages.some((s) => s.status === "PROCESSING") && (
        <div className="info-note" role="status">
          <LockKeyhole size={17} />
          El pago está en verificación. La confirmación aparecerá después de validar el cobro
          efectivo.
        </div>
      )}
      <h3>Un paso más cerca de estar al día.</h3>
      <p>Revisa el documento antes de continuar al pago seguro.</p>
      <div className="checkout-document">
        <span>
          <Wallet size={23} />
        </span>
        <div>
          <small>TU DOCUMENTO</small>
          <b>{document}</b>
        </div>
        <strong>
          {payable ? money(payable.amount) : amount}
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
            <small>Continúas en esta misma pestaña.</small>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <b>Recibe la confirmación</b>
            <small>Solo después de verificar el pago efectivo.</small>
          </div>
        </li>
      </ol>
      <label>
        <span>
          <input type="checkbox" required /> Acepto los{" "}
          <a href="/terminos">términos y condiciones</a> y la{" "}
          <a href="/privacidad">política de privacidad</a>
          {monthly ? " y autorizo los cargos mensuales por el importe indicado." : "."}
        </span>
      </label>
      {challenge && (
        <label>
          Código enviado a tu correo
          <input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
        </label>
      )}
      {error && (
        <div className="info-note" role="alert">
          <Info size={17} />
          {error}
        </div>
      )}
      <button className="button primary" disabled={busy || !quote?.payable}>
        <CreditCard size={17} />
        {busy
          ? "Preparando pago…"
          : monthly && !challenge
            ? "Enviar código de autorización"
            : "Continuar al pago seguro"}
      </button>
      <p className="source-note">
        No recibimos datos de tarjeta. Volver del pago no acredita una transacción.
      </p>
    </form>
  );
}
export default function BillingHub({ data, onHelp }: { data: PortalData; onHelp: () => void }) {
  const reference = paymentCivilDate(data.asOf)!;
  const [tab, setTab] = useState<"subscription" | "calendar">("subscription"),
    [year, setYear] = useState(Number(reference.slice(0, 4))),
    [view, setView] = useState<"year" | "month">("year"),
    [month, setMonth] = useState(Number(reference.slice(5, 7))),
    [cancel, setCancel] = useState<PortalData["quotes"][number] | null>(null),
    [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const subscriptions = data.quotes.flatMap((q) => (q.subscription ? [q.subscription] : []));
  const rows = [
    ...data.payments.flatMap((payment) => {
      const date = paymentCivilDate(payment.date);
      return date && date.slice(0, 4) === String(year)
        ? [
            {
              id: payment.id,
              label: "Pago confirmado",
              date,
              amount: payment.amount,
              kind: "confirmed",
              receipt: payment.receipt,
            },
          ]
        : [];
    }),
    ...subscriptions
      .flatMap((s) => projectMonthlyPayments(s, year))
      .map((p, i) => ({ ...p, id: p.quoteId + ":" + i, kind: "forecast", receipt: false })),
  ];
  const visible = rows.filter((r) => view === "year" || Number(r.date.slice(5, 7)) === month);
  return (
    <section className="billing-hub">
      <div className="billing-hub-title">
        <div>
          <p className="eyebrow">TU RELACIÓN CON ZYTERON, A LARGO PLAZO</p>
          <h2>Mes a mes, todo claro.</h2>
        </div>
        <span className="billing-demo-badge">
          <span />
          Calendario de tu cuenta
        </span>
      </div>
      <div className="billing-hub-tabs">
        <button
          aria-pressed={tab === "subscription"}
          className={tab === "subscription" ? "selected" : ""}
          onClick={() => setTab("subscription")}
        >
          <Repeat2 size={16} />
          Suscripciones
        </button>
        <button
          aria-pressed={tab === "calendar"}
          className={tab === "calendar" ? "selected" : ""}
          onClick={() => setTab("calendar")}
        >
          <CalendarDays size={16} />
          Calendario de pagos
        </button>
      </div>
      {tab === "subscription" ? (
        <div className="subscription-layout">
          <div>
            {subscriptions.map((s) => (
              <article className="subscription-card" key={s.quoteId}>
                <div className="subscription-top">
                  <span className="service-icon green">
                    <Globe2 size={25} />
                  </span>
                  <span className="badge neutral">{s.state}</span>
                </div>
                <span className="eyebrow">SERVICIO MENSUAL</span>
                <h3>{s.label}</h3>
                <div className="subscription-price">
                  {money(s.amount)}
                  <span>CLP / mes</span>
                </div>
                <dl>
                  <div>
                    <dt>Cobertura de pagos confirmados</dt>
                    <dd>{civil(s.paidThrough)}</dd>
                  </div>
                  <div>
                    <dt>Próximo cobro previsto</dt>
                    <dd>{civil(s.nextDate)}</dd>
                  </div>
                </dl>
                <div className="subscription-actions">
                  <button className="button secondary" onClick={() => setTab("calendar")}>
                    Ver calendario <ArrowUpRight size={15} />
                  </button>
                  <button
                    className="text-button cancel-link"
                    disabled={s.state !== "ACTIVE"}
                    onClick={() => {
                      setCancel(data.quotes.find((q) => q.id === s.quoteId) || null);
                      setChallenge("");
                      setMessage("");
                    }}
                  >
                    Cancelar suscripción
                  </button>
                </div>
              </article>
            ))}
            {!subscriptions.length && (
              <div className="empty-state">
                <Repeat2 size={32} />
                <h3>Aún no hay suscripciones vinculadas</h3>
                <p>Los planes mensuales acordados aparecerán aquí.</p>
              </div>
            )}
          </div>
          <aside className="subscription-guide">
            <span className="service-icon green">
              <ShieldCheck size={26} />
            </span>
            <h3>El control también está de tu lado.</h3>
            <p>
              El cobro recurrente requiere que aceptes las condiciones y autorices tu medio de pago.
            </p>
            <div>
              <span>
                <Check size={16} />
                Un importe acordado
              </span>
              <span>
                <Check size={16} />
                Confirmación de cada pago efectivo
              </span>
              <span>
                <Check size={16} />
                Cancelación con aviso a Zyteron
              </span>
            </div>
            <div className="info-note">
              <Info size={17} />
              La mantención continúa hasta terminar el período efectivamente pagado. La cancelación
              se verifica antes de programar el modo mantención.
            </div>
            <button className="text-button" onClick={onHelp}>
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
                <ChevronLeft size={19} />
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
                aria-pressed={view === "year"}
                className={view === "year" ? "selected" : ""}
                onClick={() => setView("year")}
              >
                Año
              </button>
              <button
                aria-pressed={view === "month"}
                className={view === "month" ? "selected" : ""}
                onClick={() => setView("month")}
              >
                Mes
              </button>
            </div>
            {view === "month" && (
              <label className="calendar-month-select">
                <span className="sr-only">Mes del calendario</span>
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
              </label>
            )}
          </div>
          <div className="calendar-finance-summary">
            <div>
              <span>Pagos del período</span>
              <strong>{rows.filter((r) => r.kind === "confirmed").length}</strong>
            </div>
            <div>
              <span>Próximos pagos estimados · CLP</span>
              <strong>
                {money(
                  rows.filter((r) => r.kind === "forecast").reduce((sum, r) => sum + r.amount, 0),
                )}
              </strong>
              <small>Proyección, no saldo exigible</small>
            </div>
            <div>
              <span>Planes vigentes</span>
              <b>{subscriptions.filter((s) => s.state === "ACTIVE").length}</b>
              <small>Condiciones acordadas y cancelaciones verificadas</small>
            </div>
          </div>
          <div className="projection-legend">
            <span>
              <i className="paid" />
              Confirmado
            </span>
            <span>
              <i className="forecast" />
              Proyectado
            </span>
          </div>
          <div className={`projection-grid ${view === "month" ? "month-view" : ""}`}>
            {visible.map((r) => (
              <article className={`projection-month ${r.kind}`} key={r.id}>
                <div>
                  <span>{civil(r.date + "T12:00:00Z")}</span>
                  {r.kind === "confirmed" ? <Check size={15} /> : <CalendarDays size={15} />}
                </div>
                <strong>{money(r.amount)}</strong>
                <p>{r.label}</p>
                <small>{r.kind === "forecast" ? "Proyección" : "Pago efectivo"}</small>
                {r.receipt && (
                  <a href={`/api/portal/payments/receipts/${r.id}`}>
                    <Download size={15} /> Comprobante PDF
                  </a>
                )}
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="empty-state">
              <CalendarDays size={32} />
              <h3>Sin cobros para este período</h3>
              <p>No hay pagos confirmados ni proyecciones de planes activos.</p>
            </div>
          )}
          <p className="source-note">
            Una proyección no es una deuda, factura emitida ni autorización de cobro.
          </p>
        </div>
      )}
      {cancel && (
        <form
          className="inline-confirm support-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const form = e.currentTarget;
            setBusy(true);
            try {
              const b = await post(
                `/api/portal/payments/recurring/${cancel.id}`,
                challenge
                  ? {
                      action: "cancel",
                      challengeId: challenge,
                      code: new FormData(form).get("code"),
                    }
                  : { action: "send-code" },
              );
              if (b.challengeId) {
                setChallenge(b.challengeId);
                setMessage("Código enviado a tu correo.");
              } else {
                setMessage(b.message);
                setCancel(null);
                window.location.reload();
              }
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "No se pudo conectar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <h3>¿Quieres cancelar la suscripción?</h3>
            <p>
              Zyteron recibirá un aviso. Conservas la cobertura de pagos confirmados hasta{" "}
              {civil(cancel.subscription?.paidThrough || null)}.
            </p>
            {challenge && (
              <label>
                Código recibido
                <input name="code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} />
              </label>
            )}
          </div>
          <div>
            <button type="button" className="button secondary" onClick={() => setCancel(null)}>
              Conservar plan
            </button>
            <button className="button primary" disabled={busy}>
              {challenge ? "Confirmar cancelación" : "Enviar código"}
            </button>
          </div>
        </form>
      )}
      {message && (
        <div role="status" className="info-note">
          <LockKeyhole size={17} />
          {message}
        </div>
      )}
      <section className="panel">
        <h3>Pagos confirmados</h3>
        {data.payments.map((p) => (
          <div className="document-row" key={p.id}>
            <span className="row-text">
              <b>{money(p.amount)}</b>
              <small>{civil(p.date)}</small>
            </span>
            {p.receipt ? (
              <a className="text-button" href={`/api/portal/payments/receipts/${p.id}`}>
                <Download size={16} />
                Comprobante PDF
              </a>
            ) : (
              <span className="badge neutral">Pago registrado</span>
            )}
          </div>
        ))}
        {!data.payments.length && <p className="subtle">Aún no hay pagos confirmados.</p>}
      </section>
    </section>
  );
}

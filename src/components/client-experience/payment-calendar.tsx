"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ShieldCheck,
  Repeat2,
  X,
  Check,
  LoaderCircle,
} from "lucide-react";
import {
  projectMonthlyPayments,
  type RecurringProjection,
} from "@/lib/payments/payment-projection";
import styles from "./payment-calendar.module.css";
type Payment = { id: string; amount: number; date: string; receipt: boolean };
const money = (v: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
export function PaymentCalendar({
  subscriptions,
  payments,
  currentYear,
  currentMonth,
}: {
  subscriptions: RecurringProjection[];
  payments: Payment[];
  currentYear: number;
  currentMonth: number;
}) {
  const [year, setYear] = useState(currentYear),
    [mode, setMode] = useState<"month" | "year">("month"),
    [month, setMonth] = useState(currentMonth),
    [cancel, setCancel] = useState<RecurringProjection | null>(null),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!cancel) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setCancel(null);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = dialog?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input, select, a[href]",
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [cancel, busy]);
  const projected = useMemo(
    () => subscriptions.flatMap((s) => projectMonthlyPayments(s, year)),
    [subscriptions, year],
  );
  const actual = payments.filter((p) => p.date.slice(0, 4) === String(year));
  async function cancelAction() {
    if (!cancel) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(`/api/portal/payments/recurring/${cancel.quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          challenge ? { action: "cancel", challengeId: challenge, code } : { action: "send-code" },
        ),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "No se pudo completar la solicitud.");
      if (b.challengeId) {
        setChallenge(b.challengeId);
        setMessage("Código enviado a tu correo. Expira en cinco minutos.");
      } else {
        setMessage(b.message);
        window.location.reload();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No pudimos completar la solicitud.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.page}>
      <div className={styles.title}>
        <div>
          <p className={styles.eyebrow}>TU TRANQUILIDAD, MES A MES</p>
          <h1>Pagos y suscripciones</h1>
          <p>Planifica tus próximos pagos y conserva cada comprobante.</p>
        </div>
        <span className={styles.secure}>
          <ShieldCheck size={17} />
          Área privada
        </span>
      </div>
      <div className={styles.metrics}>
        <div>
          <span>Recibido y confirmado · {year}</span>
          <strong>{money(actual.reduce((n, p) => n + p.amount, 0))}</strong>
          <small>{actual.length} pagos registrados</small>
        </div>
        <div>
          <span>Proyección anual · {year}</span>
          <strong>{money(projected.reduce((n, p) => n + p.amount, 0))}</strong>
          <small>Estimación de suscripciones activas</small>
        </div>
        <div>
          <span>Suscripciones activas</span>
          <strong>
            {subscriptions
              .filter((s) => s.state === "ACTIVE")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <small>El alta de una tarjeta no acredita pagos</small>
        </div>
      </div>
      <section className={styles.calendar}>
        <div className={styles.calendarHeader}>
          <h2>
            <CalendarDays size={20} />
            Tu calendario
          </h2>
          <div className={styles.controls}>
            <button
              aria-label="Año anterior"
              disabled={year <= currentYear - 5}
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <strong>{year}</strong>
            <button
              aria-label="Año siguiente"
              disabled={year >= currentYear + 10}
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight size={18} />
            </button>
            <div className={styles.segment}>
              <button aria-pressed={mode === "month"} onClick={() => setMode("month")}>
                Mes
              </button>
              <button aria-pressed={mode === "year"} onClick={() => setMode("year")}>
                Año
              </button>
            </div>
          </div>
        </div>
        <p className={styles.explainer}>
          Los pagos proyectados son una estimación; el importe recibido sólo cambia con una
          confirmación efectiva.
        </p>
        {mode === "month" ? (
          <label className={styles.month}>
            Mes
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {months.map((m, i) => (
                <option value={i + 1} key={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className={mode === "year" ? styles.yearGrid : styles.monthGrid}>
          {months.map((name, i) => {
            if (mode === "month" && month !== i + 1) return null;
            const prefix = `${year}-${String(i + 1).padStart(2, "0")}`,
              items = projected.filter((p) => p.date.startsWith(prefix)),
              paid = actual.filter((p) => p.date.startsWith(prefix));
            return (
              <article key={name} className={styles.monthCard}>
                <header>
                  <h3>{name}</h3>
                  <span>{money(items.reduce((n, p) => n + p.amount, 0))}</span>
                </header>
                {items.map((p) => (
                  <div className={styles.event} key={p.quoteId}>
                    <time>{p.date.slice(8)}</time>
                    <div>
                      <strong>{p.label}</strong>
                      <small>Proyectado · {money(p.amount)}</small>
                    </div>
                  </div>
                ))}
                {paid.map((p) => (
                  <div className={styles.paid} key={p.id}>
                    <Check size={16} />
                    <div>
                      <strong>{money(p.amount)}</strong>
                      <small>
                        Confirmado · {p.date.slice(8, 10)}/{p.date.slice(5, 7)}
                      </small>
                    </div>
                    {p.receipt ? (
                      <a
                        href={`/api/portal/payments/receipts/${p.id}`}
                        aria-label="Descargar comprobante"
                      >
                        <Download size={17} />
                      </a>
                    ) : null}
                  </div>
                ))}
                {!items.length && !paid.length ? (
                  <p className={styles.empty}>Sin movimientos registrados para este mes.</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
      <section className={styles.subscriptions}>
        <div>
          <p className={styles.eyebrow}>TÚ TIENES EL CONTROL</p>
          <h2>Tus suscripciones</h2>
        </div>
        {!subscriptions.length ? (
          <p className={styles.empty}>
            Aún no tienes una suscripción mensual vinculada a tu cuenta.
          </p>
        ) : (
          subscriptions.map((s) => (
            <article key={s.quoteId}>
              <div className={styles.icon}>
                <Repeat2 size={22} />
              </div>
              <div className={styles.subscriptionInfo}>
                <h3>{s.label}</h3>
                <p>
                  {money(s.amount)} / mes ·{" "}
                  {s.state === "ACTIVE"
                    ? "Activa"
                    : s.state === "CANCEL_REQUESTED"
                      ? "Cancelación en verificación"
                      : s.state === "CANCEL_SCHEDULED"
                        ? "Cancelación programada"
                        : s.state === "CANCELLED"
                          ? "Cancelada"
                          : "Pendiente"}
                </p>
                {s.paidThrough ? (
                  <small>
                    Período pagado hasta{" "}
                    {new Date(new Date(s.paidThrough).getTime() - 1).toLocaleDateString("es-CL", {
                      timeZone: "America/Santiago",
                    })}
                    . Tu cobertura se conserva hasta esa fecha.
                  </small>
                ) : (
                  <small>No existe un período pagado confirmado.</small>
                )}
              </div>
              {s.state === "ACTIVE" ? (
                <button
                  className={styles.cancel}
                  onClick={() => {
                    setCancel(s);
                    setChallenge("");
                    setCode("");
                    setMessage("");
                  }}
                >
                  Cancelar suscripción
                </button>
              ) : null}
            </article>
          ))
        )}
      </section>
      {cancel ? (
        <div className={styles.overlay}>
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            className={styles.dialog}
          >
            <button
              className={styles.close}
              aria-label="Cerrar cancelación"
              disabled={busy}
              onClick={() => setCancel(null)}
            >
              <X />
            </button>
            <p className={styles.eyebrow}>CONFIRMACIÓN DE SEGURIDAD</p>
            <h2 id="cancel-title">Cancelar {cancel.label}</h2>
            <p>
              Se detendrán las renovaciones. Conservas el período efectivamente pagado; si incluye
              mantención web, al terminar el período pagado el sitio asociado pasará a modo
              mantención. Nuestro equipo recibirá un aviso.
            </p>
            {challenge ? (
              <label>
                Código enviado a tu correo
                <input
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
            ) : null}
            {message ? (
              <p role="status" className={styles.message}>
                {message}
              </p>
            ) : null}
            <button
              disabled={busy || Boolean(challenge && code.length !== 6)}
              onClick={() => void cancelAction()}
              className={styles.primary}
            >
              {busy ? <LoaderCircle size={18} className={styles.spin} /> : null}
              {challenge ? "Confirmar cancelación" : "Enviar código de seguridad"}
            </button>
            <button disabled={busy} className={styles.back} onClick={() => setCancel(null)}>
              Conservar mi suscripción
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

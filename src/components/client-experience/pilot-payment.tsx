"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CreditCard,
  Download,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import styles from "./pilot-payment.module.css";
type Payment = {
  reference: string;
  amount: number;
  currency: string;
  state: string;
  verifiedAt: string | null;
  paidAt: string | null;
  emailStatus: string;
  receiptAvailable: boolean;
  canPay: boolean;
};
const endpoint = "/api/client-payment-pilot/";
export function PilotPayment() {
  const [payment, setPayment] = useState<Payment | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const opened = useRef<Promise<void> | null>(null);
  const status = useCallback(async () => {
    const response = await fetch(endpoint + "status", { cache: "no-store" });
    if (!response.ok) throw new Error("Necesitas un acceso válido para consultar este pago.");
    setPayment(await response.json());
  }, []);
  useEffect(() => {
    if (!opened.current)
      opened.current = (async () => {
        const access = new URLSearchParams(window.location.hash.slice(1)).get("access");
        window.history.replaceState(null, "", window.location.pathname);
        if (access) {
          const response = await fetch(endpoint + "open", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ access }),
          });
          if (!response.ok) throw new Error("El acceso a este pago expiró o no está habilitado.");
        }
        await status();
      })();
    void opened.current.catch((e) => setError(e.message)).finally(() => setBusy(false));
  }, [status]);
  const update = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint + "refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok)
        throw new Error("Seguimos verificando la transacción. Puedes consultar nuevamente.");
      setPayment(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos consultar el pago.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (payment?.state !== "PENDING") return;
    const timer = setInterval(() => {
      void update();
    }, 10000);
    return () => clearInterval(timer);
  }, [payment?.state, update]);
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint + "start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      });
      if (!response.ok)
        throw new Error(
          "Necesitamos revisar este intento antes de continuarlo. No se repetirá un cobro automáticamente.",
        );
      const result = await response.json();
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== "https:" || url.hostname !== "sandbox.flow.cl")
        throw new Error("El enlace de pago necesita revisión.");
      window.location.assign(url.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "El pago no está disponible.");
      setBusy(false);
    }
  }
  const confirmed = payment?.state === "CONFIRMED",
    rejected = payment?.state === "REJECTED",
    cancelled = payment?.state === "CANCELLED";
  const title = confirmed
    ? "Pago de prueba confirmado"
    : rejected
      ? "El pago fue rechazado"
      : cancelled
        ? "El intento fue cancelado"
        : payment?.state === "PENDING"
          ? "Estamos verificando tu pago"
          : payment
            ? "Un paso más cerca de estar al día."
            : "Tu pago, en un lugar seguro.";
  return (
    <main className={styles.surface}>
      <div className={styles.top}>
        <a href="/clientes" className={styles.brand}>
          zyteron<span>.</span>
        </a>
        <span>
          <ShieldCheck size={15} />
          Tu espacio seguro
        </span>
      </div>
      <section className={styles.card} aria-busy={busy}>
        <div className={styles.eyebrow}>
          PAGO DE PRUEBA <span>Sin cargos reales</span>
        </div>
        <div className={confirmed ? styles.success : styles.symbol}>
          {confirmed ? <Check /> : rejected || cancelled ? <X /> : <CreditCard />}
        </div>
        <h1>{title}</h1>
        <p className={styles.intro}>
          {confirmed
            ? "La pasarela confirmó el pago y verificamos su referencia, moneda e importe."
            : rejected
              ? "El medio de pago rechazó la transacción. No se registró una compra ni un comprobante."
              : cancelled
                ? "No se completó el pago. No se registró una compra ni un comprobante."
                : "Revisa el importe antes de continuar. La confirmación depende del pago efectivo."}
        </p>
        {payment && (
          <div className={styles.summary}>
            <div>
              <small>INTEGRACIÓN ZYTERON</small>
              <strong>Prueba controlada #{payment.reference}</strong>
            </div>
            <div>
              <strong>
                {new Intl.NumberFormat("es-CL", {
                  style: "currency",
                  currency: "CLP",
                  maximumFractionDigits: 0,
                }).format(payment.amount)}
              </strong>
              <small>CLP</small>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {busy && (
          <p role="status" className={styles.loading}>
            <LoaderCircle className={styles.spin} size={18} />
            Verificando tu acceso...
          </p>
        )}
        {payment?.canPay && (
          <button className={styles.primary} disabled={busy} onClick={() => void pay()}>
            Continuar al pago <ArrowUpRight size={18} />
          </button>
        )}
        {payment?.state === "PENDING" && (
          <button className={styles.secondary} disabled={busy} onClick={() => void update()}>
            <RefreshCw size={17} />
            Consultar estado
          </button>
        )}
        {payment?.receiptAvailable && (
          <a className={styles.primary} href={endpoint + "receipt"}>
            <Download size={18} />
            Descargar comprobante de prueba
          </a>
        )}
        {confirmed && (
          <p className={styles.mail}>
            {payment.emailStatus === "ACCEPTED"
              ? "El proveedor de correo aceptó el envío del comprobante."
              : payment.emailStatus === "REVIEW_REQUIRED"
                ? "El envío del correo requiere revisión. Puedes descargar el PDF."
                : "Estamos preparando el envío de tu comprobante."}
          </p>
        )}
        <div className={styles.safe}>
          <LockKeyhole size={17} />
          <p>
            Esta prueba no crea ventas, deudas ni documentos tributarios. No recibimos datos de tu
            tarjeta.
          </p>
        </div>
      </section>
      <footer>
        Hecho para avanzar contigo. <a href="/clientes">Volver a tu espacio</a>
      </footer>
    </main>
  );
}

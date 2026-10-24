"use client";
import { useState } from "react";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { money } from "./production-model";
import { Check, CreditCard, Info, LockKeyhole, Wallet } from "lucide-react";
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
export { default } from "./billing-workspace";

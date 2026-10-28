"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { money } from "./production-model";
import { ZYTERON_COMPANY } from "@/lib/company";
import { invoicePaymentOption } from "@/lib/payments/invoice-payment-option";
import {
  Check,
  CreditCard,
  Info,
  LockKeyhole,
  Wallet,
  ArrowRight,
  Landmark,
  Copy,
} from "lucide-react";
import paymentStyles from "./payment-options.module.css";
async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  const value = await r.json();
  if (!r.ok)
    throw Object.assign(new Error(value.error || "No se pudo completar la operación."), {
      status: r.status,
    });
  return value;
}
export function FlowCheckoutPreview({
  document,
  amount,
  quote,
  invoice,
}: {
  document: string;
  amount: string;
  quote?: PortalData["quotes"][number];
  invoice?: PortalData["invoices"][number];
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
  const matchesInvoice = !invoice || invoicePaymentOption(invoice, quote) === "FLOW";
  return (
    <form
      className="flow-review support-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !quote || !matchesInvoice || !payable) return;
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
              ...(!monthly
                ? {
                    expectedAmount: payable.amount,
                    ...(invoice ? { receivableId: invoice.id } : {}),
                  }
                : {}),
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
          {invoice
            ? money(invoice.balance, invoice.currency)
            : payable
              ? money(payable.amount)
              : amount}
          <small>CLP</small>
        </strong>
      </div>
      {!invoice && !monthly && payable && payable.amount !== quote?.total && (
        <p className="info-note">
          <Info size={17} />
          Se pagará la etapa {payable.label}. El total de la cotización es{" "}
          {money(quote?.total || 0)}.
        </p>
      )}
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
      <button
        className="button primary"
        disabled={busy || !quote?.payable || !matchesInvoice || !payable}
      >
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

export function InvoicePaymentOptions({
  invoice,
  quote,
  onHelp,
}: {
  invoice: PortalData["invoices"][number];
  quote?: PortalData["quotes"][number];
  onHelp: () => void;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<"card" | "transfer">("card");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState("");
  const option = invoicePaymentOption(invoice, quote);
  const label = [quote?.number, invoice.concept].filter(Boolean).join(" · ");
  const transfer = [
    ["Destinatario", ZYTERON_COMPANY.legalName],
    ["RUT", ZYTERON_COMPANY.rut],
    ["Banco", ZYTERON_COMPANY.transferBank],
    ["Tipo de cuenta", ZYTERON_COMPANY.transferAccountType],
    ["Número de cuenta", ZYTERON_COMPANY.transferAccountNumber],
    ["Correo", ZYTERON_COMPANY.transferAccountEmail],
    ["Referencia", quote?.number || invoice.id],
  ];
  return (
    <div className={paymentStyles.root}>
      <div className={paymentStyles.summary}>
        <span className={paymentStyles.eyebrow}>TU COBRO</span>
        <h3>{label}</h3>
        <strong>{money(invoice.balance, invoice.currency)}</strong>
        <small>
          {option === "SETTLED"
            ? "Este cobro ya está saldado"
            : "Saldo pendiente · " + invoice.currency}
        </small>
        <div>
          <span>Total: {money(invoice.total, invoice.currency)}</span>
          <span>
            Abonado: {money(Math.max(0, invoice.total - invoice.balance), invoice.currency)}
          </span>
        </div>
      </div>
      {option !== "SETTLED" && (
        <>
          <div className={paymentStyles.methods} role="group" aria-label="Elige cómo pagar">
            <button
              type="button"
              aria-pressed={method === "card"}
              onClick={() => {
                setMethod("card");
                setError("");
              }}
            >
              <CreditCard size={23} />
              <span>
                <strong>Tarjeta con Flow</strong>
                <small>Crédito, débito y medios disponibles</small>
              </span>
              {method === "card" && <Check size={17} />}
            </button>
            <button
              type="button"
              aria-pressed={method === "transfer"}
              onClick={() => {
                setMethod("transfer");
                setError("");
              }}
            >
              <Landmark size={23} />
              <span>
                <strong>Transferencia bancaria</strong>
                <small>Datos de la cuenta de Zyteron</small>
              </span>
              {method === "transfer" && <Check size={17} />}
            </button>
          </div>
          {method === "card" ? (
            <div className={paymentStyles.methodDetail}>
              <span className={paymentStyles.eyebrow}>PAGO ÚNICO DEL SALDO</span>
              <h3>Paga con tu tarjeta</h3>
              <p>
                Continúa a Flow para elegir tu medio de pago. El importe corresponde al saldo de
                este cobro.
              </p>
              <div className={paymentStyles.amount}>
                <span>Importe a pagar</span>
                <strong>{money(invoice.balance, invoice.currency)}</strong>
              </div>
              {error && (
                <p className={paymentStyles.error} role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                className="button primary"
                disabled={busy || invoice.currency !== "CLP"}
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  setError("");
                  try {
                    const value = await post(
                      `/api/portal/payments/receivables/${invoice.id}/flow`,
                      { source: invoice.source, expectedAmount: invoice.balance },
                    );
                    if (value.amount !== invoice.balance)
                      throw new Error("El saldo cambió. Actualiza tu cuenta antes de continuar.");
                    const target = new URL(value.checkoutUrl);
                    if (
                      target.protocol !== "https:" ||
                      !["www.flow.cl", "api.flow.cl", "sandbox.flow.cl"].includes(
                        target.hostname,
                      ) ||
                      target.username ||
                      target.password ||
                      target.port
                    )
                      throw new Error("No se recibió un enlace de pago autorizado.");
                    window.location.assign(target.href);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "No pudimos preparar el pago.");
                    if (e && typeof e === "object" && "status" in e && e.status === 409)
                      router.refresh();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Preparando pago…" : "Pagar con Flow"}
                <ArrowRight size={17} />
              </button>
              {invoice.currency !== "CLP" && (
                <p>
                  La pasarela procesa pesos chilenos. Coordina la conversión con administración o
                  utiliza transferencia.
                </p>
              )}
              <p className={paymentStyles.note}>
                <LockKeyhole size={15} />
                Los datos de tu tarjeta se ingresan directamente en Flow. Este pago no activa cargos
                mensuales.
              </p>
            </div>
          ) : (
            <div className={paymentStyles.methodDetail}>
              <span className={paymentStyles.eyebrow}>TRANSFERENCIA BANCARIA</span>
              <h3>Transfiere el saldo pendiente</h3>
              <div className={paymentStyles.amount}>
                <span>Importe a transferir</span>
                <strong>{money(invoice.balance, invoice.currency)}</strong>
              </div>
              <dl>
                {transfer.map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>
                      {value}
                      <button
                        type="button"
                        aria-label={`Copiar ${name.toLowerCase()}`}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(value);
                            setCopied(name);
                          } catch {
                            setCopied("");
                          }
                        }}
                      >
                        {copied === name ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className={paymentStyles.note}>
                <Info size={16} />
                Incluye la referencia del cobro en la transferencia. El saldo se actualiza cuando
                administración verifica y registra el abono.
              </p>
              <button className="button secondary" onClick={onHelp}>
                Informar transferencia o consultar
              </button>
              {copied && <span role="status">{copied} copiado.</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { default } from "./billing-workspace";

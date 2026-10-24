"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SubscriptionControls } from "./subscription-controls";
import { MonthlyPlanControls } from "./monthly-plan";
import { CalendarDays, Save } from "lucide-react";
import type { QuoteBilling } from "@/lib/full-control/quote-register";
import { Drawer, Feedback, KeyValue, Loading } from "@control/components/finance/fx-ui";
import { formatDate } from "@control/lib/date-time";
const money = (n: number, currency: string) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency === "UF" ? "CLF" : currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(n);
type Collection = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  paid: number;
  payments: { amount: number; receivedAt: string }[];
};
export function WebsiteQuoteBillingButton({
  quoteId,
  quoteNumber,
  clientId,
  billing,
  onChanged,
}: {
  quoteId: string;
  quoteNumber: string;
  clientId?: string | null;
  currency: string;
  billing: QuoteBilling;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [frequency, setFrequency] = useState(billing.frequency || "ONE_TIME"),
    [rows, setRows] = useState<Collection[] | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    setRows(null);
    setError("");
    setFrequency(billing.frequency || "ONE_TIME");
    fetch(`/api/portal/admin/quotes/${quoteId}/billing`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        return data.rows as Collection[];
      })
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "No se pudo cargar el detalle.");
      });
    return () => {
      active = false;
    };
  }, [open, quoteId, billing.frequency, billing.balance, billing.paid]);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/portal/admin/quotes/${quoteId}/billing`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ frequency }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      await onChanged();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className="fx-btn small" type="button" onClick={() => setOpen(true)}>
        <CalendarDays size={13} />
        Cobros y modalidad
      </button>
      {open
        ? createPortal(
            <div className="zy-full-control">
              <Drawer
                open
                wide
                title={`Cobros · ${quoteNumber}`}
                subtitle="Pagos confirmados y asignados a esta cotización."
                onClose={() => {
                  if (!busy) setOpen(false);
                }}
              >
                <div className="fx-stack">
                  <KeyValue
                    items={[
                      [
                        "Modalidad",
                        billing.frequency === "MONTHLY" ? "Mensual" : "Fijo · pago único",
                      ],
                      ["Pagado confirmado", money(billing.paid, billing.currency)],
                      [
                        billing.frequency === "MONTHLY"
                          ? "Saldo de períodos registrados"
                          : "Saldo de la cotización",
                        money(billing.balance, billing.currency),
                      ],
                      ["Anticipo / períodos adelantados", money(billing.advance, billing.currency)],
                    ]}
                  />
                  <Feedback error={error} />
                  {billing.editable ? (
                    <div className="quoteBillingEdit">
                      <label>
                        Modalidad de cobro
                        <select
                          value={frequency}
                          disabled={busy}
                          onChange={(e) => setFrequency(e.target.value as "MONTHLY" | "ONE_TIME")}
                        >
                          <option value="ONE_TIME">Fijo · pago único</option>
                          <option value="MONTHLY">Mensual</option>
                        </select>
                      </label>
                      <p>
                        Define la propuesta. No activa una suscripción ni registra un pago; la
                        autorización del cliente se realiza en su portal.
                      </p>
                      <button
                        className="fx-btn primary"
                        disabled={busy || frequency === billing.frequency}
                        onClick={() => void save()}
                      >
                        <Save size={14} />
                        {busy ? "Guardando…" : "Guardar modalidad"}
                      </button>
                    </div>
                  ) : (
                    <p className="fx-hint">
                      La modalidad forma parte de la propuesta. Si ya fue enviada, aceptada o tiene
                      cobros, prepara una nueva versión para cambiarla y conservar el historial.
                    </p>
                  )}
                  {billing.frequency === "MONTHLY" && clientId ? (
                    <SubscriptionControls
                      quoteId={quoteId}
                      clientId={clientId}
                      onChanged={onChanged}
                    />
                  ) : null}
                  {billing.frequency === "MONTHLY" ? (
                    <MonthlyPlanControls quoteId={quoteId} onChanged={onChanged} />
                  ) : null}
                  {billing.paidThrough ? (
                    <p className="fx-hint">
                      Período confirmado hasta el {formatDate(billing.paidThrough)}.
                    </p>
                  ) : null}
                  {!rows && !error ? (
                    <Loading text="Consultando pagos confirmados…" />
                  ) : rows?.length ? (
                    <div className="quoteCollections">
                      {rows.map((row) => (
                        <article key={row.id}>
                          <h3>{row.description}</h3>
                          <p>Vencimiento {formatDate(row.dueDate)}</p>
                          <strong>
                            {money(row.paid, row.currency)} pagados de{" "}
                            {money(row.amount, row.currency)}
                          </strong>
                          {row.payments.map((p, index) => (
                            <p key={index}>
                              Confirmado el {formatDate(p.receivedAt)} ·{" "}
                              {money(p.amount, row.currency)}
                            </p>
                          ))}
                        </article>
                      ))}
                    </div>
                  ) : rows ? (
                    <p className="fx-hint">
                      No hay cuentas por cobrar ni pagos confirmados asignados a esta cotización. La
                      aceptación no acredita un pago.
                    </p>
                  ) : null}
                  <p className="fx-hint">
                    Los créditos sin asignar del cliente se consultan en Finanzas → Pagos; no
                    reducen el saldo de esta cotización.
                  </p>
                </div>
              </Drawer>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

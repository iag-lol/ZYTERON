import { ArrowRight, CreditCard } from "lucide-react";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { pendingBilling } from "@/lib/client-experience/pending-billing";
import { civil, money } from "./production-model";
import s from "./home-billing.module.css";

export default function HomeBilling({
  data,
  onInvoice,
  onPayments,
}: {
  data: PortalData;
  onInvoice: (id: string) => void;
  onPayments: () => void;
}) {
  const { pending, totals } = pendingBilling(data.invoices);
  if (!pending.length) return null;
  return (
    <section className={s.panel} aria-labelledby="home-pending-title">
      <div className={s.summary}>
        <span className={s.icon}>
          <CreditCard size={22} aria-hidden="true" />
        </span>
        <div>
          <p className={s.eyebrow}>PAGOS PENDIENTES</p>
          <h2 id="home-pending-title">
            {pending.length === 1
              ? "Tienes un cobro pendiente"
              : `Tienes ${pending.length} cobros pendientes`}
          </h2>
          <p>Revisa el saldo y el detalle de tus cobros.</p>
        </div>
        <div className={s.totals}>
          {totals.map((group) => (
            <div key={group.currency}>
              <strong>{money(group.balance, group.currency)}</strong>
              <span>Saldo pendiente · {group.currency}</span>
              {group.overdue > 0 && <small>{money(group.overdue, group.currency)} vencidos</small>}
            </div>
          ))}
        </div>
      </div>
      <div className={s.bills}>
        {pending.slice(0, 3).map((invoice) => (
          <button key={invoice.id} className={s.bill} onClick={() => onInvoice(invoice.id)}>
            <span>
              <b>
                {[
                  data.quotes.find((quote) => quote.id === invoice.quoteId)?.number,
                  invoice.concept,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </b>
              <small className={invoice.status === "Vencida" ? s.overdue : undefined}>
                {invoice.due
                  ? `${invoice.status === "Vencida" ? "Vencido desde" : "Vence el"} ${civil(invoice.due)}`
                  : "Sin vencimiento definido"}
              </small>
            </span>
            <span className={s.amount}>
              <strong>{money(invoice.balance, invoice.currency)}</strong>
              <small>
                Ver detalle <ArrowRight size={14} aria-hidden="true" />
              </small>
            </span>
          </button>
        ))}
      </div>
      <button className={s.all} onClick={onPayments}>
        Ver pagos y facturas <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}

import type { PortalData } from "./snapshot";
import { paymentCivilDate, projectMonthlyPayments } from "@/lib/payments/payment-projection";
import { pendingBilling } from "./pending-billing";
export function billingCalendar(
  data: Pick<PortalData, "payments" | "invoices" | "quotes" | "recurring">,
  year: number,
) {
  const caption = (i: PortalData["invoices"][number]) =>
    [data.quotes.find((q) => q.id === i.quoteId)?.number, i.concept].filter(Boolean).join(" · ");
  return [
    ...data.payments.map((p) => ({
      id: `${p.source}:${p.id}`,
      label: p.reference,
      date: paymentCivilDate(p.date),
      amount: p.amount,
      currency: "CLP",
      kind: "paid" as const,
      invoiceId: null as string | null,
      paymentId: p.id,
      paymentSource: p.source,
      quoteId: null as string | null,
    })),
    ...pendingBilling(data.invoices).pending.map((i) => ({
      id: i.id,
      label: caption(i),
      date: i.due ? paymentCivilDate(i.due) : null,
      amount: i.balance,
      currency: i.currency,
      kind: "pending" as const,
      invoiceId: i.id,
      paymentId: null,
      paymentSource: null,
      quoteId: i.quoteId,
    })),
    ...data.recurring
      .filter((p) => p.currency === "CLP")
      .flatMap((p) => projectMonthlyPayments(p, year))
      .filter(
        (p) =>
          !data.invoices.some(
            (i) =>
              i.quoteId === p.quoteId &&
              paymentCivilDate(i.due || i.issued)?.slice(0, 7) === p.date.slice(0, 7),
          ),
      )
      .map((p) => ({
        ...p,
        id: `forecast:${p.quoteId}:${p.date}`,
        currency: "CLP",
        kind: "forecast" as const,
        invoiceId: null as string | null,
        paymentId: null,
        paymentSource: null,
      })),
  ].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}

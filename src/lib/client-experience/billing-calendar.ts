import type { PortalData } from "./snapshot";
import { paymentCivilDate, projectMonthlyPayments } from "@/lib/payments/payment-projection";
import { pendingBilling } from "./pending-billing";

function monthlyForecasts(plan: PortalData["recurring"][number], year: number, asOf: string) {
  const projected = ["ASSIGNED", "PENDING"].includes(plan.state)
    ? { ...plan, state: "ACTIVE" }
    : plan;
  const dated = projectMonthlyPayments(projected, year).flatMap((row) => {
    const entry = plan.calendarEntries?.find((item) => item.period === row.date.slice(0, 7));
    if (entry && !entry.date) return [];
    return [
      {
        ...row,
        amount: entry?.amount ?? row.amount,
        date: (entry?.date || row.date) as string | null,
        period: (entry?.date || row.date).slice(0, 7),
        cycle: row.date.slice(0, 7),
        currency: plan.currency,
      },
    ];
  });
  if (
    ["ACTIVE", "ASSIGNED", "PENDING"].includes(plan.state) &&
    Number.isFinite(plan.amount) &&
    plan.amount > 0 &&
    Number.isInteger(year) &&
    year >= 2020 &&
    year <= 2100
  ) {
    for (const entry of plan.calendarEntries || []) {
      const date = entry.date && paymentCivilDate(entry.date);
      if (date?.startsWith(`${year}-`) && !entry.period.startsWith(`${year}-`))
        dated.push({
          quoteId: plan.quoteId,
          label: plan.label,
          amount: entry.amount,
          date,
          period: date.slice(0, 7),
          cycle: entry.period,
          currency: plan.currency,
        });
    }
  }
  const selectedYear = dated.filter((row) => row.date?.startsWith(`${year}-`));
  if (selectedYear.length || !["ACTIVE", "ASSIGNED", "PENDING"].includes(plan.state))
    return selectedYear;
  const reference = paymentCivilDate(asOf);
  if (
    !reference ||
    !Number.isInteger(year) ||
    year < 2020 ||
    year > 2100 ||
    !Number.isFinite(plan.amount) ||
    plan.amount <= 0 ||
    (plan.currency === "CLP" && !Number.isSafeInteger(plan.amount))
  )
    return [];
  // A scheduled plan outside this year must not become an undated forecast.
  if (paymentCivilDate(plan.nextDate || plan.activatedAt || "")) return [];
  return Array.from({ length: 12 }, (_, index) => {
    const period = `${year}-${String(index + 1).padStart(2, "0")}`;
    return {
      quoteId: plan.quoteId,
      label: plan.label,
      amount: plan.amount,
      currency: plan.currency,
      date: null,
      period,
      cycle: period,
    };
  }).filter((row) => row.period >= reference.slice(0, 7));
}

export function billingCalendar(
  data: Pick<PortalData, "payments" | "invoices" | "quotes" | "recurring" | "asOf">,
  year: number,
) {
  const caption = (i: PortalData["invoices"][number]) =>
    [data.quotes.find((q) => q.id === i.quoteId)?.number, i.concept].filter(Boolean).join(" · ");
  return [
    ...data.payments.map((p) => ({
      id: `${p.source}:${p.id}`,
      label: p.reference,
      date: paymentCivilDate(p.date),
      period: paymentCivilDate(p.date)?.slice(0, 7) || null,
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
      period: i.due ? paymentCivilDate(i.due)?.slice(0, 7) || null : null,
      amount: i.balance,
      currency: i.currency,
      kind: "pending" as const,
      invoiceId: i.id,
      paymentId: null,
      paymentSource: null,
      quoteId: i.quoteId,
    })),
    ...data.recurring
      .flatMap((p) => monthlyForecasts(p, year, data.asOf))
      .filter(
        (p) =>
          !data.invoices.some(
            (i) =>
              i.quoteId === p.quoteId &&
              paymentCivilDate(i.due || i.issued)?.slice(0, 7) === p.period,
          ),
      )
      .map((p) => ({
        ...p,
        id: `forecast:${p.quoteId}:${p.cycle}`,
        kind: "forecast" as const,
        invoiceId: null as string | null,
        paymentId: null,
        paymentSource: null,
      })),
  ].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}

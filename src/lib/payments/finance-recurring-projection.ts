import { Temporal } from "@js-temporal/polyfill";
import type { ClientRecurring } from "./client-recurring-projection";

export type FinanceRecurringPlan = {
  quote_id: string;
  label: string;
  amount: number | string;
  currency: string;
  start_date: string;
  payment_day: number;
  total_installments: number | null;
  status: string;
  installments: { sequence: number; due: string; amount: number; status: string }[];
};

export function financeRecurringProjection(plan: FinanceRecurringPlan): ClientRecurring {
  const start = Temporal.PlainDate.from(plan.start_date).with({ day: 1 });
  const dateAt = (sequence: number) => {
    const month = start.add({ months: sequence - 1 });
    return month.with({ day: Math.min(plan.payment_day, month.daysInMonth) }).toString();
  };
  const scheduled = plan.installments.filter(
    (item) => !["PAID", "CANCELLED"].includes(item.status),
  );
  const nextSequence = scheduled.length
    ? Math.min(...scheduled.map((item) => item.sequence))
    : Math.max(0, ...plan.installments.map((item) => item.sequence)) + 1;
  return {
    quoteId: plan.quote_id,
    quoteViewId: plan.quote_id,
    label: plan.label,
    amount: Number(plan.amount),
    currency: plan.currency.trim(),
    state: plan.status,
    managedBy: "FINANCE",
    nextDate: dateAt(nextSequence),
    activatedAt: null,
    paidThrough: null,
    anchorDate: `2024-01-${String(plan.payment_day).padStart(2, "0")}`,
    endsAt: plan.total_installments ? dateAt(plan.total_installments) : null,
    calendarEntries: plan.installments.map((item) => ({
      period: dateAt(item.sequence).slice(0, 7),
      date: item.status === "PAID" || item.status === "CANCELLED" ? null : item.due,
      amount: Number(item.amount),
    })),
  };
}

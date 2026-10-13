import { Temporal } from "@js-temporal/polyfill";
export type RecurringProjection = {
  quoteId: string;
  label: string;
  amount: number;
  nextDate: string | null;
  activatedAt: string | null;
  state: string;
  paidThrough: string | null;
};
export function projectMonthlyPayments(subscription: RecurringProjection, year: number) {
  if (
    !Number.isInteger(year) ||
    year < 2020 ||
    year > 2100 ||
    !["ACTIVE", "CANCEL_REQUESTED"].includes(subscription.state) ||
    subscription.amount <= 0 ||
    !Number.isSafeInteger(subscription.amount)
  )
    return [];
  const raw = subscription.nextDate || subscription.activatedAt;
  if (!raw) return [];
  let anchor: Temporal.PlainDate;
  try {
    anchor = Temporal.PlainDate.from(raw.slice(0, 10));
  } catch {
    return [];
  }
  let paidLimit: Temporal.PlainDate | null = null;
  if (subscription.state === "CANCEL_REQUESTED") {
    if (!subscription.paidThrough) return [];
    try {
      paidLimit =
        subscription.paidThrough.length === 10
          ? Temporal.PlainDate.from(subscription.paidThrough)
          : Temporal.Instant.from(subscription.paidThrough)
              .toZonedDateTimeISO("America/Santiago")
              .toPlainDate();
    } catch {
      return [];
    }
  }
  const dates = [];
  for (let month = 1; month <= 12; month++) {
    const date = Temporal.PlainDate.from({ year, month, day: 1 }).with({
      day: Math.min(anchor.day, Temporal.PlainDate.from({ year, month, day: 1 }).daysInMonth),
    });
    if (Temporal.PlainDate.compare(date, anchor) < 0) continue;
    if (
      subscription.state === "CANCEL_REQUESTED" &&
      (!paidLimit || Temporal.PlainDate.compare(date, paidLimit) > 0)
    )
      continue;
    dates.push({
      quoteId: subscription.quoteId,
      label: subscription.label,
      amount: subscription.amount,
      date: date.toString(),
    });
  }
  return dates;
}

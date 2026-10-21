import { Temporal } from "@js-temporal/polyfill";
export function monthlyNextDate(anchor: string, after: string) {
  const a = Temporal.PlainDate.from(anchor),
    d = Temporal.PlainDate.from(after);
  const base = d.with({ day: 1 }).add({ months: 1 });
  return base.with({ day: Math.min(a.day, base.daysInMonth) }).toString();
}
export function billingPhase(due: string, today: string): string | null {
  const days = Temporal.PlainDate.from(due).until(Temporal.PlainDate.from(today)).days;
  return days >= 30
    ? "OVERDUE30"
    : days >= 7
      ? "OVERDUE7"
      : days >= 0
        ? "DUE"
        : days >= -3
          ? "UPCOMING"
          : null;
}
export function billingToday(now: Date = new Date()) {
  return Temporal.Instant.from(now.toISOString())
    .toZonedDateTimeISO("America/Santiago")
    .toPlainDate()
    .toString();
}
export function dueInstant(date: string) {
  return new Date(
    Temporal.PlainDate.from(date)
      .toZonedDateTime({ timeZone: "America/Santiago", plainTime: "23:59:59" })
      .toInstant()
      .toString(),
  );
}

export function monthlyOnOrAfter(anchor: string, today: string) {
  const a = Temporal.PlainDate.from(anchor),
    t = Temporal.PlainDate.from(today);
  const first = t.with({ day: Math.min(a.day, t.daysInMonth) });
  return Temporal.PlainDate.compare(first, t) >= 0
    ? first.toString()
    : monthlyNextDate(anchor, today);
}

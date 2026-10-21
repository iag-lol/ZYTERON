import { Temporal } from "@js-temporal/polyfill";

export function calendarDate(month: string, chargeDay: number) {
  const d = Temporal.PlainDate.from(month);
  return d.with({ day: Math.min(chargeDay, d.daysInMonth) }).toString();
}
export function collectionAnchor(chargeDay: number) {
  return `2000-01-${String(chargeDay).padStart(2, "0")}`;
}
export function suspensionDate(due: string, graceDays: number) {
  // The due day and every full grace day remain available for payment in Santiago.
  return Temporal.PlainDate.from(due)
    .add({ days: graceDays + 1 })
    .toString();
}

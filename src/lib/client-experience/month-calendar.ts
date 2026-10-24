import { paymentCivilDate } from "@/lib/payments/payment-projection";

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}
export function monthDays(year: number, month: number) {
  if (
    !Number.isInteger(year) ||
    year < 2020 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    throw new Error("Mes inválido");
  const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((start + count) / 7) * 7 }, (_, index) => {
    const day = index - start + 1;
    return day < 1 || day > count
      ? null
      : `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;
  });
}
export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}
export function calendarReference(value: string) {
  const date = paymentCivilDate(value);
  if (!date) throw new Error("Fecha de calendario inválida");
  return { date, year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

// Los compromisos publicados sin hora se guardaron históricamente a medianoche UTC.
export function agendaEventDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value)
    ? paymentCivilDate(value.slice(0, 10))
    : paymentCivilDate(value);
}
export function agendaEventTime(value: string) {
  if (/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value)) return "Horario por confirmar";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

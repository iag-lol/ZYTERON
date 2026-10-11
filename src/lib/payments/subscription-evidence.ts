import { Temporal } from "@js-temporal/polyfill";
import { parseObservation } from "./pilot-protocol";
import type { FlowStatusResult } from "./flow";
export function providerInstant(value: unknown) {
  if (typeof value !== "string") throw new Error("SUBSCRIPTION_DATE_INVALID");
  try {
    return /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
      ? Temporal.Instant.from(value).toString()
      : Temporal.PlainDateTime.from(value.replace(" ", "T"))
          .toZonedDateTime("America/Santiago", { disambiguation: "reject" })
          .toInstant()
          .toString();
  } catch {
    throw new Error("SUBSCRIPTION_DATE_INVALID");
  }
}
// Provider's date-only midnight period_end denotes the last covered calendar day.
// Keep that day in Santiago; a naive monthly interval must never suspend at its beginning.
export function providerPeriodEnd(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}[ T]00:00:00$/.test(value))
    return Temporal.PlainDate.from(value.slice(0, 10))
      .add({ days: 1 })
      .toPlainDateTime("00:00:00")
      .toZonedDateTime("America/Santiago")
      .toInstant()
      .toString();
  return providerInstant(value);
}
export function verifySubscriptionCharge(input: {
  subscription: Record<string, unknown>;
  invoice: Record<string, unknown>;
  status: FlowStatusResult;
  expected: { subscriptionId: string; customerId: string; planId: string; amount: number };
}) {
  const { subscription: s, invoice: i, status, expected: e } = input;
  if (
    s.subscriptionId !== e.subscriptionId ||
    s.customerId !== e.customerId ||
    s.planId !== e.planId ||
    i.subscriptionId !== e.subscriptionId ||
    i.customerId !== e.customerId ||
    !Number.isSafeInteger(i.id) ||
    !Array.isArray(s.invoices) ||
    !s.invoices.some(
      (v) => typeof v === "object" && v !== null && (v as { id?: unknown }).id === i.id,
    )
  )
    throw new Error("SUBSCRIPTION_OWNERSHIP_MISMATCH");
  const p = i.payment as Record<string, unknown> | undefined;
  if (
    !p ||
    p.flowOrder !== status.flowOrder ||
    p.commerceOrder !== status.commerceOrder ||
    p.status !== 2 ||
    i.status !== 1 ||
    i.currency !== "CLP" ||
    i.amount !== e.amount ||
    status.amount !== e.amount ||
    p.currency !== "CLP" ||
    p.amount !== e.amount ||
    !e.amount
  )
    throw new Error("SUBSCRIPTION_PAYMENT_MISMATCH");
  const proof = parseObservation({ ...status });
  if (proof.state !== "CONFIRMED" || !proof.paidAt)
    throw new Error("SUBSCRIPTION_PAYMENT_NOT_CONFIRMED");
  const start = providerInstant(i.period_start),
    end = providerPeriodEnd(i.period_end);
  if (Temporal.Instant.compare(start, end) >= 0) throw new Error("SUBSCRIPTION_PERIOD_INVALID");
  return { invoiceId: i.id as number, paidAt: proof.paidAt, periodStart: start, periodEnd: end };
}

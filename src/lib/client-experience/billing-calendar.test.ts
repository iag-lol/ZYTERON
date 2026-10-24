import { test } from "node:test";
import assert from "node:assert/strict";
import type { PortalData } from "./snapshot";
import { billingCalendar } from "./billing-calendar";
const bill = {
  id: "bill",
  quoteId: "quote",
  concept: "Mensualidad",
  balance: 280514,
  total: 280514,
  currency: "CLP",
  status: "Pendiente",
  due: "2026-10-30",
  issued: "2026-10-01",
};
const plan = {
  quoteId: "quote",
  label: "Mensualidad",
  amount: 280514,
  currency: "CLP",
  state: "ACTIVE",
  nextDate: "2026-10-30",
  activatedAt: "2026-10-01",
  paidThrough: null,
};
function data(invoices: unknown[] = [bill], recurring: unknown[] = [plan]) {
  return {
    invoices,
    recurring,
    quotes: [{ id: "quote", number: "COT-2026-00001" }],
    payments: [
      {
        id: "paid",
        source: "accounting",
        reference: "PAG-001",
        amount: 280514,
        date: "2026-10-20T12:00:00Z",
      },
    ],
  } as Pick<PortalData, "payments" | "invoices" | "quotes" | "recurring">;
}
test("monthly calendar connects issued balances, confirmed payments and forecasts without double counting a billing month", () => {
  const rows = billingCalendar(data(), 2026);
  assert.equal(
    rows.filter((r) => r.kind === "forecast" && r.date?.startsWith("2026-10")).length,
    0,
  );
  assert.equal(rows.find((r) => r.invoiceId === "bill")?.amount, 280514);
  assert.equal(rows.find((r) => r.paymentId === "paid")?.date, "2026-10-20");
  assert.equal(rows.find((r) => r.kind === "forecast")?.date, "2026-11-30");
});
test("undated balances remain visible without assigning an invented deadline", () => {
  const rows = billingCalendar(data([{ ...bill, due: null }]), 2026);
  assert.equal(rows.find((r) => r.invoiceId === "bill")?.date, null);
  assert.equal(
    rows.filter((r) => r.kind === "forecast" && r.date?.startsWith("2026-10")).length,
    0,
  );
});
test("settled invoices and suspended plans do not create new charges; balances retain their own currency", () => {
  const rows = billingCalendar(
    data(
      [
        { ...bill, balance: 0 },
        { ...bill, id: "uf", quoteId: null, currency: "UF", balance: 2.5 },
      ],
      [{ ...plan, state: "SUSPENDED" }],
    ),
    2026,
  );
  assert.equal(rows.filter((r) => r.kind === "forecast").length, 0);
  assert.equal(
    rows.some((r) => r.invoiceId === "bill"),
    false,
  );
  assert.equal(rows.find((r) => r.invoiceId === "uf")?.currency, "UF");
  assert.equal(rows.find((r) => r.invoiceId === "uf")?.amount, 2.5);
});

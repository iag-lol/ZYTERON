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
    asOf: "2026-10-28T12:00:00Z",
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
  } as Pick<PortalData, "payments" | "invoices" | "quotes" | "recurring" | "asOf">;
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

test("both assigned monthly agreements appear next month without inventing due dates or balances", () => {
  const assigned = { ...plan, state: "ASSIGNED", nextDate: null, activatedAt: null };
  const input = data(
    [],
    [
      { ...assigned, quoteId: "web", amount: 133242 },
      { ...assigned, quoteId: "gps", amount: 280514 },
    ],
  );
  const rows = billingCalendar(input, 2026);
  const november = rows.filter((r) => r.period === "2026-11");
  assert.deepEqual(
    november.map((r) => [r.quoteId, r.amount, r.date, r.kind]),
    [
      ["web", 133242, null, "forecast"],
      ["gps", 280514, null, "forecast"],
    ],
  );
  assert.equal(
    november.reduce((sum, r) => sum + r.amount, 0),
    413756,
  );
  assert.equal(
    november.some((r) => r.invoiceId || r.paymentId),
    false,
  );
  assert.equal(
    rows.some((r) => r.kind === "forecast" && r.period! < "2026-10"),
    false,
  );
  assert.equal(billingCalendar(input, 2027).filter((r) => r.kind === "forecast").length, 24);
  assert.equal(billingCalendar(input, 2025).filter((r) => r.kind === "forecast").length, 0);
});

test("issuing or settling the monthly bill replaces its undated forecast only for that month", () => {
  for (const balance of [280514, 100000, 0]) {
    const rows = billingCalendar(
      data(
        [{ ...bill, balance }],
        [{ ...plan, state: "ASSIGNED", nextDate: null, activatedAt: null }],
      ),
      2026,
    );
    assert.equal(rows.filter((r) => r.kind === "forecast" && r.period === "2026-10").length, 0);
    assert.equal(rows.filter((r) => r.kind === "forecast" && r.period === "2026-11").length, 1);
  }
});

test("active plans missing a valid date stay visible, while paused and cancelled plans do not forecast", () => {
  for (const nextDate of [null, "invalid"]) {
    const rows = billingCalendar(data([], [{ ...plan, nextDate, activatedAt: null }]), 2026);
    assert.equal(rows.find((r) => r.kind === "forecast" && r.period === "2026-11")?.date, null);
  }
  for (const state of ["PAUSED", "SUSPENDED", "CANCELLED", "CANCEL_REQUESTED", "FAILED"]) {
    assert.equal(
      billingCalendar(data([], [{ ...plan, state, nextDate: null }]), 2026).filter(
        (r) => r.kind === "forecast",
      ).length,
      0,
    );
  }
  assert.equal(
    billingCalendar(data([], [{ ...plan, nextDate: "2027-01-31" }]), 2026).filter(
      (r) => r.kind === "forecast",
    ).length,
    0,
  );
});

test("monthly forecasts preserve currency, including fractional UF amounts", () => {
  for (const state of ["ASSIGNED", "ACTIVE"]) {
    const rows = billingCalendar(data([], [{ ...plan, state, currency: "UF", amount: 2.5 }]), 2026);
    const november = rows.find((r) => r.kind === "forecast" && r.period === "2026-11");
    assert.equal(november?.currency, "UF");
    assert.equal(november?.amount, 2.5);
  }
});

test("saving an administrative due date publishes an assigned monthly calendar indefinitely", () => {
  const input = data(
    [],
    [
      {
        ...plan,
        state: "ASSIGNED",
        nextDate: "2026-11-18",
        anchorDate: "2024-01-18",
        activatedAt: null,
      },
    ],
  );
  assert.equal(
    billingCalendar(input, 2026).find((r) => r.period === "2026-11")?.date,
    "2026-11-18",
  );
  assert.equal(billingCalendar(input, 2031).filter((r) => r.kind === "forecast").length, 12);
  assert.equal(
    billingCalendar(input, 2031).find((r) => r.period === "2031-12")?.date,
    "2031-12-18",
  );
});

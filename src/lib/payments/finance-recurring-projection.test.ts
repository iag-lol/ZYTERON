import { test } from "node:test";
import assert from "node:assert/strict";
import {
  financeRecurringProjection,
  type FinanceRecurringPlan,
} from "./finance-recurring-projection";
import { projectMonthlyPayments } from "./payment-projection";
import { billingCalendar } from "../client-experience/billing-calendar";

const plan: FinanceRecurringPlan = {
  quote_id: "q",
  label: "Mantención",
  amount: "133242",
  currency: "CLP",
  start_date: "2026-10-01",
  payment_day: 18,
  total_installments: null,
  status: "ACTIVE",
  installments: [{ sequence: 1, due: "2026-10-18", amount: 133242, status: "PAID" }],
};
test("an indefinite administration calendar projects the configured day in any later year", () => {
  const recurring = financeRecurringProjection(plan);
  assert.equal(recurring.nextDate, "2026-11-18");
  assert.equal(recurring.endsAt, null);
  assert.equal(projectMonthlyPayments(recurring, 2032).length, 12);
  assert.equal(projectMonthlyPayments(recurring, 2032).at(-1)?.date, "2032-12-18");
});
test("finite calendars end at the last installment and paused or cancelled plans stop forecasting", () => {
  const recurring = financeRecurringProjection({ ...plan, total_installments: 3 });
  assert.deepEqual(
    projectMonthlyPayments(recurring, 2026).map((p) => p.date),
    ["2026-11-18", "2026-12-18"],
  );
  assert.equal(projectMonthlyPayments(recurring, 2027).length, 0);
  for (const status of ["PAUSED", "CANCELLED", "COMPLETED"])
    assert.equal(
      projectMonthlyPayments(financeRecurringProjection({ ...plan, status }), 2027).length,
      0,
    );
});
test("February does not move the original billing day and finance installment exceptions remain authoritative", () => {
  const recurring = financeRecurringProjection({
    ...plan,
    start_date: "2027-01-01",
    payment_day: 31,
    installments: [
      { sequence: 1, due: "2027-01-31", amount: 133242, status: "SCHEDULED" },
      { sequence: 2, due: "2027-02-27", amount: 100000, status: "SCHEDULED" },
      { sequence: 3, due: "2027-03-31", amount: 133242, status: "CANCELLED" },
    ],
  });
  const rows = billingCalendar(
    { asOf: "2027-01-01", recurring: [recurring], invoices: [], payments: [], quotes: [] },
    2027,
  );
  assert.equal(rows.find((r) => r.period === "2027-02")?.date, "2027-02-27");
  assert.equal(rows.find((r) => r.period === "2027-02")?.amount, 100000);
  assert.equal(
    rows.some((r) => r.period === "2027-03"),
    false,
  );
  assert.equal(rows.find((r) => r.period === "2027-04")?.date, "2027-04-30");
});

test("an installment moved to another year appears once in its actual due month", () => {
  const recurring = financeRecurringProjection({
    ...plan,
    start_date: "2026-12-01",
    total_installments: 1,
    installments: [{ sequence: 1, due: "2027-01-05", amount: 133242, status: "SCHEDULED" }],
  });
  const data = {
    asOf: "2026-10-28",
    recurring: [recurring],
    invoices: [],
    payments: [],
    quotes: [],
  };
  assert.equal(billingCalendar(data, 2026).length, 0);
  const rows = billingCalendar(data, 2027);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, "2027-01-05");
  const indefinite = financeRecurringProjection({
    ...plan,
    start_date: "2026-12-01",
    installments: [{ sequence: 1, due: "2027-01-05", amount: 133242, status: "SCHEDULED" }],
  });
  const january = billingCalendar({ ...data, recurring: [indefinite] }, 2027).filter(
    (r) => r.period === "2027-01",
  );
  assert.equal(january.length, 2);
  assert.equal(new Set(january.map((r) => r.id)).size, 2);
});

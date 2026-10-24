import { test } from "node:test";
import assert from "node:assert/strict";
import { billingInvoiceFromSearch, pendingBilling } from "./pending-billing";

const invoice = {
  id: "partial",
  total: 2368100,
  balance: 1368100,
  currency: "CLP",
  status: "Pendiente",
  due: null,
};

test("direct bill links resolve only documents in the current client snapshot", () => {
  assert.equal(billingInvoiceFromSearch("?cobro=partial", [invoice]), "partial");
  assert.equal(billingInvoiceFromSearch("?cobro=other-client", [invoice]), null);
  assert.equal(billingInvoiceFromSearch("?cobro=partial", []), null);
  assert.equal(billingInvoiceFromSearch("?cobro=", [invoice]), null);
  assert.equal(billingInvoiceFromSearch("", [invoice]), null);
});

test("a pending balance with no due date is visible and uses the remainder after payments", () => {
  const result = pendingBilling([invoice]);
  assert.equal(result.pending[0].id, "partial");
  assert.deepEqual(result.totals, [{ currency: "CLP", balance: 1368100, overdue: 0, count: 1 }]);
});

test("settled and credit balances do not appear as pending debt", () => {
  assert.deepEqual(
    pendingBilling([
      { ...invoice, balance: 0 },
      { ...invoice, balance: -1000 },
    ]),
    { pending: [], totals: [] },
  );
});

test("balances in different currencies stay separate", () => {
  const result = pendingBilling([invoice, { ...invoice, currency: "UF", balance: 2.5 }]);
  assert.deepEqual(
    result.totals.map((group) => [group.currency, group.balance]),
    [
      ["CLP", 1368100],
      ["UF", 2.5],
    ],
  );
});

test("overdue bills come first, followed by due dates and undated bills without mutating input", () => {
  const invoices = [
    invoice,
    { ...invoice, id: "later", due: "2026-11-30T12:00:00Z" },
    { ...invoice, id: "soon", due: "2026-10-30T12:00:00Z" },
    { ...invoice, id: "overdue", status: "Vencida", due: "2026-10-01T12:00:00Z" },
  ];
  const result = pendingBilling(invoices);
  assert.deepEqual(
    result.pending.map((row) => row.id),
    ["overdue", "soon", "later", "partial"],
  );
  assert.equal(result.totals[0].overdue, invoice.balance);
  assert.equal(invoices[0].id, "partial");
});

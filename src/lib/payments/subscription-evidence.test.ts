import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuotePaymentConfig } from "./quote-payments";
import { verifySubscriptionCharge, providerInstant } from "./subscription-evidence";
const status = {
  status: 2,
  flowOrder: 1234,
  commerceOrder: "monthly-order",
  currency: "CLP",
  amount: 20000,
  paymentData: { currency: "CLP", amount: 20000, date: "2026-10-11 12:00:00" },
};
const expected = {
  subscriptionId: "sus-owned",
  customerId: "cus-owned",
  planId: "plan-owned",
  amount: 20000,
};
const subscription = { ...expected, invoices: [{ id: 42 }] };
const invoice = {
  id: 42,
  subscriptionId: expected.subscriptionId,
  customerId: expected.customerId,
  status: 1,
  amount: 20000,
  currency: "CLP",
  period_start: "2026-10-11 00:00:00",
  period_end: "2026-11-11 00:00:00",
  payment: status,
};
test("card registration and active subscription never mean paid", () => {
  for (const state of ["PENDING", "ACTIVE", "FAILED"] as const) {
    const result = normalizeQuotePaymentConfig({
      totalQuoted: 20000,
      raw: {
        billingType: "SUBSCRIPTION",
        subscription: {
          status: state,
          activatedAt: "2026-10-11T15:00:00Z",
          lastPaymentAt: "2026-10-11T15:00:00Z",
        },
      },
    });
    assert.equal(result.totalPaid, 0);
    assert.equal(result.totalPending, 20000);
    assert.notEqual(result.stages?.[0].status, "PAID");
    assert.equal(result.stages?.[0].paidAt, undefined);
  }
});
test("monthly charge requires matching account, subscription, invoice and payment evidence", () => {
  assert.equal(verifySubscriptionCharge({ subscription, invoice, status, expected }).invoiceId, 42);
  for (const patch of [
    { subscriptionId: "sus-other" },
    { customerId: "cus-other" },
    { amount: 10000 },
    { currency: "USD" },
    { status: 0 },
    { id: 43 },
    { payment: { ...status, flowOrder: 999 } },
    { period_end: "2026-10-01 00:00:00" },
  ])
    assert.throws(() =>
      verifySubscriptionCharge({
        subscription,
        invoice: { ...invoice, ...patch },
        status,
        expected,
      }),
    );
  assert.throws(() =>
    verifySubscriptionCharge({
      subscription: { ...subscription, planId: "plan-other" },
      invoice,
      status,
      expected,
    }),
  );
  assert.throws(() =>
    verifySubscriptionCharge({ subscription, invoice, status: { ...status, status: 1 }, expected }),
  );
  assert.throws(() => providerInstant("2026-09-06 00:30:00"));
});

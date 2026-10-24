import { test } from "node:test";
import assert from "node:assert/strict";
import {
  invoicePaymentOption,
  assertCheckoutAmount,
  assertReceivableCheckout,
} from "./invoice-payment-option";
import { pendingBilling } from "@/lib/client-experience/pending-billing";
import { presentation } from "@/full-portal/production-model";
import type { PortalData } from "@/lib/client-experience/snapshot";

const bill = {
  id: "pending-bill",
  quoteId: "one-time",
  balance: 1368100,
  total: 2368100,
  currency: "CLP",
};
const quote = {
  id: "one-time",
  billingType: "ONE_TIME",
  currency: "CLP",
  payable: true,
  stages: [{ amount: 1368100, dueEnabled: true, channel: "FLOW", status: "READY" }],
};
const row = {
  clientId: "client",
  quoteId: "one-time",
  stageKey: null,
  currency: "CLP",
  balance: 1368100,
  status: "PARTIAL",
  archived: false,
};
const target = {
  clientId: "client",
  quoteId: "one-time",
  stageKey: "FULL",
  expectedAmount: 1368100,
  receivable: row,
};

test("a paid monthly invoice never replaces the pending transfer bill in payment options", () => {
  const paid = {
    ...bill,
    id: "paid-month",
    quoteId: "monthly",
    total: 133242,
    balance: 0,
    due: null,
    status: "Pagada",
  };
  const transfer = {
    ...quote,
    payable: false,
    stages: [{ ...quote.stages[0], amount: 1184050, channel: "TRANSFER" }],
  };
  const monthly = {
    ...quote,
    id: "monthly",
    billingType: "SUBSCRIPTION",
    stages: [{ ...quote.stages[0], amount: 133242 }],
  };
  const invoices = [paid, { ...bill, due: null, status: "Pendiente" }];
  const data = {
    services: [],
    projects: [],
    invoices,
    quotes: [monthly, transfer],
    documents: [],
    tickets: [],
    notifications: [],
    events: [],
  } as unknown as PortalData;
  assert.equal(pendingBilling(invoices).pending[0].id, "pending-bill");
  assert.equal(
    presentation(data).invoices.find((invoice) => invoice.payable),
    undefined,
  );
  assert.equal(invoicePaymentOption(bill, transfer), "TRANSFER");
  assert.equal(invoicePaymentOption(paid, monthly), "SETTLED");
});

test("the selected invoice cannot start a different quote or a monthly authorization", () => {
  assert.equal(invoicePaymentOption(bill, { ...quote, id: "other" }), "REVIEW");
  assert.equal(invoicePaymentOption(bill, { ...quote, billingType: "SUBSCRIPTION" }), "REVIEW");
  assert.equal(invoicePaymentOption(bill), "REVIEW");
  assert.equal(invoicePaymentOption({ ...bill, quoteId: null }, quote), "REVIEW");
});

test("an invoice checkout must match its actual remaining balance and currency", () => {
  assert.equal(invoicePaymentOption(bill, quote), "FLOW");
  for (const amount of [1184050, 2368100])
    assert.equal(
      invoicePaymentOption(bill, { ...quote, stages: [{ ...quote.stages[0], amount }] }),
      "REVIEW",
    );
  assert.equal(invoicePaymentOption(bill, { ...quote, currency: "USD" }), "REVIEW");
  assert.equal(invoicePaymentOption(bill, { ...quote, payable: false }), "REVIEW");
  assert.equal(invoicePaymentOption({ ...bill, balance: 0 }, quote), "SETTLED");
});

test("stale, invalid or changed checkout amounts are rejected before contacting Flow", () => {
  assert.doesNotThrow(() => assertCheckoutAmount(1368100, 1368100));
  for (const amount of [133242, 1184050, 2368100, 0, -1, NaN, 1.5])
    assert.throws(() => assertCheckoutAmount(amount, 1368100), /importe del cobro cambió/);
});

test("server invoice binding checks owner, quote, stage, currency and collection status", () => {
  assert.doesNotThrow(() => assertReceivableCheckout(target));
  const invalid = [
    null,
    { ...row, clientId: "other" },
    { ...row, quoteId: "other" },
    { ...row, stageKey: "FINAL" },
    { ...row, currency: "USD" },
    { ...row, archived: true },
    { ...row, status: "CANCELLED" },
  ];
  for (const receivable of invalid)
    assert.throws(
      () => assertReceivableCheckout({ ...target, receivable }),
      /documento no está disponible/,
    );
  assert.throws(
    () => assertReceivableCheckout({ ...target, receivable: { ...row, balance: 1268100 } }),
    /importe del cobro cambió/,
  );
  assert.throws(
    () => assertReceivableCheckout({ ...target, receivable: { ...row, balance: 0 } }),
    /importe del cobro cambió/,
  );
});

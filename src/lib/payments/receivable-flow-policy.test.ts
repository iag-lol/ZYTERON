import { test } from "node:test";
import assert from "node:assert/strict";
import { payableReceivable, receivablePaymentApplication } from "./receivable-flow-policy";
import { invoicePaymentOption } from "./invoice-payment-option";
const row = {
  clientId: "client",
  currency: "CLP",
  status: "PARTIAL",
  totalAmount: 2368100,
  metadata: null,
  allocations: [{ amount: 1000000 }],
};
test("Flow cobra el saldo de 1368100 y no una cuota de la cotización ni el total original", () => {
  assert.equal(payableReceivable(row, "client", 1368100), 1368100);
  for (const amount of [1184050, 133242, 2368100, 0, -1, 1.5])
    assert.throws(() => payableReceivable(row, "client", amount));
  assert.throws(() =>
    payableReceivable({ ...row, allocations: [{ amount: 1100000 }] }, "client", 1368100),
  );
});
test("sólo el dueño puede pagar documentos vigentes en CLP", () => {
  for (const value of [
    null,
    { ...row, clientId: "other" },
    { ...row, status: "CANCELLED" },
    { ...row, metadata: { adminCollectionArchive: { active: true } } },
    { ...row, currency: "USD" },
  ])
    assert.throws(() => payableReceivable(value, "client", 1368100));
});
test("un documento del portal ofrece Flow y transferencia aunque la cotización sea mensual, no esté cargada o tuviera otro medio", () => {
  for (const source of ["commercial", "accounting"] as const)
    assert.equal(
      invoicePaymentOption({
        id: "bill",
        source,
        quoteId: null,
        currency: "CLP",
        balance: 1368100,
      }),
      "BOTH",
    );
  assert.equal(
    invoicePaymentOption({
      id: "paid",
      source: "commercial",
      quoteId: null,
      currency: "CLP",
      balance: 0,
    }),
    "SETTLED",
  );
});
test("un pago confirmado salda el documento sin crear otra cuenta por cobrar", () => {
  assert.deepEqual(receivablePaymentApplication(1368100, 1368100, false), {
    allocated: 1368100,
    credit: 0,
    balance: 0,
  });
  assert.deepEqual(receivablePaymentApplication(1268100, 1368100, false), {
    allocated: 1268100,
    credit: 100000,
    balance: 0,
  });
  assert.deepEqual(receivablePaymentApplication(0, 1368100, false), {
    allocated: 0,
    credit: 1368100,
    balance: 0,
  });
  assert.deepEqual(receivablePaymentApplication(1368100, 1368100, true), {
    allocated: 0,
    credit: 1368100,
    balance: 1368100,
  });
});

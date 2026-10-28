import assert from "node:assert/strict";
import { test } from "node:test";
import { commercialPaymentsForPortal } from "./payment-representation";
const payment = {
  id: "commercial",
  amount: 1798819,
  currency: "CLP",
  allocations: [{ receivableId: "invoice", amount: 1798819 }],
  metadata: {
    portalReconciliationConfirmed: true,
    portalAccountingPaymentIds: ["deposit", "balance"],
  },
};
const accounting = [
  { id: "deposit", amount: 200000 },
  { id: "balance", amount: 1598819 },
];
test("a reconciled aggregate is represented by its two confirmed movements without changing allocations", () => {
  const before = structuredClone(payment);
  assert.deepEqual(commercialPaymentsForPortal([payment], accounting), []);
  assert.deepEqual(payment, before);
});
test("matching amounts alone do not hide a payment", () => {
  for (const metadata of [null, {}, { ...payment.metadata, portalReconciliationConfirmed: false }])
    assert.equal(commercialPaymentsForPortal([{ ...payment, metadata }], accounting).length, 1);
});
test("missing, mismatched, duplicated or foreign-currency evidence preserves the original", () => {
  assert.equal(commercialPaymentsForPortal([payment], accounting.slice(0, 1)).length, 1);
  assert.equal(
    commercialPaymentsForPortal([payment], [{ id: "deposit", amount: 1 }, accounting[1]]).length,
    1,
  );
  assert.equal(
    commercialPaymentsForPortal([{ ...payment, currency: "USD" }], accounting).length,
    1,
  );
  assert.equal(
    commercialPaymentsForPortal(
      [
        {
          ...payment,
          metadata: { ...payment.metadata, portalAccountingPaymentIds: ["deposit", "deposit"] },
        },
      ],
      accounting,
    ).length,
    1,
  );
});
test("the same accounting movement cannot silently replace two commercial payments", () => {
  assert.equal(
    commercialPaymentsForPortal([payment, { ...payment, id: "other" }], accounting).length,
    2,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientFinanceError,
  assertExternalPaymentMatches,
  buildAllocationPlan,
  deriveReceivableCollectionStatus,
  isFinanceSchemaUnavailable,
} from "./client-finance";

test("un abono parcial conserva exactamente el saldo pendiente", () => {
  assert.deepEqual(
    buildAllocationPlan(275_000, [
      { id: "receivable-1", totalAmount: 1_000_000, appliedAmount: 0 },
    ]),
    {
      allocations: [{ receivableId: "receivable-1", amount: 275_000 }],
      allocatedAmount: 275_000,
      creditAmount: 0,
    },
  );
});

test("un pago mayor al saldo deja el remanente como crédito", () => {
  assert.deepEqual(
    buildAllocationPlan(400_000, [
      { id: "receivable-1", totalAmount: 1_000_000, appliedAmount: 700_000 },
    ]),
    {
      allocations: [{ receivableId: "receivable-1", amount: 300_000 }],
      allocatedAmount: 300_000,
      creditAmount: 100_000,
    },
  );
});

test("la asignación puede cubrir varias cuentas por cobrar sin excederlas", () => {
  assert.deepEqual(
    buildAllocationPlan(500_000, [
      { id: "oldest", totalAmount: 200_000, appliedAmount: 50_000 },
      { id: "next", totalAmount: 600_000, appliedAmount: 300_000 },
    ]),
    {
      allocations: [
        { receivableId: "oldest", amount: 150_000 },
        { receivableId: "next", amount: 300_000 },
      ],
      allocatedAmount: 450_000,
      creditAmount: 50_000,
    },
  );
});

test("el estado financiero diferencia parcial, vencido, pagado y cancelado", () => {
  const now = new Date("2026-09-23T12:00:00.000Z");
  assert.equal(
    deriveReceivableCollectionStatus({ totalAmount: 100, appliedAmount: 25, now }),
    "PARTIAL",
  );
  assert.equal(
    deriveReceivableCollectionStatus({
      totalAmount: 100,
      appliedAmount: 25,
      dueAt: new Date("2026-09-01T00:00:00.000Z"),
      now,
    }),
    "OVERDUE",
  );
  assert.equal(
    deriveReceivableCollectionStatus({ totalAmount: 100, appliedAmount: 100, now }),
    "PAID",
  );
  assert.equal(
    deriveReceivableCollectionStatus({
      totalAmount: 100,
      appliedAmount: 100,
      currentStatus: "CANCELLED",
      now,
    }),
    "CANCELLED",
  );
});

test("Flow debe coincidir en monto y moneda cuando los informa", () => {
  assert.doesNotThrow(() =>
    assertExternalPaymentMatches({
      expectedAmount: 250_000,
      reportedAmount: 250_000,
      reportedCurrency: "clp",
    }),
  );
  assert.throws(
    () =>
      assertExternalPaymentMatches({
        expectedAmount: 250_000,
        reportedAmount: 249_999,
        reportedCurrency: "CLP",
      }),
    (error: unknown) =>
      error instanceof ClientFinanceError && error.code === "PAYMENT_AMOUNT_MISMATCH",
  );
  assert.throws(
    () =>
      assertExternalPaymentMatches({
        expectedAmount: 250_000,
        reportedAmount: 250_000,
        reportedCurrency: "USD",
      }),
    (error: unknown) =>
      error instanceof ClientFinanceError && error.code === "PAYMENT_CURRENCY_MISMATCH",
  );
});

test("detecta ausencia de tablas o columnas sin ocultar otros errores", () => {
  assert.equal(isFinanceSchemaUnavailable({ code: "P2021" }), true);
  assert.equal(
    isFinanceSchemaUnavailable(new Error('relation "PaymentAllocation" does not exist')),
    true,
  );
  assert.equal(isFinanceSchemaUnavailable(new Error("connection refused")), false);
});

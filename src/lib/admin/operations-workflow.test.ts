import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFinancialPosition,
  canTransitionOperation,
  inferOperationStage,
  nextOperationStage,
  operationStageProgress,
} from "./operations-workflow";

test("el flujo operativo solo avanza una etapa sin override", () => {
  assert.equal(nextOperationStage("APPROVED"), "INITIAL_PAYMENT");
  assert.equal(canTransitionOperation({ from: "APPROVED", to: "INITIAL_PAYMENT" }), true);
  assert.equal(canTransitionOperation({ from: "APPROVED", to: "IN_PROGRESS" }), false);
  assert.equal(
    canTransitionOperation({ from: "APPROVED", to: "IN_PROGRESS", allowOverride: true }),
    false,
  );
  assert.equal(
    canTransitionOperation({
      from: "APPROVED",
      to: "IN_PROGRESS",
      allowOverride: true,
      overrideReason: "Excepción aprobada por dirección",
    }),
    true,
  );
  assert.equal(
    canTransitionOperation({ from: "APPROVED", to: "WORK_ORDER", requiresInitialPayment: false }),
    true,
  );
  assert.equal(operationStageProgress("CLOSED"), 100);
});

test("el flujo legado infiere cobranza y cierre desde facturación y pagos", () => {
  assert.equal(
    inferOperationStage({
      hasClient: true,
      hasInvoice: true,
      billedAmount: 1_000_000,
      paidAmount: 250_000,
    }),
    "COLLECTION",
  );
  assert.equal(
    inferOperationStage({
      hasClient: true,
      hasInvoice: true,
      billedAmount: 1_000_000,
      paidAmount: 1_000_000,
    }),
    "CLOSED",
  );
});

test("un abono arbitrario conserva el saldo y un exceso queda como crédito", () => {
  assert.deepEqual(calculateFinancialPosition(1_000_000, 275_000), {
    total: 1_000_000,
    paid: 275_000,
    pending: 725_000,
    credit: 0,
    status: "PARTIAL",
  });
  assert.deepEqual(calculateFinancialPosition(100_000, 125_000), {
    total: 100_000,
    paid: 125_000,
    pending: 0,
    credit: 25_000,
    status: "OVERPAID",
  });
});

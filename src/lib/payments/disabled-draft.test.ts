import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPayableQuoteStage,
  markQuoteStageReady,
  normalizeQuotePaymentConfig,
} from "./quote-payments";
test("an explicitly disabled draft cannot provide a payable stage", () => {
  for (const billingType of ["ONE_TIME", "SUBSCRIPTION"] as const) {
    const draft = normalizeQuotePaymentConfig({
      totalQuoted: 11900,
      raw: { enabled: false, billingType, planMode: "FULL", defaultChannel: "FLOW" },
    });
    assert.equal(getPayableQuoteStage(draft), null);
    const enabled = markQuoteStageReady(draft, "FULL");
    assert.equal(enabled.enabled, true);
    assert.equal(getPayableQuoteStage(enabled)?.amount, 11900);
  }
});
test("enabling an absent stage cannot silently authorize another charge", () => {
  const draft = normalizeQuotePaymentConfig({
    totalQuoted: 11900,
    raw: { enabled: false, billingType: "ONE_TIME", planMode: "FULL" },
  });
  assert.throws(() => markQuoteStageReady(draft, "FINAL"), /PAYMENT_STAGE_INVALID/);
});

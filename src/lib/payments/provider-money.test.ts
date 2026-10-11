import test from "node:test";
import assert from "node:assert/strict";
import { providerClpAmount, normalizeProviderPayment } from "./provider-money";
import { parseObservation } from "./pilot-protocol";
test("real provider decimal strings retain exact whole CLP evidence", () => {
  const raw = {
    status: 2,
    flowOrder: 12345,
    commerceOrder: "stored-order",
    currency: "CLP",
    amount: "1000",
    paymentData: { currency: "CLP", amount: "1000.00", date: "2026-10-11 09:11:41" },
  };
  const normalized = normalizeProviderPayment(raw);
  assert.equal(normalized.amount, 1000);
  assert.equal((normalized.paymentData as { amount: number }).amount, 1000);
  assert.equal(parseObservation(raw).state, "CONFIRMED");
  assert.equal(parseObservation(raw).paidAt, "2026-10-11T12:11:41Z");
  assert.equal(raw.paymentData.amount, "1000.00");
});
test("CLP normalization rejects fractions, coercion and unsafe integers without rounding", () => {
  for (const v of [
    "1000.01",
    "1e3",
    "1,000",
    " 1000",
    true,
    null,
    [],
    {},
    "",
    0,
    -1,
    1000.1,
    "9007199254740993",
    Infinity,
    "-1000",
  ])
    assert.throws(() => providerClpAmount(v));
  for (const v of [1000, "1000", "1000.00", "1000.0000"]) assert.equal(providerClpAmount(v), 1000);
});

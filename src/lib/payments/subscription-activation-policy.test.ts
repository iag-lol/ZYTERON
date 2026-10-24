import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSubscriptionActivationAllowed } from "./subscription-activation-policy";

const enabled = { quoteStatus: "SENT", controlState: "APPROVED", paymentEnabled: true };

test("a card registration return cannot activate payments disabled after registration started", () => {
  assert.throws(
    () => assertSubscriptionActivationAllowed({ ...enabled, paymentEnabled: false }),
    /SUBSCRIPTION_NOT_ENABLED/,
  );
});

test("closed quotes cannot activate a subscription even with an existing card registration", () => {
  for (const quoteStatus of ["LOST", "UNKNOWN", null, undefined])
    assert.throws(
      () => assertSubscriptionActivationAllowed({ ...enabled, quoteStatus }),
      /cotización está cerrada/,
    );
  for (const controlState of ["CANCELLED", "DECLINED", "REJECTED", "EXPIRED"])
    assert.throws(
      () => assertSubscriptionActivationAllowed({ ...enabled, controlState }),
      /cotización está cerrada/,
    );
});

test("a late card registration cannot reactivate cancellation requested or confirmed", () => {
  for (const lifecycleState of ["CANCEL_REQUESTED", "CANCEL_SCHEDULED", "CANCELLED"])
    assert.throws(
      () => assertSubscriptionActivationAllowed({ ...enabled, lifecycleState }),
      /nuevo acuerdo/,
    );
});

test("enabled open subscriptions allow first activation and existing active agreements", () => {
  for (const quoteStatus of ["PENDING", "SENT", "WON"])
    for (const lifecycleState of [undefined, "ACTIVE"])
      assert.doesNotThrow(() =>
        assertSubscriptionActivationAllowed({ ...enabled, quoteStatus, lifecycleState }),
      );
});

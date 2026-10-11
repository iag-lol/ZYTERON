import test from "node:test";
import assert from "node:assert/strict";
import { createCheckoutGrant, readCheckoutGrant } from "./checkout-grant";
test("checkout private receipt grant rejects tampering, expiry and a future expiry", () => {
  const previous = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "local-test-only-secret-with-at-least-32-characters";
  try {
    const now = 10000000,
      g = createCheckoutGrant("order-owned", "a".repeat(64), now);
    assert.deepEqual(readCheckoutGrant(g, now), {
      orderId: "order-owned",
      tokenHash: "a".repeat(64),
    });
    assert.equal(readCheckoutGrant(g, now + 1800000), null);
    assert.equal(readCheckoutGrant(g, now - 1), null);
    assert.equal(readCheckoutGrant("x" + g, now), null);
    assert.equal(readCheckoutGrant(g + ".extra", now), null);
    assert.equal(readCheckoutGrant("malformed", now), null);
    assert.ok(!g.includes("provider-token"));
  } finally {
    if (previous === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = previous;
  }
});

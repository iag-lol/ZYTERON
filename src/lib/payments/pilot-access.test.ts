import assert from "node:assert/strict";
import test from "node:test";
import { pilotAccessScope, pilotReadAllowed } from "./pilot-access";

test("expired capabilities can only recover a confirmed test receipt with read-only access", () => {
  const now = Date.parse("2026-10-12T16:00:00Z");
  const expired = "2026-10-11T16:00:00Z";
  assert.equal(pilotAccessScope("CONFIRMED", expired, now), "READ");
  for (const state of ["NOT_STARTED", "CREATING", "CREATE_UNKNOWN", "PENDING", "REJECTED", "CANCELLED"])
    assert.throws(() => pilotAccessScope(state, expired, now), /PILOT_ACCESS_DENIED/);
  assert.throws(() => pilotAccessScope("CONFIRMED", "invalid", now));
  assert.equal(pilotAccessScope("NOT_STARTED", "2026-10-12T17:00:00Z", now), "PAY");
  assert.equal(pilotReadAllowed("PAY", "CONFIRMED"), false);
  assert.equal(pilotReadAllowed("READ", "PENDING"), false);
  assert.equal(pilotReadAllowed("READ", "CONFIRMED"), true);
});

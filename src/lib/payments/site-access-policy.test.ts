import assert from "node:assert/strict";
import test from "node:test";
import {
  decideSiteAccess,
  parseSiteBindings,
  siteSignature,
  validSiteSignature,
} from "./site-access-policy";
import { projectMonthlyPayments } from "./payment-projection";
const now = new Date("2026-10-11T15:00:00Z");
test("site maintenance requires exact binding, confirmed cancellation and exhausted paid period", () => {
  const state = {
    state: "CANCELLED",
    verifiedAt: now,
    paidThrough: new Date("2026-11-11T15:00:00Z"),
    now,
  };
  assert.equal(decideSiteAccess(state), "ACTIVE");
  assert.equal(
    decideSiteAccess({ ...state, paidThrough: new Date("2026-10-10T15:00:00Z") }),
    "MAINTENANCE",
  );
  assert.equal(decideSiteAccess({ ...state, paidThrough: null }), "ACTIVE");
  assert.equal(decideSiteAccess({ ...state, state: "CANCEL_SCHEDULED" }), "ACTIVE");
  assert.equal(
    decideSiteAccess({
      ...state,
      paidThrough: new Date("2026-10-10"),
      verifiedAt: new Date("2026-10-10"),
    }),
    "REVIEW_REQUIRED",
  );
  const key = "a".repeat(64),
    b = { siteId: "client-site-01", quoteId: "q", origin: "https://client.example", secret: key };
  assert.equal(parseSiteBindings(JSON.stringify([b])).length, 1);
  assert.throws(() => parseSiteBindings(JSON.stringify([b, b])));
  assert.throws(() =>
    parseSiteBindings(JSON.stringify([{ ...b, origin: "https://www.zyteron.cl" }])),
  );
  assert.equal(validSiteSignature(key, "body", siteSignature(key, "body")), true);
  assert.equal(validSiteSignature(key, "changed", siteSignature(key, "body")), false);
});
test("annual projection clamps month days, excludes canceled subscriptions and remains an estimate", () => {
  const s = {
    quoteId: "q",
    label: "maintenance",
    amount: 20000,
    nextDate: "2026-01-31",
    activatedAt: null,
    state: "ACTIVE",
    paidThrough: null,
  };
  const p = projectMonthlyPayments(s, 2026);
  assert.equal(p.length, 12);
  assert.equal(projectMonthlyPayments({ ...s, state: "CANCEL_REQUESTED" }, 2026).length, 12);
  assert.equal(p[1].date, "2026-02-28");
  assert.equal(p[3].date, "2026-04-30");
  assert.deepEqual(projectMonthlyPayments({ ...s, state: "CANCEL_SCHEDULED" }, 2026), []);
  assert.deepEqual(projectMonthlyPayments(s, 2019), []);
});

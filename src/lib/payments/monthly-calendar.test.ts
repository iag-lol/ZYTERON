import test from "node:test";
import assert from "node:assert/strict";
import {
  monthlyNextDate,
  monthlyOnOrAfter,
  billingPhase,
  billingToday,
  dueInstant,
} from "./monthly-calendar";
test("monthly periods preserve day 31 across February and leap years", () => {
  assert.equal(monthlyNextDate("2027-01-31", "2027-01-31"), "2027-02-28");
  assert.equal(monthlyNextDate("2027-01-31", "2027-02-28"), "2027-03-31");
  assert.equal(monthlyNextDate("2028-01-31", "2028-01-31"), "2028-02-29");
  assert.equal(monthlyNextDate("2026-12-31", "2026-12-31"), "2027-01-31");
});
test("resuming a paused calendar skips paused periods", () => {
  assert.equal(monthlyOnOrAfter("2026-01-31", "2026-03-02"), "2026-03-31");
  assert.equal(monthlyOnOrAfter("2026-01-15", "2026-03-20"), "2026-04-15");
  assert.equal(monthlyOnOrAfter("2026-01-15", "2026-03-15"), "2026-03-15");
});
test("reminders use Santiago civil days at the documented milestones", () => {
  assert.equal(billingToday(new Date("2026-10-21T01:00:00Z")), "2026-10-20");
  assert.equal(dueInstant("2026-10-20").toISOString(), "2026-10-21T02:59:59.000Z");
  assert.equal(billingPhase("2026-10-24", "2026-10-20"), null);
  assert.equal(billingPhase("2026-10-23", "2026-10-20"), "UPCOMING");
  assert.equal(billingPhase("2026-10-20", "2026-10-20"), "DUE");
  assert.equal(billingPhase("2026-10-13", "2026-10-20"), "OVERDUE7");
  assert.equal(billingPhase("2026-09-20", "2026-10-20"), "OVERDUE30");
});

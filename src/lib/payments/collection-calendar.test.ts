import test from "node:test";
import assert from "node:assert/strict";
import { calendarDate, collectionAnchor, suspensionDate } from "./collection-calendar";
import { monthlyNextDate } from "./monthly-calendar";
test("editable billing day retains 31 after short months", () => {
  assert.equal(calendarDate("2027-02-12", 31), "2027-02-28");
  assert.equal(calendarDate("2028-02-12", 31), "2028-02-29");
  assert.equal(monthlyNextDate(collectionAnchor(31), "2027-02-28"), "2027-03-31");
});
test("suspension begins only after the due day and all full grace days", () => {
  assert.equal(suspensionDate("2026-10-20", 0), "2026-10-21");
  assert.equal(suspensionDate("2026-10-20", 7), "2026-10-28");
  assert.equal(suspensionDate("2026-12-31", 7), "2027-01-08");
  assert.equal(suspensionDate("2028-02-28", 1), "2028-03-01");
});

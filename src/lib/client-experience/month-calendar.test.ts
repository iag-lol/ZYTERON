import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agendaEventDate,
  agendaEventTime,
  calendarReference,
  monthDays,
  shiftMonth,
} from "./month-calendar";
test("calendar shows real dates in complete Monday to Sunday weeks, including leap years", () => {
  for (let year = 2020; year <= 2100; year++)
    for (let month = 1; month <= 12; month++) {
      const days = monthDays(year, month),
        dates = days.filter(Boolean);
      assert.equal(days.length % 7, 0);
      assert.equal(dates.length, new Date(Date.UTC(year, month, 0)).getUTCDate());
      assert.equal(
        days.indexOf(dates[0]),
        (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7,
      );
      assert.equal(new Set(dates).size, dates.length);
    }
  assert.equal(monthDays(2028, 2).filter(Boolean).length, 29);
  assert.throws(() => monthDays(2026, 13));
});
test("month navigation crosses years and today follows Chile civil time", () => {
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(calendarReference("2026-11-01T01:00:00Z"), {
    date: "2026-10-31",
    year: 2026,
    month: 10,
  });
});

test("date-only agenda publications retain the admin date and do not invent a meeting time", () => {
  assert.equal(agendaEventDate("2026-10-27T00:00:00.000Z"), "2026-10-27");
  assert.equal(agendaEventTime("2026-10-27T00:00:00.000Z"), "Horario por confirmar");
  assert.equal(agendaEventDate("2026-10-27T01:00:00Z"), "2026-10-26");
  assert.equal(agendaEventTime("2026-10-27T15:00:00Z"), "12:00");
});

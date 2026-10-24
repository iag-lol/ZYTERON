import test from "node:test";
import assert from "node:assert/strict";
import { receivableDateChange } from "./receivable-date";
import { dueInstant } from "../payments/monthly-calendar";
const row = {
  clientId: "qa-client",
  status: "PARTIAL",
  totalAmount: 1000,
  dueAt: new Date("2026-10-20T23:59:59Z"),
  allocations: [{ amount: 200 }],
};
const input = { dueDate: "2026-11-05", expectedDueAt: row.dueAt.toISOString() };
test("vencimiento de saldo parcial respeta fecha de Santiago y conserva importes y abonos", () => {
  const before = structuredClone(row),
    out = receivableDateChange(row, "qa-client", input);
  assert.equal(out.date.toISOString(), dueInstant(input.dueDate).toISOString());
  assert.equal(out.changed, true);
  assert.deepEqual(row, before);
});
test("otra empresa, cuenta pagada, anulada y versión obsoleta no se reprograman", () => {
  for (const candidate of [
    null,
    { ...row, clientId: "other" },
    { ...row, status: "PAID" },
    { ...row, status: "CANCELLED" },
    { ...row, allocations: [{ amount: 1000 }] },
  ])
    assert.throws(() => receivableDateChange(candidate, "qa-client", input));
  assert.throws(
    () => receivableDateChange(row, "qa-client", { ...input, expectedDueAt: null }),
    /STALE/,
  );
});
test("el reintento del mismo vencimiento es idempotente", () => {
  const changed = { ...row, dueAt: dueInstant(input.dueDate) };
  assert.equal(receivableDateChange(changed, "qa-client", input).changed, false);
});

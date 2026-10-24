import test from "node:test";
import assert from "node:assert/strict";
import { collectionArchive, receivableArchiveChange } from "./receivable-archive";

const now = new Date("2026-10-24T12:00:00Z");
const row = { clientId: "cliente", status: "PENDING", totalAmount: 195134, dueAt: null, metadata: { imported: true }, allocations: [] as { amount: number }[] };
const input = { operation: "archive" as const, reason: "Eliminar mensualidad solicitada", expectedBalance: 195134 };

test("elimina el cobro indicado conservando monto, metadatos y pagos originales", () => {
  const next = receivableArchiveChange(row, "cliente", input, "admin", now)!;
  assert.equal(next.status, "CANCELLED");
  assert.equal((next.metadata as Record<string, unknown>).imported, true);
  assert.equal(collectionArchive(next.metadata)?.active, true);
  assert.equal(row.status, "PENDING");
  assert.equal(row.totalAmount, 195134);
  assert.deepEqual(row.allocations, []);
  assert.ok(!("totalAmount" in next));
  assert.ok(!("allocations" in next));
});
test("valida propietario antes de idempotencia y no elimina un saldo actualizado por un pago", () => {
  assert.throws(() => receivableArchiveChange(row, "otro-cliente", input, "admin", now), /NOT_FOUND/);
  assert.throws(() => receivableArchiveChange({ ...row, allocations: [{ amount: 100000 }] }, "cliente", input, "admin", now), /STALE/);
  const next = receivableArchiveChange(row, "cliente", input, "admin", now)!;
  assert.equal(receivableArchiveChange({ ...row, ...next }, "cliente", input, "admin", now), null);
  assert.throws(() => receivableArchiveChange({ ...row, ...next }, "otro-cliente", input, "admin", now), /NOT_FOUND/);
});
test("restaurar recalcula mora y abonos sin reactivar cobros ya anulados por otros flujos", () => {
  const next = receivableArchiveChange(row, "cliente", input, "admin", now)!;
  const restore = { ...input, operation: "restore" as const, expectedBalance: 95134 };
  const restored = receivableArchiveChange({ ...row, ...next, dueAt: new Date("2026-10-20T12:00:00Z"), allocations: [{ amount: 100000 }] }, "cliente", restore, "admin", now)!;
  assert.equal(restored.status, "OVERDUE");
  assert.equal(collectionArchive(restored.metadata)?.active, false);
  assert.throws(() => receivableArchiveChange({ ...row, status: "CANCELLED" }, "cliente", { ...input, operation: "restore" }, "admin", now), /NOT_RESTORABLE/);
});
test("un cobro pagado no se elimina y una restauración conserva su estado pagado", () => {
  assert.throws(() => receivableArchiveChange({ ...row, status: "PAID", allocations: [{ amount: 195134 }] }, "cliente", { ...input, expectedBalance: 0 }, "admin", now), /CLOSED/);
  const next = receivableArchiveChange(row, "cliente", input, "admin", now)!;
  const restored = receivableArchiveChange({ ...row, ...next, allocations: [{ amount: 195134 }] }, "cliente", { ...input, operation: "restore", expectedBalance: 0 }, "admin", now)!;
  assert.equal(restored.status, "PAID");
});

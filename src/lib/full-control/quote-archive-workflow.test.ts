import test from "node:test";
import assert from "node:assert/strict";
import { quoteArchiveWorkflow } from "./quote-archive-workflow";
test("Eliminar resuelve cancelación Flow desde la misma acción y espera confirmación", async () => {
  for (const state of ["ACTIVE", "CANCEL_REQUESTED"]) {
    const calls: string[] = [];
    const out = await quoteArchiveWorkflow({
      control: async () => ({ managed: true, state }),
      requestCancellation: async () => {
        calls.push("cancel");
      },
      archiveState: async () => "ARCHIVED",
      archive: async () => {
        calls.push("manual");
      },
    });
    assert.deepEqual(out, { ok: true, pending: false });
    assert.deepEqual(calls, ["cancel"]);
  }
});
test("una respuesta pendiente del proveedor no se presenta como eliminación terminada", async () => {
  let archived = false;
  const out = await quoteArchiveWorkflow({
    control: async () => ({ managed: true, state: "ACTIVE" }),
    requestCancellation: async () => {},
    archiveState: async () => "PENDING_CANCELLATION",
    archive: async () => {
      archived = true;
    },
  });
  assert.equal(out.pending, true);
  assert.equal(archived, false);
});
test("sin suscripción o con cancelación ya verificada se conserva el flujo local", async () => {
  for (const control of [
    { managed: false },
    { managed: true, state: "CANCEL_SCHEDULED" },
    { managed: true, state: "CANCELLED" },
  ]) {
    let archived = 0,
      cancelled = 0;
    const out = await quoteArchiveWorkflow({
      control: async () => control,
      requestCancellation: async () => {
        cancelled++;
      },
      archiveState: async () => undefined,
      archive: async () => {
        archived++;
      },
    });
    assert.equal(out.pending, false);
    assert.equal(archived, 1);
    assert.equal(cancelled, 0);
  }
});
test("un cliente ajeno o fallo al registrar la solicitud no genera una eliminación parcial", async () => {
  let writes = 0;
  const operations = {
    control: async () => {
      throw Error("OWNER_REQUIRED");
    },
    requestCancellation: async () => {
      writes++;
    },
    archiveState: async () => undefined,
    archive: async () => {
      writes++;
    },
  };
  await assert.rejects(quoteArchiveWorkflow(operations), /OWNER_REQUIRED/);
  assert.equal(writes, 0);
  await assert.rejects(
    quoteArchiveWorkflow({
      ...operations,
      control: async () => ({ managed: true, state: "ACTIVE" }),
      requestCancellation: async () => {
        throw Error("PERSISTENCE_FAILED");
      },
    }),
    /PERSISTENCE_FAILED/,
  );
  assert.equal(writes, 0);
});

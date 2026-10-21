import assert from "node:assert/strict";
import test from "node:test";
import { currentProjectStep, projectGuide, startTask } from "./project-guide";
test("el siguiente paso mantiene separadas revisión, publicación y finalización", () => {
  assert.equal(projectGuide("READY", 0).next, "IN_PROGRESS");
  assert.equal(projectGuide("IN_PROGRESS", 3).next, "INTERNAL_REVIEW");
  assert.match(projectGuide("IN_PROGRESS", 3).text, /3 tareas o etapas/);
  assert.equal(projectGuide("QA", 0).next, "READY_FOR_PRODUCTION");
  assert.equal(projectGuide("READY_FOR_PRODUCTION", 0).confirm, true);
  assert.equal(projectGuide("PRODUCTION", 0).next, "COMPLETED");
  assert.equal(projectGuide("PRODUCTION", 0).confirm, true);
});
test("pausas y espera se presentan como tales sin inventar pasos completados", () => {
  assert.equal(currentProjectStep("ON_HOLD"), null);
  assert.equal(currentProjectStep("CANCELLED"), null);
  assert.equal(projectGuide("WAITING_CLIENT", 2).next, "IN_PROGRESS");
  assert.equal(projectGuide("CANCELLED", 0).next, undefined);
  assert.equal(projectGuide("ARCHIVED", 0).next, undefined);
});
test("empezar una tarea antigua respeta las dos transiciones del servidor", async () => {
  const calls: string[] = [];
  await startTask("BACKLOG", async (state) => {
    calls.push(state);
  });
  assert.deepEqual(calls, ["TODO", "IN_PROGRESS"]);
});
test("un fallo al preparar una tarea detiene el avance y conserva el error", async () => {
  const calls: string[] = [];
  await assert.rejects(
    () =>
      startTask("BACKLOG", async (state) => {
        calls.push(state);
        throw Error("Sin conexión");
      }),
    /Sin conexión/,
  );
  assert.deepEqual(calls, ["TODO"]);
});
test("retomar y reabrir no marca la tarea como terminada", async () => {
  for (const status of ["BLOCKED", "DONE", "TODO"] as const) {
    const calls: string[] = [];
    await startTask(status, async (state) => {
      calls.push(state);
    });
    assert.deepEqual(calls, ["IN_PROGRESS"]);
  }
  await assert.rejects(
    () =>
      startTask("CANCELLED", async () => {
        throw Error("No debería ejecutarse");
      }),
    /no se puede reabrir/,
  );
});

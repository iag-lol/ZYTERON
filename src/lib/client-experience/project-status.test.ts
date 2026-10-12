import { test } from "node:test";
import assert from "node:assert/strict";
import { projectStatus } from "./project-status";
test("completed legacy projects are excluded from in-progress counts", () => {
  const states = ["En curso", "IN_PROGRESS", "Completado"];
  assert.equal(states.map(projectStatus).filter((s) => s === "IN_PROGRESS").length, 2);
  assert.equal(projectStatus("Completado"), "DONE");
});
test("planned or unknown states never become progress evidence", () => {
  assert.equal(projectStatus("Planificado"), "PLANNED");
  assert.equal(projectStatus("En pausa"), "En pausa");
  assert.equal(projectStatus(null), "PENDING");
});

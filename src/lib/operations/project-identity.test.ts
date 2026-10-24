import test from "node:test";
import assert from "node:assert/strict";
import {
  isSpecificProjectName,
  projectTitleFromServices,
  projectDateOnly,
} from "./project-identity";
import { civil } from "../../full-portal/production-model";
test("project names describe the work instead of repeating the client", () => {
  const names = ["SOCIEDAD DE TRANSPORTES Y DIESEL SpA", "Fenice"];
  for (const name of [
    "",
    "Proyecto",
    "Nuevo proyecto",
    "Proyecto · SOCIEDAD DE TRANSPORTES Y DIESEL SpA",
    "sociedad de transportes y diesel spa",
    "Fenice",
  ])
    assert.equal(isSpecificProjectName(name, names), false, name);
  for (const name of [
    "Diseño de Fleet Control",
    "Sitio web Fenice.cl",
    "Mejoramiento SEO para fenice.cl",
    "Creación de software GPS de flota Fenice",
  ])
    assert.equal(isSpecificProjectName(name, names), true, name);
  assert.equal(isSpecificProjectName("Proyecto ÁVILA SpA", ["Avila SPA"]), false);
});
test("quote project titles use service descriptions and an exact reference", () => {
  assert.equal(
    projectTitleFromServices(
      ["Diseño de Fleet Control", "Diseño de Fleet Control"],
      "COT-2026-09804",
    ),
    "Diseño de Fleet Control · COT-2026-09804",
  );
  assert.notEqual(
    projectTitleFromServices(["Sitio web"], "COT-1"),
    projectTitleFromServices(["Sitio web"], "COT-2"),
  );
  assert.throws(() => projectTitleFromServices(["   "], "COT-1"));
  assert.ok(projectTitleFromServices(["a".repeat(600)], "COT-1").length <= 160);
});

test("project DATE values keep their calendar day in the client portal", () => {
  for (const date of ["2026-09-30", "2026-07-18", "2026-06-12"]) {
    assert.equal(
      civil(projectDateOnly(new Date(`${date}T00:00:00Z`))),
      date.split("-").reverse().join("-"),
    );
  }
  assert.equal(projectDateOnly(null), null);
});

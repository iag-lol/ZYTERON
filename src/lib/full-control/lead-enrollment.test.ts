import test from "node:test";
import assert from "node:assert/strict";
import { leadEnrollmentSchema, enrollmentError } from "./lead-enrollment";
const valid = {
  rut: "11.111.111-1",
  legalName: "Empresa QA",
  email: "QA@example.invalid",
  password: "AccesoQA2026!",
  confirmPassword: "AccesoQA2026!",
};
test("conversión valida RUT, fortaleza, confirmación y límites bcrypt", () => {
  const out = leadEnrollmentSchema.parse(valid);
  assert.equal(out.rut, "11111111-1");
  assert.equal(out.email, "qa@example.invalid");
  for (const patch of [
    { rut: "11111111-2" },
    { password: "debil", confirmPassword: "debil" },
    { confirmPassword: "distinta" },
    { password: "A1" + "á".repeat(38), confirmPassword: "A1" + "á".repeat(38) },
    { role: "ADMIN" },
  ])
    assert.equal(leadEnrollmentSchema.safeParse({ ...valid, ...patch }).success, false);
});
test("conflicto de cuenta explica que no se reemplaza la contraseña y oculta errores internos", () => {
  assert.match(
    enrollmentError(new Error("Database: ENROLLMENT_EMAIL_EXISTS")),
    /No se cambió su contraseña/,
  );
  assert.doesNotMatch(
    enrollmentError(new Error("internal connection secret")),
    /secret|connection/,
  );
});

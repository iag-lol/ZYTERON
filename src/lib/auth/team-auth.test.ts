import test from "node:test";
import assert from "node:assert/strict";
import { teamAuthenticate, type TeamAuthDependencies } from "./team-auth";
import { normalizeUserRut } from "../../full-control/lib/user-rut";

function setup({
  exists = true,
  role = "EJECUTIVA_VENTAS",
  banned = false,
  correctPassword = true,
} = {}) {
  const calls: Array<unknown[]> = [],
    user = {
      id: "staff-id",
      email: "ventas@example.test",
      app_metadata: { role },
      ...(banned ? { banned_until: "2999-01-01T00:00:00Z" } : {}),
    };
  const deps: TeamAuthDependencies = {
    async lookupRut(rut) {
      calls.push(["lookup", rut]);
      return exists ? user.id : null;
    },
    async user() {
      return user;
    },
    async signIn(email, password) {
      calls.push(["signIn", email, password]);
      return correctPassword
        ? { user, access_token: "access-test", refresh_token: "refresh-test" }
        : null;
    },
    async recover(email) {
      calls.push(["recover", email]);
    },
  };
  return { deps, calls };
}
test("el ingreso resuelve el RUT normalizado y verifica la contraseña de esa misma identidad", async () => {
  const { deps, calls } = setup();
  const result = await teamAuthenticate({ rut: "12.345.678-5", password: "test-password" }, deps);
  assert.equal(result.status, 200);
  assert.deepEqual(calls[0], ["lookup", "12345678-5"]);
  assert.deepEqual(calls[1], ["signIn", "ventas@example.test", "test-password"]);
  assert.deepEqual(result.body.session, {
    access_token: "access-test",
    refresh_token: "refresh-test",
  });
  assert.equal(JSON.stringify(result.body).includes("ventas@example.test"), false);
});
test("RUT inexistente, cuenta bloqueada, cliente y contraseña incorrecta comparten el mismo rechazo", async () => {
  for (const options of [
    { exists: false },
    { banned: true },
    { role: "PORTAL_CLIENT" },
    { correctPassword: false },
  ]) {
    const { deps } = setup(options);
    const result = await teamAuthenticate(
      {
        rut: "12345678-5",
        password: "test-password",
        role: "GERENTE_GENERAL",
        email: "other@example.test",
      },
      deps,
    );
    assert.deepEqual(result, { status: 401, body: { error: "RUT o contraseña incorrectos." } });
  }
});
test("no se admite correo como identificador ni RUT con DV inválido", async () => {
  for (const rut of ["ventas@example.test", "12.345.678-9", "", "12345678-5<script>"]) {
    const { deps, calls } = setup();
    assert.equal((await teamAuthenticate({ rut, password: "test" }, deps)).status, 401);
    assert.equal(calls.length, 0);
  }
  assert.equal(normalizeUserRut("12.345.678-5"), "12345678-5");
  assert.equal(normalizeUserRut("012345678-5"), "12345678-5");
});
test("la recuperación no expone el correo ni confirma si el RUT existe", async () => {
  const known = setup(),
    unknown = setup({ exists: false });
  const a = await teamAuthenticate({ rut: "12345678-5", action: "recover" }, known.deps),
    b = await teamAuthenticate({ rut: "12345678-5", action: "recover" }, unknown.deps);
  assert.deepEqual(a, b);
  assert.deepEqual(known.calls[1], ["recover", "ventas@example.test"]);
  assert.equal(unknown.calls.length, 1);
});

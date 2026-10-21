import assert from "node:assert/strict";
import { test } from "node:test";
import { dteConnectionSummary } from "./dte-connection";
test("semilla conectada sin certificado no se presenta como autenticación", () => {
  const result = dteConnectionSummary({
    provider: "SII_DIRECT",
    environment: "CERTIFICATION",
    seedService: "CONNECTED",
    certificate: "NOT_CONFIGURED",
    authenticated: false,
  });
  assert.equal(result.connected, true);
  assert.equal(result.authenticated, false);
  assert.match(result.authenticationLabel, /pendiente/);
  assert.match(result.environmentLabel, /sin validez tributaria/);
});
test("solo presenta autenticación cuando todos los estados oficiales coinciden", () => {
  const good = {
    provider: "SII_DIRECT",
    environment: "CERTIFICATION",
    seedService: "CONNECTED",
    certificate: "VALID",
    authenticated: true,
  };
  assert.equal(dteConnectionSummary(good).authenticated, true);
  for (const patch of [
    { authenticated: "true" },
    { seedService: null },
    { certificate: "EXPIRED" },
    { provider: "EXTERNAL" },
  ])
    assert.equal(dteConnectionSummary({ ...good, ...patch }).authenticated, false);
});
test("respuestas parciales no inventan ambiente, fecha ni conectividad y no propagan secretos", () => {
  const result = dteConnectionSummary({
    provider: "OTHER",
    environment: "OTHER",
    token: "private-should-not-render",
    checkedAt: "bad",
  });
  assert.equal(result.environment, "UNKNOWN");
  assert.equal(result.checkedAt, null);
  assert.equal(result.connected, false);
  assert.doesNotMatch(JSON.stringify(result), /private-should-not-render/);
  assert.equal(dteConnectionSummary(null).authenticated, false);
});

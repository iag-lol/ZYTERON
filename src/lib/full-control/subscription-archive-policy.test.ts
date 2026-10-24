import test from "node:test";
import assert from "node:assert/strict";
import { assertSubscriptionArchivable } from "./subscription-archive-policy";
test("una suscripción activa o cancelación sin confirmar no puede ocultarse como cancelada", () => {
  for (const life of [
    undefined,
    { state: "ACTIVE", verified_at: new Date() },
    { state: "CANCEL_REQUESTED", verified_at: null },
    { state: "CANCEL_SCHEDULED", verified_at: null },
  ])
    assert.throws(
      () => assertSubscriptionArchivable({ subscriptionId: "synthetic-only" }, life, false),
      /FLOW_MANAGED/,
    );
});
test("cancelación verificada conserva el período y permite archivar el registro", () => {
  for (const state of ["CANCEL_SCHEDULED", "CANCELLED"])
    assert.doesNotThrow(() =>
      assertSubscriptionArchivable(
        { subscriptionId: "synthetic-only" },
        { state, verified_at: new Date() },
        false,
      ),
    );
});
test("registro pendiente sólo se archiva si no hay creación enviada o incierta al proveedor", () => {
  assert.doesNotThrow(() =>
    assertSubscriptionArchivable({ registerToken: "synthetic-only" }, undefined, false),
  );
  assert.throws(
    () => assertSubscriptionArchivable({ registerToken: "synthetic-only" }, undefined, true),
    /FLOW_MANAGED/,
  );
  assert.doesNotThrow(() => assertSubscriptionArchivable(undefined, undefined, false));
});

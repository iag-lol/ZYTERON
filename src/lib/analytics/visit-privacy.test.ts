import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isExcludedWebVisitPath,
  normalizeWebVisitPath,
  sanitizeWebVisitReferrer,
} from "./visit-privacy";

describe("web visit privacy", () => {
  it("drops query strings and fragments from tracked paths", () => {
    assert.equal(normalizeWebVisitPath("/servicios?utm_source=google#contacto"), "/servicios");
  });

  it("rejects private, operational and payment paths on segment boundaries", () => {
    for (const path of [
      "/admin",
      "/admin/ventas",
      "/api/health",
      "/portal-clientes/panel",
      "/portal-comercial",
      "/checkout/finalizado",
      "/pagos/finalizado",
    ]) {
      assert.equal(isExcludedWebVisitPath(path), true, path);
    }

    assert.equal(isExcludedWebVisitPath("/administracion-web"), false);
    assert.equal(isExcludedWebVisitPath("/cotizador"), false);
  });

  it("removes query, fragment and credentials from referrers", () => {
    assert.equal(
      sanitizeWebVisitReferrer("https://user:secret@example.com/landing?token=secret#section"),
      "https://example.com/landing",
    );
    assert.equal(
      sanitizeWebVisitReferrer("https://zyteron.cl/portal-clientes/panel?token=secret"),
      "",
    );
  });

  it("rejects absolute and protocol-relative tracked paths", () => {
    assert.equal(normalizeWebVisitPath("https://example.com/private?token=secret"), "");
    assert.equal(normalizeWebVisitPath("//example.com/private"), "");
  });
});

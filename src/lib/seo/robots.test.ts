import assert from "node:assert/strict";
import { describe, it } from "node:test";

import nextConfig from "../../../next.config";
import robots from "../../app/robots";

describe("robots.txt", () => {
  it("permite rastrear HTML privado para que los buscadores lean noindex", () => {
    const rules = robots().rules;
    const normalized = Array.isArray(rules) ? rules : [rules];
    const disallowed = normalized.flatMap((rule) => {
      const values = rule.disallow ?? [];
      return Array.isArray(values) ? values : [values];
    });

    assert.ok(disallowed.includes("/api/"));
    for (const htmlPath of [
      "/admin/",
      "/portal-clientes/",
      "/portal-comercial/",
      "/checkout/",
      "/pagos/",
    ]) {
      assert.ok(!disallowed.includes(htmlPath), `${htmlPath} debe poder exponer su noindex`);
    }
  });

  it("emite X-Robots-Tag en áreas privadas y resultados de pago", async () => {
    const rules = await nextConfig.headers!();
    const protectedRoutes = new Set([
      "/admin/:path*",
      "/portal-clientes/:path*",
      "/portal-comercial/:path*",
      "/checkout/:path*",
      "/pagos/:path*",
      "/roadmap",
    ]);

    for (const rule of rules) {
      if (!protectedRoutes.has(rule.source)) continue;
      assert.ok(
        rule.headers.some(
          (header) =>
            header.key.toLowerCase() === "x-robots-tag" && header.value.includes("noindex"),
        ),
        `${rule.source} debe emitir X-Robots-Tag noindex`,
      );
      protectedRoutes.delete(rule.source);
    }

    assert.deepEqual([...protectedRoutes], [], "faltan rutas privadas con noindex");
  });
});

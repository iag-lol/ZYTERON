import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test, mock } from "node:test";
const catalogModule = await import("../src/content/integration-catalog.ts");
const { integrationGroups, integrationPlatforms, integrationPlatformCount } =
  catalogModule.default ?? catalogModule;

test("El catálogo conserva una fuente oficial y un logo local para cada plataforma", () => {
  assert.equal(integrationPlatformCount, 105);
  assert.equal(integrationGroups.length, 18);
  assert.equal(new Set(integrationPlatforms.map((platform) => platform.id)).size, 105);
  for (const platform of integrationPlatforms) {
    assert.equal(new URL(platform.docs).protocol, "https:");
    assert.ok(platform.use.length > 35, platform.id);
    assert.ok(platform.requirement.length > 35, platform.id);
    assert.ok(
      existsSync(new URL(`../public/home/integraciones/${platform.logo}`, import.meta.url)),
      platform.id,
    );
  }
  for (const id of ["sii", "firmagob", "claveunica", "mercadolibre", "ecert", "meta", "openai"])
    assert.ok(integrationPlatforms.find((platform) => platform.id === id));
  assert.match(
    integrationPlatforms.find((platform) => platform.id === "claveunica").requirement,
    /elegibilidad|instituci|Gobierno Digital/,
  );
  assert.match(
    integrationPlatforms.find((platform) => platform.id === "firmagob").requirement,
    /Exclusivo de instituciones públicas/,
  );
});

test("El sitemap publica la ruta canónica de integraciones una sola vez", async () => {
  mock.module(new URL("../src/lib/admin/blog-cases-repository.ts", import.meta.url).href, {
    exports: { getPublishedBlogPosts: async () => [], getPublishedCaseStudies: async () => [] },
  });
  mock.module(new URL("../src/lib/becas/public-winners.ts", import.meta.url).href, {
    exports: { getPublishedScholarshipWinnerRoutes: async () => [] },
  });
  const sitemapModule = await import("../src/app/sitemap.ts");
  const sitemap = sitemapModule.default?.default ?? sitemapModule.default;
  const routes = await sitemap();
  const integrations = routes.filter(
    (route) => route.url === "https://www.zyteron.cl/integraciones",
  );
  assert.equal(integrations.length, 1);
  assert.equal(integrations[0].changeFrequency, "monthly");
});

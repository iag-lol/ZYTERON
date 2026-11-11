import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origin = process.argv[2] || "http://127.0.0.1:3124";
const output = process.argv[3] || "output/integrations-11-11-2026";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error("Solo se permiten pruebas en localhost.");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await context.route("**/*", (route) => {
      const request = route.request();
      if (!request.url().startsWith(origin) || !["GET", "HEAD"].includes(request.method()))
        return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const home = await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(home.status(), 200);
    assert.equal(await page.locator("h1").count(), 1);
    assert.match(await page.locator("h1").innerText(), /Desarrollo de software/);
    assert.equal(
      await page.locator("#directorio-integraciones").count(),
      0,
      "El directorio completo no debe estar en Inicio.",
    );
    assert.equal(
      await page.locator("#integration-search").count(),
      0,
      "El buscador completo no debe estar en Inicio.",
    );
    assert.equal(
      await page.locator("#integraciones [data-platform]").count(),
      0,
      "Las tarjetas del catálogo pertenecen a su página independiente.",
    );
    assert.equal(await page.locator("#integraciones [data-integration-preview]").count(), 4);
    await page.locator("#integraciones img").evaluateAll(async (images) => {
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode()));
    });
    if (width < 1280) {
      await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
      await expect(
        page
          .getByRole("navigation", { name: "Navegación móvil" })
          .getByRole("link", { name: "Integraciones", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    } else {
      await expect(
        page
          .getByRole("navigation", { name: "Navegación principal" })
          .getByRole("link", { name: "Integraciones", exact: true }),
      ).toBeVisible();
    }
    const plans = page.getByRole("group", { name: "Plan para cotizar" });
    assert.equal(await plans.getByRole("button").count(), 6);
    if ([1440, 390].includes(width))
      await page
        .locator("#integraciones")
        .screenshot({
          path: `${output}/inicio-resumen-${width}.png`,
          style: "header{opacity:0!important}",
        });

    const response = await page.goto(`${origin}/integraciones`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("h1").count(), 1);
    assert.match(await page.title(), /Integraciones de Sistemas y API en Chile/);
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute("href"),
      "https://www.zyteron.cl/integraciones",
    );
    const schema = JSON.parse(await page.locator("#integrations-catalog-schema").textContent());
    assert.equal(schema.numberOfItems, 105);
    assert.equal(schema.itemListElement.length, 105);
    const directory = page.locator("#directorio-integraciones");
    assert.equal(await directory.locator("li").count(), 105);
    const cards = page.locator("#integration-results [data-platform]");
    assert.equal(await cards.count(), 16);

    await page.getByLabel("¿Qué herramienta necesitas conectar?").fill("Mercado Libre");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute("data-platform", "mercadolibre");
    const front = cards.first().locator("button[aria-expanded]");
    await front.focus();
    await page.keyboard.press("Enter");
    await expect(cards.first()).toHaveAttribute("data-flipped", "true");
    await expect(cards.first().locator("button[aria-label^='Volver']")).toBeFocused();
    await expect(cards.first().locator("a[href*='tipo=automatizacion']")).toBeVisible();
    if ([1440, 390].includes(width))
      await cards.first().screenshot({ path: `${output}/tarjeta-reverso-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(front).toBeFocused();
    await page.keyboard.press("Space");
    await expect(cards.first()).toHaveAttribute("data-flipped", "true");
    await cards.first().locator("button[aria-label^='Volver']").click();
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await page.getByLabel("Área de trabajo").selectOption("firmas");
    await expect(cards).toHaveCount(7);
    await page.getByLabel("Área de trabajo").selectOption("publico");
    await expect(cards).toHaveCount(4);
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await page.getByLabel("¿Qué herramienta necesitas conectar?").fill("sincoincidenciaxyz");
    await expect(cards).toHaveCount(0);
    await expect(page.getByText("No encontramos coincidencias con esa búsqueda")).toBeVisible();
    await page.getByRole("button", { name: "Ver todas las herramientas", exact: true }).click();
    await expect(cards).toHaveCount(16);
    await page.getByRole("button", { name: "Ver 16 herramientas más", exact: true }).click();
    await expect(cards).toHaveCount(32);
    await page
      .getByRole("button", { name: "Mostrar todas las coincidencias", exact: true })
      .click();
    await expect(cards).toHaveCount(105);
    const ids = await cards.evaluateAll((nodes) => nodes.map((node) => node.dataset.platform));
    assert.equal(new Set(ids).size, 105);

    const images = await page.locator("main img").evaluateAll(async (nodes) => {
      for (const image of nodes) image.loading = "eager";
      return Promise.all(
        nodes.map(async (image) => {
          try {
            await image.decode();
          } catch {
            /* Los fallos se incluyen en el informe. */
          }
          return {
            src: image.currentSrc || image.src,
            width: image.naturalWidth,
            height: image.naturalHeight,
          };
        }),
      );
    });
    assert.deepEqual(
      images.filter((image) => !image.width || !image.height),
      [],
      "Logos rotos.",
    );
    const clipped = await cards.evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        const back = node.querySelector('[id^="integracion-"]');
        return back.scrollHeight > back.clientHeight + 1 || back.scrollWidth > back.clientWidth + 1
          ? [
              {
                id: node.dataset.platform,
                scroll: back.scrollHeight,
                height: back.clientHeight,
                width: back.scrollWidth,
                client: back.clientWidth,
              },
            ]
          : [];
      }),
    );
    assert.deepEqual(clipped, [], "Contenido recortado en tarjetas.");
    const documentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(documentOverflow, false);
    if (width === 1440) {
      for (const card of await cards.all()) {
        await card.locator("button[aria-expanded]").click();
        await expect(card).toHaveAttribute("data-flipped", "true");
        await page.keyboard.press("Escape");
      }
    }
    await page.getByLabel("¿Qué herramienta necesitas conectar?").fill("SII");
    const axe = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const violations = axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target),
    }));
    assert.deepEqual(errors, []);
    assert.deepEqual(violations, []);
    if ([1440, 390].includes(width)) {
      await page.getByRole("button", { name: "Limpiar filtros" }).click();
      await page
        .locator("#integration-results")
        .screenshot({
          path: `${output}/catalogo-${width}.png`,
          style: "header{opacity:0!important}",
        });
    }
    results.push({
      width,
      homePreviewLogos: 4,
      homeCatalogCards: 0,
      fullCards: 105,
      logos: images.length,
      clipped,
      documentOverflow,
      errors,
      violations,
    });
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${origin}/integraciones`, { waitUntil: "domcontentloaded" });
  assert.equal(
    await page.locator("#directorio-integraciones li").count(),
    105,
    "Todos los nombres deben estar en HTML sin JavaScript.",
  );
  assert.equal(await page.locator("#directorio-integraciones li img").count(), 105);
  const sitemap = await context.request.get(`${origin}/sitemap.xml`);
  const sitemapStatus = sitemap.status();
  if (sitemapStatus === 200)
    assert.ok((await sitemap.text()).includes("https://www.zyteron.cl/integraciones"));
  await context.close();
  await writeFile(
    `${output}/qa-results.json`,
    JSON.stringify(
      {
        date: "11-11-2026",
        results,
        seo: "Canonical, metadata, ItemList and 105 entries without JavaScript verified",
        sitemapStatus,
        sitemapNote:
          sitemapStatus === 200
            ? "Verified over HTTP"
            : "Requires configured Supabase credentials in the local server; generation is covered with mocked database reads",
        interactions: "Search, category, pagination, flip, Enter, Space, Escape and focus verified",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

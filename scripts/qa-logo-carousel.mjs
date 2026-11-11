import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origin = process.argv[2] || "http://127.0.0.1:3124";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) && origin !== "https://www.zyteron.cl")
  throw new Error("Origen no autorizado para la verificación.");
const output = `output/logo-carousel-11-11-2026/${origin.startsWith("https") ? "production" : "local"}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

async function contextFor(width, reducedMotion = "reduce", javaScriptEnabled = true) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion,
    javaScriptEnabled,
    serviceWorkers: "block",
  });
  await context.route("**/*", (route) =>
    route.request().url().startsWith(origin) && ["GET", "HEAD"].includes(route.request().method())
      ? route.continue()
      : route.abort(),
  );
  return context;
}

try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await contextFor(width);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    assert.equal((await page.goto(origin, { waitUntil: "networkidle" })).status(), 200);
    const section = page.locator("#integraciones");
    const track = section.locator("#integration-logo-track");
    const logos = track.locator("[data-integration-preview]");
    await expect(logos).toHaveCount(105);
    assert.equal(
      new Set(
        await logos.evaluateAll((links) => links.map((link) => link.dataset.integrationPreview)),
      ).size,
      105,
    );
    await expect(
      section.getByRole("link", { name: "Explorar las 105 herramientas" }),
    ).toHaveAttribute("href", "/integraciones");
    assert.equal(await page.locator("#directorio-integraciones").count(), 0);
    await logos.locator("img").evaluateAll(async (images) => {
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode()));
    });
    await section.scrollIntoViewIfNeeded();
    await expect(
      section.getByRole("button", { name: "Reproducir carrusel de logos" }),
    ).toBeVisible();
    const seen = new Set();
    let wrapped = false;
    for (let step = 0; step < 106; step++) {
      const visible = await track.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [...element.querySelectorAll("a")]
          .filter((link) => {
            const box = link.getBoundingClientRect();
            return box.left >= bounds.left - 3 && box.right <= bounds.right + 3;
          })
          .map((link) => link.dataset.integrationPreview);
      });
      visible.forEach((id) => seen.add(id));
      const before = await track.evaluate((element) => element.scrollLeft);
      await section.getByRole("button", { name: "Logos siguientes" }).click();
      const after = await track.evaluate((element) => element.scrollLeft);
      if (after < before) {
        wrapped = true;
        break;
      }
    }
    assert.equal(wrapped, true, "El carrusel debe volver al principio.");
    assert.equal(
      seen.size,
      105,
      `${width}: todos los logos deben aparecer completos durante el recorrido`,
    );
    await section.getByRole("button", { name: "Logos anteriores" }).click();
    assert.ok(await track.evaluate((element) => element.scrollLeft > element.clientWidth));
    await track.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeLessThan(3);
    await page.keyboard.press("ArrowRight");
    assert.ok(await track.evaluate((element) => element.scrollLeft > 100));
    await track.evaluate((element) => element.scrollTo({ left: 0, behavior: "instant" }));
    const accessibility = await new AxeBuilder({ page }).include("#integraciones").analyze();
    assert.deepEqual(accessibility.violations, []);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await section.screenshot({
      path: `${output}/carousel-${width}.png`,
      style: "header{opacity:0!important}",
    });
    await page.goto(`${origin}/integraciones`, { waitUntil: "networkidle" });
    await expect(page.locator("#directorio-integraciones li")).toHaveCount(105);
    assert.deepEqual(errors, []);
    results.push({
      width,
      visibleLogosThroughNavigation: seen.size,
      wrapped,
      accessibilityViolations: 0,
      errors,
    });
    await context.close();
  }

  const context = await contextFor(1440, "no-preference");
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: "networkidle" });
  const section = page.locator("#integraciones");
  const track = section.locator("#integration-logo-track");
  await section.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect
    .poll(() => track.evaluate((element) => element.scrollLeft), { timeout: 8000 })
    .toBeGreaterThan(100);
  await section.getByRole("button", { name: "Pausar carrusel de logos" }).click();
  await expect(section.getByRole("button", { name: "Reproducir carrusel de logos" })).toBeVisible();
  await page.waitForTimeout(800);
  const pausedAt = await track.evaluate((element) => element.scrollLeft);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(4400);
  assert.equal(await track.evaluate((element) => element.scrollLeft), pausedAt);
  await section.getByRole("button", { name: "Reproducir carrusel de logos" }).click();
  await page.mouse.move(0, 0);
  await expect
    .poll(() => track.evaluate((element) => element.scrollLeft), { timeout: 8000 })
    .toBeGreaterThan(pausedAt + 100);
  await track.focus();
  await expect(section.getByRole("button", { name: "Reproducir carrusel de logos" })).toBeVisible();
  await context.close();

  const noScript = await contextFor(390, "reduce", false);
  const staticPage = await noScript.newPage();
  await staticPage.goto(origin);
  await expect(staticPage.locator("#integration-logo-track img")).toHaveCount(105);
  await noScript.close();
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      { results, autoplay: true, pause: true, resume: true, noScriptLogos: 105 },
      null,
      2,
    ),
  );
  console.log(
    "Carrusel verificado: 105 logos recorribles, navegación circular, reproducción, pausa, teclado, accesibilidad y móvil.",
  );
} finally {
  await browser.close();
}

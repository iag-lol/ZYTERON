import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origin = process.argv[2] || "http://127.0.0.1:3124";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) && origin !== "https://www.zyteron.cl")
  throw new Error("Origen no autorizado para la verificación.");
const output = `output/continuous-logos-11-11-2026/${origin.startsWith("https") ? "production" : "local"}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

async function createContext(width, reducedMotion = "no-preference", javaScriptEnabled = true) {
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
    const context = await createContext(width);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    assert.equal((await page.goto(origin, { waitUntil: "networkidle" })).status(), 200);
    const section = page.locator("#integraciones");
    const carousel = section.locator("[data-logo-carousel]");
    const track = carousel.locator("[data-logo-track]");
    const original = carousel.locator('[data-logo-copy="original"]');
    const duplicate = carousel.locator('[data-logo-copy="duplicate"]');
    await expect(original.locator("[data-integration-preview]")).toHaveCount(105);
    await expect(duplicate).toHaveAttribute("aria-hidden", "true");
    assert.equal(await duplicate.evaluate((element) => element.inert), true);
    assert.equal(
      await section.getByRole("button").count(),
      0,
      "El carrusel no debe mostrar controles.",
    );
    await expect(
      section.getByRole("link", { name: "Explorar las 105 herramientas" }),
    ).toHaveAttribute("href", "/integraciones");
    await carousel.locator("img").evaluateAll(async (images) => {
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode()));
    });
    await carousel.scrollIntoViewIfNeeded();
    await carousel.hover();
    const samples = [];
    for (let i = 0; i < 4; i++) {
      samples.push(
        await track.evaluate((element) => ({
          x: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
          time: performance.now(),
          state: element.getAnimations()[0].playState,
        })),
      );
      await page.waitForTimeout(180);
    }
    for (let i = 1; i < samples.length; i++) {
      assert.equal(samples[i].state, "running");
      assert.ok(
        samples[i - 1].x - samples[i].x > 3,
        "Los logos deben avanzar continuamente, también al pasar el mouse.",
      );
    }
    const loop = await track.evaluate((element) => {
      const animation = element.getAnimations()[0];
      animation.pause();
      const duration = Number(animation.effect.getTiming().duration);
      const groups = element.querySelectorAll("ul");
      const bounds = element.parentElement.getBoundingClientRect();
      const links = [...groups[0].querySelectorAll("a")];
      let visible = 0;
      for (let index = 0; index < links.length; index++) {
        animation.currentTime = (index * duration) / links.length;
        const box = links[index].getBoundingClientRect();
        if (box.left >= bounds.left - 1 && box.right <= bounds.right + 1) visible++;
      }
      animation.currentTime = duration - 100;
      const before = groups[1].firstElementChild.getBoundingClientRect().left;
      animation.currentTime = duration + 100;
      const after = groups[0].firstElementChild.getBoundingClientRect().left;
      const expectedDistance = (groups[0].getBoundingClientRect().width / duration) * 200;
      animation.currentTime = 0;
      return {
        visible,
        seamError: Math.abs(before - after - expectedDistance),
        timing: animation.effect.getTiming().easing,
      };
    });
    assert.equal(loop.visible, 105, "Los 105 logos deben aparecer completos en el ciclo.");
    assert.equal(loop.timing, "linear");
    assert.ok(loop.seamError < 1, "El reinicio del ciclo debe ser imperceptible.");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    const accessibility = await new AxeBuilder({ page }).include("#integraciones").analyze();
    assert.deepEqual(accessibility.violations, []);
    await section.screenshot({
      path: `${output}/continuous-${width}.png`,
      style: "header{opacity:0!important}",
    });
    assert.deepEqual(errors, []);
    results.push({ width, samples, ...loop, controls: 0, errors });
    await context.close();
  }
  const staticContext = await createContext(390, "no-preference", false);
  const staticPage = await staticContext.newPage();
  await staticPage.goto(origin);
  await expect(staticPage.locator('[data-logo-copy="original"] img')).toHaveCount(105);
  assert.equal(
    await staticPage
      .locator("[data-logo-track]")
      .evaluate((element) => element.getAnimations()[0].playState),
    "running",
  );
  await staticContext.close();
  const reducedContext = await createContext(390, "reduce");
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(origin);
  assert.equal(
    await reducedPage
      .locator("[data-logo-track]")
      .evaluate((element) => element.getAnimations().length),
    0,
  );
  await reducedContext.close();
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ results, automaticWithoutJavaScript: true, reducedMotion: true }, null, 2),
  );
  console.log(
    "105 logos: movimiento automático continuo, velocidad lineal, ciclo sin saltos y cero controles; escritorio y móvil verificados.",
  );
} finally {
  await browser.close();
}

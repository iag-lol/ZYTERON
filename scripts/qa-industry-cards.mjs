import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origin = process.argv[2] || "http://127.0.0.1:3124";
const output = "output/industry-cards-11-11-2026";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error("Solo se permiten pruebas en localhost.");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await context.route("**/*", (route) =>
      route.request().url().startsWith(origin) && ["GET", "HEAD"].includes(route.request().method())
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin, { waitUntil: "networkidle" });
    const section = page.locator("#rubros");
    const cards = section.locator("article[data-flipped]");
    await expect(cards).toHaveCount(9);
    await section.locator("img").evaluateAll(async (images) => {
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode()));
    });
    const dimensions = [];
    for (const card of await cards.all()) {
      const front = card.locator("button[aria-expanded]");
      await expect(front).toContainText("Explora 10 soluciones");
      await front.focus();
      await page.keyboard.press("Enter");
      await expect(card).toHaveAttribute("data-flipped", "true");
      const back = card.locator('[id^="rubro-"]');
      await expect(back.locator("li")).toHaveCount(10);
      const geometry = await back.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const children = [...element.querySelectorAll("h3, p, li, a")];
        return {
          name: element.closest("article").getAttribute("aria-label"),
          height: Math.round(bounds.height),
          clipped: children.some((child) => {
            const box = child.getBoundingClientRect();
            return box.left < bounds.left || box.right > bounds.right + 1 || box.bottom > bounds.bottom + 1;
          }),
          overflowing: element.scrollHeight > element.clientHeight + 1,
        };
      });
      assert.equal(geometry.clipped, false, `${width}: ${geometry.name} tiene texto recortado`);
      assert.equal(geometry.overflowing, false, `${width}: ${geometry.name} desborda`);
      dimensions.push(geometry);
      await expect(back.getByRole("button")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(front).toBeFocused();
      await page.keyboard.press("Space");
      await expect(card).toHaveAttribute("data-flipped", "true");
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const accessibility = await new AxeBuilder({ page }).include("#rubros").analyze();
    assert.deepEqual(accessibility.violations, []);
    assert.deepEqual(errors, []);
    if ([1440, 390, 320].includes(width)) {
      await cards.first().screenshot({
        path: `${output}/reverso-${width}.png`,
        style: "header{opacity:0!important}",
      });
    }
    results.push({ width, cards: dimensions, accessibilityViolations: 0, errors });
    await context.close();
  }
  await writeFile(`${output}/qa-results.json`, JSON.stringify(results, null, 2));
  console.log("9 tarjetas, 90 soluciones: lectura completa, giro y accesibilidad verificados en 5 tamaños.");
} finally {
  await browser.close();
}

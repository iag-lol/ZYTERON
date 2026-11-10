import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const origin = process.argv[2] || "http://localhost:3120";
const output = process.argv[3] || "output/rediseno-10-11-2026/motion";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error("La revisión de navegación solo puede ejecutarse en localhost.");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const width of [1440, 1024, 768, 390, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => {
      const request = route.request();
      return /google|\/api\//.test(request.url()) || !["GET", "HEAD"].includes(request.method())
        ? route.abort()
        : route.continue();
    });
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${output}/hero-${width}.png` });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let top = 0; top < height; top += 600) {
      await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), top);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(1700);
    const hidden = await page.locator("main h2").evaluateAll((headings) =>
      headings
        .filter((heading) => {
          for (let node = heading; node && node.tagName !== "BODY"; node = node.parentElement) {
            if (Number(getComputedStyle(node).opacity) === 0) return true;
          }
          return false;
        })
        .map((heading) => heading.textContent),
    );
    assert.deepEqual(hidden, [], `${width}: títulos ocultos al recorrer la portada`);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    if (width < 1280) {
      const toggle = page.getByRole("button", { name: "Abrir menú", exact: true });
      await toggle.click();
      await page.keyboard.press("Escape");
      await toggle.waitFor();
      assert.equal(await toggle.evaluate((node) => node === document.activeElement), true);
      await toggle.click();
      await page
        .getByRole("navigation", { name: "Navegación móvil", exact: true })
        .getByRole("link", { name: "Empresa", exact: true })
        .click();
    } else {
      await page
        .getByRole("navigation", { name: "Navegación principal", exact: true })
        .getByRole("link", { name: "Empresa", exact: true })
        .click();
    }
    await page.waitForURL("**/quienes-somos");
    await page.locator("main h1").waitFor();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator("main h1").count(), 1);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/empresa-${width}.png` });
    results.push({ width, scroll: true, navigation: true, errors });
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}

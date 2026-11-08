import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.argv[2] || "http://127.0.0.1:3101";
const output = process.argv[3] || "output/redesign-08-11-2026/performance";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const samples = [];
try {
  for (const width of [390, 1440])
    for (const route of ["/", "/planes", "/contacto"])
      for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          serviceWorkers: "block",
          reducedMotion: "reduce",
        });
        await context.route("**/*", (r) =>
          /googletagmanager|google-analytics|doubleclick/.test(r.request().url()) ||
          !["GET", "HEAD"].includes(r.request().method())
            ? r.abort()
            : r.continue(),
        );
        const page = await context.newPage();
        await page.addInitScript(() => {
          window.__measurement = { lcp: 0, cls: 0 };
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) window.__measurement.lcp = e.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const e of list.getEntries())
              if (!e.hadRecentInput) window.__measurement.cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
        });
        const response = await page.goto(origin + route, {
          waitUntil: "networkidle",
          timeout: 90000,
        });
        await page.waitForTimeout(2000);
        const data = await page.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          const resources = performance.getEntriesByType("resource");
          return {
            ...window.__measurement,
            ttfb: nav.responseStart,
            domContentLoaded: nav.domContentLoadedEventEnd,
            htmlDecodedBytes: nav.decodedBodySize,
            transferBytes: nav.transferSize + resources.reduce((sum, r) => sum + r.transferSize, 0),
            resourceCount: resources.length,
          };
        });
        if (run === 1)
          await page.screenshot({
            path: `${output}/${width}-${route === "/" ? "inicio" : route.slice(1)}.png`,
          });
        samples.push({ width, route, run, status: response.status(), ...data });
        console.log(JSON.stringify(samples.at(-1)));
        await context.close();
      }
} finally {
  await browser.close();
  await writeFile(
    `${output}/measurements.json`,
    JSON.stringify(
      {
        origin,
        measuredAt: new Date().toISOString(),
        method:
          "Chrome local sin emulación de CPU o red; caché de navegador vacía; etiquetas Google y escrituras bloqueadas. Diagnóstico de laboratorio, no CrUX ni INP de campo.",
        samples,
      },
      null,
      2,
    ),
  );
}

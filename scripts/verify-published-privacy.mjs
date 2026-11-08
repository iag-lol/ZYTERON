import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const output = process.argv[2] || "output/redesign-08-11-2026/published-privacy";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const url of [
    "https://www.zyteron.cl/contacto?email=redesign-qa%40example.invalid&token=privacy-check",
    "https://www.zyteron.cl/administracion/login",
    "https://www.zyteron.cl/clientes/login",
    "https://zyteron.onrender.com/contacto",
  ]) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const googleRequests = [];
    const nativeVisits = [];
    await context.route("**/*", (route) => {
      const request = route.request();
      if (new URL(request.url()).pathname === "/api/analytics/visit")
        nativeVisits.push(request.method());
      if (/googletagmanager|google-analytics|doubleclick|googleadservices/.test(request.url())) {
        googleRequests.push(request.url().split("?")[0]);
        return route.abort();
      }
      if (!["GET", "HEAD"].includes(request.method())) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    const entries = await page.evaluate(() =>
      (window.dataLayer || []).map((entry) =>
        typeof entry.length === "number" ? Array.from(entry) : entry,
      ),
    );
    const isPublicProduction = new URL(url).searchParams.has("email");
    if (isPublicProduction) {
      const location = entries.find((entry) => entry[0] === "set" && entry[1]?.page_location);
      assert.equal(location?.[1].page_location, "https://www.zyteron.cl/contacto");
      assert.equal(JSON.stringify(entries).includes("privacy-check"), false);
      assert.equal(JSON.stringify(entries).includes("example.invalid"), false);
    } else {
      assert.equal(googleRequests.length, 0, `${url}: etiquetas externas`);
      assert.equal(nativeVisits.length, 0, `${url}: visitas de prueba en el CRM`);
      assert.equal(entries.filter((entry) => ["config", "event"].includes(entry[0])).length, 0);
    }
    results.push({
      path: new URL(url).origin + new URL(url).pathname,
      status: response.status(),
      mode: isPublicProduction ? "public-sanitized" : "excluded",
      googleRequests: googleRequests.length,
      nativeVisits: nativeVisits.length,
      passed: true,
    });
    await context.close();
  }
} catch (error) {
  results.push({ failure: error.message });
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
}

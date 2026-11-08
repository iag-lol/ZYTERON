import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const origin = process.argv[2] || "http://127.0.0.1:3100";
const output = process.argv[3] || "output/redesign-08-11-2026/qa";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error("Las pruebas de formularios solo pueden ejecutarse en localhost.");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const width of [1440, 360, 390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1440 ? 1000 : 844 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await context.route("**/*", (route) => {
      const req = route.request();
      if (
        req.url().includes("googletagmanager") ||
        req.url().includes("google-analytics") ||
        (req.method() !== "GET" && req.method() !== "HEAD")
      )
        return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of [
      "/",
      "/contacto?tipo=sistema",
      "/cotizador",
      "/tiendas-online",
      "/sistemas-web",
      "/planes",
      "/demos",
      "/becas-web-pyme",
    ]) {
      const response = await page.goto(origin + route, {
        waitUntil: "networkidle",
        timeout: 90000,
      });
      assert.equal(response.status(), 200, `${route}: HTTP`);
      await page.locator("main h1").waitFor();
      assert.equal(await page.locator("main h1").count(), 1);
      if (route === "/contacto?tipo=sistema") {
        await page.waitForFunction(
          () => document.querySelector("#projectType")?.value === "Sistema interno",
        );
        assert.equal(
          await page.getByRole("button", { name: "Solicitar diagnóstico", exact: true }).count(),
          1,
        );
      }
      if (route === "/cotizador") {
        assert.equal(await page.getByText("7 pasos para preparar tu solicitud").count(), 1);
        await page.getByRole("button", { name: "Comenzar cotización" }).click();
        assert.ok(await page.getByText("Paso 1 de 7", { exact: true }).count());
      }
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      const overflow = dimensions.document > dimensions.viewport + 1;
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const violations = axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      }));
      const name = `${width}-${route === "/" ? "inicio" : route.split("?")[0].slice(1)}`;
      for (const section of await page.locator("main > section").all())
        await section.scrollIntoViewIfNeeded();
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
      results.push({ width, route, overflow, violations, errors: [...errors] });
      console.log(
        JSON.stringify({
          width,
          route,
          overflow,
          violations: violations.map((v) => v.id),
          errors: errors.length,
        }),
      );
    }
    await page.goto(origin + "/demos", { waitUntil: "networkidle" });
    await page.getByLabel("1. Busca en el catálogo").fill("Polerón");
    await page.getByRole("button", { name: "Agregar Polerón azul" }).click();
    await page.getByRole("button", { name: "3. Preparar consulta de ejemplo" }).click();
    await page.getByText("Consulta preparada, sin enviar.").waitFor();
    await page.goto(origin + "/contacto?tipo=sistema&plan=sistema&origen=qa", {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(
      () => document.querySelector("#projectType")?.value === "Sistema interno",
    );
    assert.equal(await page.getByRole("button", { name: "Abrir asistente virtual" }).count(), 0);
    await page.locator("#name").fill("Prueba controlada");
    await page.locator("#email").fill("prueba@example.com");
    await page.locator("#phone").fill("+56911111111");
    await page.locator("#message").fill("Necesitamos ordenar aprobaciones y documentos.");
    let requests = [];
    let fail = true;
    await page.route("**/api/contacto", async (route) => {
      requests.push(route.request().postDataJSON());
      if (fail) return route.abort("failed");
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          leadId: "aa000000-0000-5000-a000-000000000000",
          reference: "QA-LOCAL",
        }),
      });
    });
    await page.getByRole("button", { name: "Solicitar diagnóstico", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Tus datos siguen aquí" }).waitFor();
    assert.equal(await page.locator("#email").inputValue(), "prueba@example.com");
    fail = false;
    await page.getByRole("button", { name: "Solicitar diagnóstico", exact: true }).click();
    await page.getByRole("heading", { name: "Solicitud recibida", exact: true }).waitFor();
    assert.equal(requests[0].clientSubmissionId, requests[1].clientSubmissionId);
    assert.match(requests[1].marketingSource, /plan=sistema/);
    const events = await page.evaluate(() =>
      (window.dataLayer || [])
        .map((args) => Array.from(args))
        .filter((args) => args[0] === "event"),
    );
    assert.equal(events.filter((e) => e[1] === "generate_lead").length, 1);
    assert.ok(!JSON.stringify(events).includes("prueba@example.com"));
    assert.ok(!JSON.stringify(events).includes("56911111111"));
    results.push({ width, test: "contact_network_retry_receipt_analytics", ok: true });
    await context.close();
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
const failures = results.filter(
  (r) =>
    r.overflow ||
    r.errors?.length ||
    r.violations?.some((v) => v.impact === "critical" || v.impact === "serious"),
);
assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));

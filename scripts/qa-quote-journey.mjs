import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.argv[2] || "http://127.0.0.1:3100";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error("Solo localhost");
const output = process.argv[3] || "output/redesign-08-11-2026/quote";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  const choices = { "tienda-online": /Tienda online/, catalogo: /Catálogo de productos/, "gestion-personas": /Gestión de personas o RRHH/, "control-flota": /Control de flota u operaciones/ };
  for (const width of [390, 1440]) for (const projectType of (process.argv[4] || "tienda-online").split(",")) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await context.route("**/*", (route) =>
      /googletagmanager|google-analytics/.test(route.request().url()) ||
      route.request().method() === "POST"
        ? route.abort()
        : route.continue(),
    );
    const page = await context.newPage();
    await page.goto(`${origin}/cotizador`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Comenzar cotización" }).click();
    await page.getByRole("button", { name: choices[projectType] }).click();
    for (let step = 1; step <= 7; step++) {
      await page.getByText(`Paso ${step} de 7`, { exact: true }).last().waitFor();
      if (step === 2) {
        await page.locator("#quote-businessName").fill("Prueba controlada");
      }
      if ([2, 3, 5].includes(step)) {
        for (const group of await page
          .locator('main div[role="group"][aria-labelledby^="quote-label-"]')
          .all())
          await group.getByRole("button").first().click();
        if (step === 3)
          for (const field of await page.locator("textarea[aria-labelledby]").all())
            await field.fill("Ejemplo controlado de necesidades.");
      }
      if (step === 6) {
        await page.locator("#quote-contactName").fill("Prueba controlada");
        await page.locator("#quote-contactWhatsapp").fill("+56911111111");
        await page.locator("#quote-contactEmail").fill("qa@example.com");
      }
      const audit = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      results.push({
        width,
        projectType,
        step,
        violations: audit.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
      await page.screenshot({ path: `${output}/${width}-${projectType}-paso-${step}.png` });
      if (step < 7) await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    }
    let fail = true;
    const requests = [];
    await page.route("**/api/cotizaciones", (route) => {
      requests.push(route.request().postDataJSON());
      return fail
        ? route.abort()
        : route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              reference: "QA-LOCAL",
              quoteId: "ab000000-0000-5000-a000-000000000000",
              leadId: "ac000000-0000-5000-a000-000000000000",
            }),
          });
    });
    await page
      .getByRole("button", { name: /^(Enviar cotización|Solicitar levantamiento)$/ })
      .click();
    await page
      .getByText(/No pudimos registrar|No pudimos confirmar|No se pudo enviar|No pudimos conectar/)
      .first()
      .waitFor();
    fail = false;
    await page
      .getByRole("button", { name: /^(Enviar cotización|Solicitar levantamiento)$/ })
      .click();
    await page.getByText("QA-LOCAL", { exact: true }).waitFor();
    assert.equal(requests.length, 2);
    assert.equal(requests[1].projectType, projectType);
    assert.equal(requests[0].clientSubmissionId, requests[1].clientSubmissionId);
    const events = await page.evaluate(() =>
      (window.dataLayer || []).map((v) => Array.from(v)).filter((v) => v[0] === "event"),
    );
    assert.equal(events.filter((v) => v[1] === "generate_lead").length, 1);
    assert.equal(events.find((v) => v[1] === "generate_lead")[2].lead_id, "ac000000-0000-5000-a000-000000000000");
    assert.ok(!JSON.stringify(events).includes("qa@example.com"));
    assert.equal(
      new Set(events.filter((v) => v[1] === "quote_step_view").map((v) => v[2].step)).size,
      7,
    );
    await context.close();
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
const failures = results.filter((r) =>
  r.violations.some((v) => ["serious", "critical"].includes(v.impact)),
);
assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
console.log(`Recorrido de siete pasos comprobado en ${results.length} estados.`);

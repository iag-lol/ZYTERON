import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { calculateManualQuote } = require("../src/lib/manual-quote/catalog.ts");
const { generateManualQuoteDocument } = require("../src/lib/manual-quote/document.ts");
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.argv[2] || "http://localhost:3120";
const output = process.argv[3] || "output/catalogo-profesional-09-11-2026/visual";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw Error("Las pruebas de compra simulada solo se ejecutan en localhost.");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const width of (process.env.QA_WIDTHS || "1440,360,390,430").split(",").map(Number)) {
    const context = await browser.newContext({
      viewport: { width, height: 950 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    let draft = null,
      verified = false,
      ready = false,
      startCount = 0,
      payCount = 0,
      downloadCount = 0;
    const captured = [];
    await context.route("**/*", (route) =>
      /googletagmanager|google-analytics/.test(route.request().url())
        ? route.abort()
        : route.continue(),
    );
    await context.route("**/api/manual-quote**", async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        body = request.method() === "GET" ? null : request.postDataJSON();
      const respond = (data, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
      if (url.pathname.endsWith("/document")) {
        assert.ok(draft);
        downloadCount++;
        const bytes = await generateManualQuoteDocument({
          id: draft.id,
          name: draft.name,
          email: draft.email,
          createdAt: "2026-11-09T12:00:00Z",
          snapshot: calculateManualQuote(draft.selection),
        });
        return route.fulfill({
          status: 200,
          contentType: "application/pdf",
          body: Buffer.from(bytes),
        });
      }
      if (url.pathname.endsWith("/account"))
        return respond(
          body.password === body.confirmPassword
            ? { ok: true, message: "Código de prueba enviado." }
            : { error: "Las contraseñas no coinciden." },
          body.password === body.confirmPassword ? 200 : 400,
        );
      if (url.pathname.endsWith("/checkout")) {
        assert.ok(verified && ready && body.accepted);
        captured.push(body);
        payCount++;
        return respond({ ok: true, checkoutUrl: "https://sandbox.flow.cl/test-local-only" });
      }
      if (request.method() === "GET")
        return respond(
          draft ? { ...draft, ready, locked: false } : { error: "Sin borrador" },
          draft ? 200 : 401,
        );
      if (request.method() === "PATCH") {
        draft.selection = body.selection;
        return respond({ ok: true });
      }
      if (request.method() === "DELETE") {
        draft = null;
        return respond({ ok: true });
      }
      startCount++;
      draft = { id: "a1000000-0000-4000-a000-000000000001", ...body };
      return respond({ ok: true, id: draft.id });
    });
    await context.route("**/api/portal/auth/verify-code", async (route) => {
      const valid = route.request().postDataJSON().code === "123456";
      verified = valid;
      return route.fulfill({
        status: valid ? 200 : 400,
        contentType: "application/json",
        body: JSON.stringify(valid ? { ok: true } : { error: "El código ingresado no es válido." }),
      });
    });
    await context.route("**/api/portal/auth/resend-code", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }),
    );
    await context.route("**/api/auth/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path.endsWith("/providers"))
        body = {
          credentials: {
            id: "credentials",
            type: "credentials",
            name: "Credenciales",
            signinUrl: origin + "/api/auth/signin/credentials",
            callbackUrl: origin + "/api/auth/callback/credentials",
          },
        };
      if (path.endsWith("/csrf")) body = { csrfToken: "local-only" };
      if (path.includes("/callback/")) {
        ready = verified;
        body = { url: origin + "/cotizador/manual" };
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await context.route("https://sandbox.flow.cl/test-local-only", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<h1>Pasarela simulada para prueba local</h1>",
      }),
    );
    await context.addInitScript(() => {
      const original = URL.createObjectURL.bind(URL);
      const revoke = URL.revokeObjectURL.bind(URL);
      window.__activeManualPdfUrls = new Set();
      URL.createObjectURL = (blob) => {
        const url = original(blob);
        if (blob.type === "application/pdf") {
          window.__manualPdfUrl = url;
          window.__activeManualPdfUrls.add(url);
        }
        return url;
      };
      URL.revokeObjectURL = (url) => {
        window.__activeManualPdfUrls.delete(url);
        revoke(url);
      };
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    async function audit(state) {
      await page.addStyleTag({
        content:
          ".cv-auto{content-visibility:visible!important;contain-intrinsic-size:auto!important}",
      });
      const a = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      results.push({
        width,
        state,
        overflow,
        violations: a.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
        errors: [...errors],
      });
      await page.screenshot({
        path: `${output}/${width}-${state}.png`,
        fullPage: state !== "home",
      });
    }
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.locator("#cotizar").scrollIntoViewIfNeeded();
    await audit("home");
    await page
      .locator("#cotizar")
      .getByRole("button", { name: "Ecommerce Profesional", exact: true })
      .click();
    assert.match(await page.locator(".manual-home-price").innerText(), /749.990/);
    await page.locator("#cotizar").getByRole("link", { name: "Configurar mi proyecto" }).click();
    await page.getByRole("heading", { name: "¿Para quién cotizamos?" }).waitFor();
    await audit("contact");
    await page.getByLabel("Nombre y apellido", { exact: true }).fill("Prueba Local");
    await page.getByLabel("Correo electrónico", { exact: true }).fill("qa@example.com");
    await page.getByLabel("Teléfono o WhatsApp", { exact: true }).fill("+56911111111");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Iniciar mi cotización" }).click();
    await page.getByRole("heading", { name: "Un plan para comenzar." }).waitFor();
    assert.equal(startCount, 1);
    await page.getByRole("button", { name: /Web Básica/ }).click();
    await page.getByRole("checkbox", { name: /Página adicional/ }).check();
    await page.locator(".manual-quantity select").selectOption("2");
    await page.getByRole("checkbox", { name: /Blog administrable/ }).check();
    assert.match(await page.locator(".manual-total").innerText(), /606.852/);
    const search = page.getByRole("searchbox", { name: "Buscar módulos" });
    await search.fill("base de datos");
    await page.getByRole("checkbox", { name: /Base de datos básica/ }).check();
    await page.getByRole("checkbox", { name: /Base de datos intermedia/ }).check();
    assert.ok(!(await page.getByRole("checkbox", { name: /Base de datos básica/ }).isChecked()));
    await audit("database");
    await search.fill("correo corporativo");
    await page.getByRole("checkbox", { name: /hasta 5 cuentas/ }).check();
    await page.getByRole("checkbox", { name: /hasta 15 cuentas/ }).check();
    assert.ok(!(await page.getByRole("checkbox", { name: /hasta 5 cuentas/ }).isChecked()));
    const beforeDownload = calculateManualQuote({
      ...draft.selection,
      planId: "web-basica",
      addons: [
        { id: "extraPage", quantity: 2 },
        { id: "blog", quantity: 1 },
        { id: "databaseMedium", quantity: 1 },
        { id: "emailSetup15", quantity: 1 },
      ],
    });
    assert.match(
      await page.locator(".manual-total").innerText(),
      new RegExp(beforeDownload.total.toLocaleString("es-CL").replaceAll(".", "\\.")),
    );
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar cotización PDF", exact: true }).click(),
    ]);
    await download.saveAs(`${output}/${width}-cotizacion-actual.pdf`);
    await page.waitForTimeout(1600);
    assert.equal(
      await page.evaluate(
        () =>
          Boolean(window.__manualPdfUrl) && window.__activeManualPdfUrls.has(window.__manualPdfUrl),
      ),
      true,
      "El PDF debe seguir disponible mientras permanece abierto el selector de archivos.",
    );
    assert.equal(downloadCount, 1);
    assert.equal(draft.selection.addons.length, 4);
    assert.equal(calculateManualQuote(draft.selection).total, beforeDownload.total);
    await search.fill("");
    await page.getByRole("button", { name: /Seleccionados \(4\)/, exact: true }).click();
    await page.getByRole("checkbox", { name: /Base de datos intermedia/ }).click();
    assert.equal(await page.getByRole("checkbox", { name: /Base de datos intermedia/ }).count(), 0);
    await page.getByRole("checkbox", { name: /hasta 15 cuentas/ }).click();
    assert.equal(await page.getByRole("checkbox", { name: /hasta 15 cuentas/ }).count(), 0);
    await audit("selected");
    await page.getByRole("button", { name: "Todos", exact: true }).click();
    await search.fill("noexisteunmoduloconestenombre");
    await page.getByRole("heading", { name: "No hay módulos en esta vista." }).waitFor();
    await search.fill("");
    assert.match(await page.locator(".manual-total").innerText(), /606.852/);
    await audit("configure");
    await page.getByRole("button", { name: "Guardar cotización" }).click();
    await page.getByRole("status").filter({ hasText: "Cotización guardada" }).waitFor();
    await page.getByRole("button", { name: "Comprar este proyecto" }).click();
    await page.getByRole("heading", { name: "Crea tu cuenta para comprar." }).waitFor();
    await audit("account");
    await page.getByLabel("Nombre", { exact: true }).fill("Prueba");
    await page.getByLabel("Apellido", { exact: true }).fill("Local");
    await page.getByLabel(/^Contraseña/).fill("PruebaLocal123!");
    await page.getByLabel("Repite la contraseña", { exact: true }).fill("PruebaLocal123!");
    await page.getByRole("button", { name: "Crear cuenta y recibir código" }).click();
    await page.getByRole("heading", { name: "Verifica tu correo." }).waitFor();
    await audit("verify");
    await page.getByLabel(/^Código de seguridad/).fill("000000");
    await page.getByRole("button", { name: "Verificar correo y continuar" }).click();
    await page.getByRole("alert").filter({ hasText: "código ingresado" }).waitFor();
    assert.equal(payCount, 0);
    await page.getByLabel(/^Código de seguridad/).fill("123456");
    await page.getByRole("button", { name: "Verificar correo y continuar" }).click();
    await page.getByRole("heading", { name: "Todo claro antes de contratar." }).waitFor();
    await audit("billing");
    const pay = page.getByRole("button", { name: "Pagar $606.852", exact: true });
    assert.ok(await pay.isDisabled());
    await page.getByLabel("RUT del comprador", { exact: true }).fill("12.345.678-5");
    await page
      .getByLabel("Dirección de facturación", { exact: true })
      .fill("Dirección de prueba 123");
    await page.getByRole("checkbox").check();
    await pay.click();
    await page.waitForURL("https://sandbox.flow.cl/test-local-only");
    assert.equal(payCount, 1);
    assert.equal(captured[0].selection.addons.length, 2);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
assert.ok(results.every((r) => !r.overflow && !r.violations.length && !r.errors.length));

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const origin = "https://www.zyteron.cl";
const output = process.argv[2] || "output/redesign-08-11-2026/published-endpoints";
const results = [];
async function check(path, expectedStatus, init = {}) {
  const response = await fetch(origin + path, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.text();
  const result = {
    path,
    method: init.method || "GET",
    status: response.status,
    expectedStatus,
    location: response.headers.get("location"),
    robots: response.headers.get("x-robots-tag"),
    cache: response.headers.get("cache-control"),
  };
  results.push(result);
  assert.equal(response.status, expectedStatus, `${result.method} ${path}`);
  return { response, body, result };
}

await mkdir(output, { recursive: true });
try {
  const health = await check("/api/health", 200);
  assert.equal(JSON.parse(health.body).ok, true);
  await check("/api/control-core/commercial/measurement?days=7", 401);
  await check("/api/portal/requests", 401);
  await check("/api/portal/notifications", 401);
  await check("/api/contacto", 403, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  for (const path of ["/api/contacto", "/api/cotizador"]) {
    // Entradas rechazadas antes del límite de frecuencia y de cualquier escritura.
    const invalid = await check(path, 400, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: "{}",
    });
    assert.equal(Boolean(JSON.parse(invalid.body).leadId), false);
    await check(path, 413, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ message: "x".repeat(66000) }),
    });
    await check(path, 400, {
      method: "POST",
      headers: { "content-type": "text/plain", origin },
      body: "invalid",
    });
  }
  const admin = await check("/administracion", 307);
  assert.match(admin.result.location, /\/administracion\/login/);
  const customer = await check("/clientes/panel", 307);
  assert.match(customer.result.location, /\/clientes\/login/);
  const legacyPortal = await check("/portal-clientes", 307);
  assert.equal(legacyPortal.result.location, "/clientes");
  for (const path of ["/administracion/login", "/clientes/login"]) {
    const page = await check(path, 200);
    assert.ok(
      /noindex/i.test(page.result.robots || "") ||
        /<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(page.body),
      `${path}: noindex`,
    );
  }
} catch (error) {
  results.push({ failure: error.message });
  process.exitCode = 1;
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
}

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { checkFlowConnection } from "./flow";

test("verificación de Flow: lectura firmada, sin cobros ni datos privados en el resultado", async (t) => {
  const previous = { ...process.env };
  process.env.FLOW_API_KEY = "test-only-key";
  process.env.FLOW_SECRET_KEY = "test-only-secret";
  process.env.FLOW_API_BASE = "https://www.flow.cl/api";
  process.env.FLOW_LIVE_PAYMENTS_ENABLED = "false";
  t.after(() => {
    process.env = previous;
  });
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://www.flow.cl");
    assert.equal(url.pathname, "/api/payment/getPayments");
    assert.equal(init?.method, "GET");
    assert.equal(init?.body, undefined);
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    assert.equal(url.searchParams.get("limit"), "1");
    const params = Object.fromEntries(url.searchParams);
    const signature = params.s;
    delete params.s;
    assert.equal(
      signature,
      createHmac("sha256", "test-only-secret")
        .update(
          Object.keys(params)
            .sort()
            .map((key) => key + params[key])
            .join(""),
        )
        .digest("hex"),
    );
    return Response.json({ total: 1, data: [{ payer: "private@example.test", amount: 1000 }] });
  });
  assert.deepEqual(await checkFlowConnection(), { environment: "production", authenticated: true });
});

test("verificación de Flow: rechaza credenciales inválidas y respuestas incompletas", async (t) => {
  const previous = { ...process.env };
  process.env.FLOW_API_KEY = "test-only-key";
  process.env.FLOW_SECRET_KEY = "test-only-secret";
  process.env.FLOW_API_BASE = "https://www.flow.cl/api";
  t.after(() => {
    process.env = previous;
  });
  let status = 401;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "private-provider-detail" }, { status }),
  );
  await assert.rejects(
    checkFlowConnection(),
    (error: Error & { httpStatus?: number }) =>
      error.httpStatus === 401 && !error.message.includes("private-provider-detail"),
  );
  status = 200;
  await assert.rejects(checkFlowConnection(), /FLOW_CONNECTION_RESPONSE_INVALID/);
});

test("verificación de Flow: impide enviar las claves a un origen ajeno", async (t) => {
  const previous = { ...process.env };
  process.env.FLOW_API_KEY = "test-only-key";
  process.env.FLOW_SECRET_KEY = "test-only-secret";
  process.env.FLOW_API_BASE = "https://example.test/api";
  t.after(() => {
    process.env = previous;
  });
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("UNEXPECTED_REQUEST");
  });
  await assert.rejects(checkFlowConnection(), /origen autorizado/);
  assert.equal(fetch.mock.callCount(), 0);
});

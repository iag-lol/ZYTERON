import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { prisma } = require("../src/lib/prisma.ts");
const { POST } = require("../src/app/api/boletas/consulta/route.ts");

const origin = "https://www.zyteron.cl";
const token = "v1." + "a".repeat(60) + "." + "b".repeat(43);
const request = (body, suppliedOrigin = origin) =>
  new Request("http://localhost:3000/api/boletas/consulta", {
    method: "POST",
    headers: { origin: suppliedOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("consulta pública limita origen, carga, destinos, reintentos y respuestas PDF", async (t) => {
  const previous = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    CONTROL_INTERNAL_PORT: process.env.CONTROL_INTERNAL_PORT,
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
  };
  process.env.AUTH_SECRET = "synthetic-public-lookup-qa";
  process.env.NEXTAUTH_SECRET = "synthetic-public-lookup-qa";
  process.env.CONTROL_INTERNAL_PORT = "4010";
  process.env.PUBLIC_SITE_URL = origin;
  let hits = 1,
    calls = 0,
    response = () =>
      new Response("%PDF-synthetic", { headers: { "content-type": "application/pdf" } });
  const originalTransaction = prisma.$transaction;
  prisma.$transaction = t.mock.fn(async (work) =>
    work({ $queryRaw: async () => [{ hits }], $executeRaw: async () => 0 }),
  );
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls++;
    assert.match(url, /^http:\/\/127\.0\.0\.1:4010\/api\/public\/boletas\/consulta$/);
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(init.body), { token });
    return response();
  });
  try {
    assert.equal((await POST(request({ token }, "https://evil.example"))).status, 403);
    assert.equal(calls, 0);
    for (const body of [
      { token, path: "other.pdf" },
      { token: "invalid" },
      { token, userId: "other" },
    ])
      assert.equal((await POST(request(body))).status, 400);
    assert.equal(calls, 0);
    assert.equal((await POST(request({ token: "x".repeat(600) }))).status, 413);
    hits = 31;
    const limited = await POST(request({ token }));
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "60");
    assert.equal(calls, 0);
    hits = 1;
    const ok = await POST(request({ token }));
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), "%PDF-synthetic");
    assert.equal(ok.headers.get("cache-control"), "private, no-store");
    assert.equal(ok.headers.get("referrer-policy"), "no-referrer");
    for (const status of [400, 403, 404]) {
      response = () => new Response("private diagnostic", { status });
      const rejected = await POST(request({ token }));
      assert.equal(rejected.status, 404);
      assert(!(await rejected.text()).includes("private diagnostic"));
    }
    for (const result of [
      () => new Response("not PDF", { headers: { "content-type": "application/pdf" } }),
      () =>
        new Response("%PDF-" + "x".repeat(524288), {
          headers: { "content-type": "application/pdf" },
        }),
      () => new Response("internal", { status: 500 }),
      () => {
        throw Error("private connection detail");
      },
    ]) {
      response = result;
      const rejected = await POST(request({ token }));
      assert.equal(rejected.status, 503);
      assert(!(await rejected.text()).includes("private"));
    }
  } finally {
    prisma.$transaction = originalTransaction;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

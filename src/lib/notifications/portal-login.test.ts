import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  portalLoginMessage,
  deliverPortalLoginMail,
  loginMailNeedsReview,
  type LoginMailJob,
} from "./portal-login-format";

const job: LoginMailJob = {
  id: "58e6a9ed-bcdd-414e-bbda-177fcf5f32a1",
  recipient: "contacto@zyteron.cl",
  subject: "Ingreso",
  body_text: "Cliente de prueba",
  body_html: "<p>Cliente de prueba</p>",
  sender: "Zyteron <contacto@zyteron.cl>",
  first_attempt_at: new Date(),
  attempts: 1,
};

test("el aviso identifica al cliente y presenta fecha chilena sin interpretar HTML", () => {
  const result = portalLoginMessage(
    { name: "<img src=x>", company: "Transportes\nFenice", email: "cliente@example.cl" },
    new Date("2026-10-28T04:30:00Z"),
    "google",
  );
  assert.match(result.text, /28-10-2026 01:30/);
  assert.match(result.text, /Método: Google/);
  assert.match(result.text, /cliente@example.cl/);
  assert.ok(!result.html.includes("<img src=x>"));
  assert.ok(result.html.includes("&lt;img src=x&gt;"));
  assert.ok(!result.subject.includes("\n"));
});

test("el reintento envía exactamente el mismo mensaje y clave idempotente", async () => {
  const calls: RequestInit[] = [];
  const transport: typeof fetch = async (_url, init) => {
    calls.push(init!);
    return Response.json({ id: "provider-id" });
  };
  assert.equal(await deliverPortalLoginMail(job, "test-key", transport), "provider-id");
  await deliverPortalLoginMail(job, "test-key", transport);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(
    new Headers(calls[0].headers).get("Idempotency-Key"),
    `zyteron-portal-login/${job.id}`,
  );
});

test("no declara enviado un rechazo, una respuesta incompleta o un fallo de red", async () => {
  for (const status of [429, 500]) {
    await assert.rejects(
      deliverPortalLoginMail(job, "test", async () =>
        Response.json({ error: "unavailable" }, { status }),
      ),
      new RegExp(`HTTP_${status}`),
    );
  }
  await assert.rejects(
    deliverPortalLoginMail(job, "test", async () => Response.json({})),
    /HTTP_200/,
  );
  await assert.rejects(
    deliverPortalLoginMail(job, "test", async () => {
      throw Error("network");
    }),
    /network/,
  );
});

test("un envío antiguo incierto exige conciliación antes de repetirlo", () => {
  const now = new Date("2026-10-28T04:30:00Z").getTime();
  assert.equal(loginMailNeedsReview(null, now), false);
  assert.equal(loginMailNeedsReview(new Date(now - 22 * 3600000), now), false);
  assert.equal(loginMailNeedsReview(new Date(now - 23 * 3600000), now), true);
});

test("autenticación y recuperación de cola en el entorno de servidor", () => {
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "--test",
      fileURLToPath(new URL("./portal-login.server-test.ts", import.meta.url)),
    ],
    { encoding: "utf8", env: childEnv },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /tests 2/);
});

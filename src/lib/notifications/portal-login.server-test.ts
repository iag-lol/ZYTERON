import { test } from "node:test";
import assert from "node:assert/strict";
import { portalAuthOptions } from "../auth/portal-auth";
import { prisma } from "../prisma";
import { runPortalLoginNotifications } from "./portal-login-outbox";
import type { LoginMailJob } from "./portal-login-format";

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

test("la autenticación encola sólo nuevos ingresos de clientes y falla cerrada si no persiste", async (t) => {
  const identity = {
    id: "client-test",
    email: "cliente@example.cl",
    name: "Cliente",
    company: "Empresa",
    role: "CLIENT",
    accountStatus: "ACTIVE",
    emailVerifiedAt: new Date(),
    sessionVersion: 0,
  };
  let current = identity;
  let insertions = 0;
  let transactions = 0;
  let unavailable = false;
  const originalFind = prisma.user.findUnique;
  const originalTransaction = prisma.$transaction;
  const fakeDb = {
    user: { findUnique: async () => current, update: async () => current },
    $executeRaw: async () => {
      insertions++;
      return 1;
    },
  };
  prisma.user.findUnique = (async () => current) as unknown as typeof originalFind;
  prisma.$transaction = (async (fn: (db: typeof fakeDb) => Promise<unknown>) => {
    transactions++;
    if (unavailable) throw Error("queue unavailable");
    return fn(fakeDb);
  }) as unknown as typeof originalTransaction;
  t.after(() => {
    prisma.user.findUnique = originalFind;
    prisma.$transaction = originalTransaction;
  });
  const callback = portalAuthOptions.callbacks!.jwt!;
  const invoke = (isNew: boolean, provider: string, token = {}) =>
    callback({
      token: { email: identity.email, ...token },
      ...(isNew ? { user: { ...identity } } : {}),
      account: {
        provider,
        providerAccountId: identity.id,
        type: provider === "google" ? "oauth" : "credentials",
      },
    } as Parameters<typeof callback>[0]);
  const first = await invoke(true, "credentials");
  assert.equal(first.accountStatus, "ACTIVE");
  assert.equal(insertions, 1);
  await invoke(false, "credentials", first);
  assert.equal(transactions, 1, "renovar sesión no vuelve a notificar");
  const google = await invoke(true, "google");
  assert.equal(insertions, 2);
  assert.notEqual(first.credentialSessionId, google.credentialSessionId);
  current = { ...identity, role: "ADMIN" };
  await invoke(true, "credentials");
  assert.equal(insertions, 2, "administración no genera avisos de cliente");
  current = { ...identity, accountStatus: "DISABLED" };
  const disabled = await invoke(true, "google");
  assert.equal(disabled.accountStatus, "DISABLED");
  assert.equal(insertions, 2);
  current = identity;
  unavailable = true;
  const failed = await invoke(true, "credentials");
  assert.equal(failed.accountStatus, "DISABLED");
  assert.equal(failed.emailVerifiedAt, null);
});

test("la cola conserva avisos pendientes sin configuración, reintenta errores y registra aceptación", async (t) => {
  const originalQuery = prisma.$queryRaw;
  const originalExecute = prisma.$executeRaw;
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalSender = process.env.RESEND_FROM_EMAIL;
  const originalFallback = process.env.RESEND_FROM;
  const states: unknown[] = [];
  let queries = 0;
  let sends = 0;
  let status = 429;
  let old = false;
  prisma.$queryRaw = (async () => {
    queries++;
    return [
      {
        ...job,
        first_attempt_at: old ? new Date(Date.now() - 24 * 3600000) : job.first_attempt_at,
      },
    ];
  }) as unknown as typeof originalQuery;
  prisma.$executeRaw = (async (_strings: TemplateStringsArray, ...values: unknown[]) => {
    states.push(values[0]);
    return 1;
  }) as unknown as typeof originalExecute;
  globalThis.fetch = async () => {
    sends++;
    return Response.json(status === 200 ? { id: "accepted-id" } : { error: "throttled" }, {
      status,
    });
  };
  t.after(() => {
    prisma.$queryRaw = originalQuery;
    prisma.$executeRaw = originalExecute;
    globalThis.fetch = originalFetch;
    for (const [key, value] of [
      ["RESEND_API_KEY", originalKey],
      ["RESEND_FROM_EMAIL", originalSender],
      ["RESEND_FROM", originalFallback],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  });
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_FROM;
  await runPortalLoginNotifications();
  assert.equal(states.at(-1), "WAITING_CONFIGURATION");
  assert.equal(sends, 0);
  assert.equal(queries, 1);
  process.env.RESEND_API_KEY = "test";
  process.env.RESEND_FROM_EMAIL = job.sender!;
  await runPortalLoginNotifications();
  assert.equal(states.at(-1), "PENDING");
  status = 200;
  await runPortalLoginNotifications();
  assert.equal(states.at(-1), "ACCEPTED");
  assert.equal(sends, 2);
  old = true;
  await runPortalLoginNotifications();
  assert.equal(states.at(-1), "REVIEW_REQUIRED");
  assert.equal(sends, 2, "no repite un envío fuera del plazo idempotente");
});

import { mkdir, writeFile } from "node:fs/promises";
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { NextResponse } from "next/server";
process.env.NEXTAUTH_SECRET = "manual-quote-local-only-".repeat(3);
const db = new PGlite();
await db.exec(`CREATE TABLE zyteron_request_rate(key text PRIMARY KEY,hits integer NOT NULL DEFAULT 1,window_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE zyteron_public_submission(namespace text,key_hash text,body_hash text,state text,lease_until timestamptz,response jsonb,PRIMARY KEY(namespace,key_hash));
CREATE TABLE "Quote"(id text PRIMARY KEY,body jsonb);
CREATE TABLE "Lead"(id text PRIMARY KEY,body jsonb);
CREATE TABLE "User"(id text PRIMARY KEY,body jsonb);
CREATE TABLE zyteron_contact_events(event_key text PRIMARY KEY,payload jsonb);
`);
const moduleUrl = (f) => new URL(`../src/${f}`, import.meta.url).href;
let session = null,
  cookie = "",
  failLead = false,
  ready = true,
  sends = 0,
  providerPayments = 0,
  flowFail = false;
const payments = new Map();
const sql = (p) => p.map((s, i) => s + (i < p.length - 1 ? `$${i + 1}` : "")).join("");
const adapter = (c) => ({
  $queryRaw: async (p, ...v) => (await c.query(sql(p), v)).rows,
  $executeRaw: async (p, ...v) => (await c.query(sql(p), v)).affectedRows,
  ...Object.fromEntries(
    ["Quote", "Lead", "User"].map((table) => [
      table.toLowerCase(),
      {
        create: async ({ data }) => {
          if (table === "Lead" && failLead) throw Error("controlled failure");
          data = { id: randomUUID(), ...data };
          await c.query(`INSERT INTO "${table}" VALUES($1,$2::jsonb)`, [
            data.id,
            JSON.stringify(data),
          ]);
          return data;
        },
        findUnique: async ({ where }) =>
          (
            await c.query(
              `SELECT body FROM "${table}" WHERE ${where.id ? "id=$1" : "body->>'email'=$1"}`,
              [where.id || where.email],
            )
          ).rows[0]?.body || null,
        findFirst: async ({ where }) =>
          (
            await c.query(`SELECT body FROM "${table}" WHERE id=$1 AND body->>'userId'=$2`, [
              where.id,
              where.userId,
            ])
          ).rows[0]?.body || null,
        update: async ({ where, data }) =>
          (
            await c.query(`UPDATE "${table}" SET body=body||$2::jsonb WHERE id=$1 RETURNING body`, [
              where.id,
              JSON.stringify(data),
            ])
          ).rows[0].body,
      },
    ]),
  ),
});
mock.module("server-only", { defaultExport: {} });
mock.module("next/server", { namedExports: { NextResponse, after: () => {} } });
mock.module("next/headers", {
  namedExports: { cookies: async () => ({ get: () => (cookie ? { value: cookie } : undefined) }) },
});
mock.module(moduleUrl("lib/prisma.ts"), {
  namedExports: {
    prisma: { ...adapter(db), $transaction: (work) => db.transaction((tx) => work(adapter(tx))) },
  },
});
mock.module(moduleUrl("lib/auth/portal-session.ts"), {
  namedExports: { getPortalSession: async () => session },
});
mock.module(moduleUrl("lib/auth/portal-codes.ts"), {
  namedExports: {
    createEmailVerificationCode: async () => ({ code: "123456", expiresMinutes: 15 }),
  },
});
mock.module(moduleUrl("lib/notifications/portal-email.ts"), {
  namedExports: {
    sendPortalVerificationCodeEmail: async () => {
      sends++;
      return { sent: true };
    },
  },
});
mock.module(moduleUrl("lib/notifications/contact-outbox.ts"), {
  namedExports: { runContactNotifications: async () => {} },
});
mock.module(moduleUrl("lib/payments/flow.ts"), {
  namedExports: {
    assertFlowCheckoutReady: () => {
      if (!ready) throw Error("not ready");
    },
    createFlowPayment: async (input) => {
      if (flowFail) throw Error("controlled provider failure");
      if (!payments.has(input.commerceOrder)) {
        providerPayments++;
        payments.set(input.commerceOrder, {
          url: "https://www.flow.cl/app/web/pay.php",
          token: "test-token-123456789",
          flowOrder: 1000,
          ...input,
        });
      }
      return payments.get(input.commerceOrder);
    },
  },
});
mock.method(globalThis, "fetch", async () => {
  throw Error("External network prohibited");
});
const {
  POST: start,
  PATCH: update,
  GET: get,
} = await import("../src/app/api/manual-quote/route.ts");
const { POST: account } = await import("../src/app/api/manual-quote/account/route.ts");
const { POST: checkout } = await import("../src/app/api/manual-quote/checkout/route.ts");
const { GET: document } = await import("../src/app/api/manual-quote/document/route.ts");
const { CATALOG_VERSION } = await import("../src/lib/manual-quote/catalog.ts");
const { parseCheckoutMeta } = await import("../src/lib/checkout/orders.ts");
const selection = {
  version: CATALOG_VERSION,
  planId: "web-basica",
  addons: [{ id: "extraPage", quantity: 2 }],
};
const contact = {
  key: randomUUID(),
  name: "Prueba Local",
  email: "manual@example.com",
  phone: "+56911111111",
  consent: true,
  selection,
};
const bill = {
  expectedTotal: 309364,
  selection,
  accepted: true,
  billing: {
    rut: "12.345.678-5",
    address: "Dirección de prueba 123",
    documentType: "BOLETA",
    companyName: "",
    companyRut: "",
    businessLine: "",
  },
};
let ip = 0;
const req = (body, method = "POST") =>
  new Request("http://localhost/api/manual-quote", {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": `192.0.2.${++ip}` },
    body: JSON.stringify(
      method === "PATCH"
        ? { quoteId: orderId, selection: body }
        : body.firstName || body.billing
          ? { quoteId: orderId, ...body }
          : body,
    ),
  });
const count = async (table) =>
  Number((await db.query(`SELECT count(*) n FROM "${table}"`)).rows[0].n);
let orderId;
test("inicio concurrente: una cotización, un lead y un aviso duradero", async () => {
  const results = await Promise.all([start(req(contact)), start(req(contact))]);
  const data = await Promise.all(results.map((r) => r.json()));
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(data[0].id, data[1].id);
  orderId = data[0].id;
  cookie = results[0].headers.get("set-cookie").split(";")[0].split("=")[1];
  assert.equal(await count("Quote"), 1);
  assert.equal(await count("Lead"), 1);
  assert.equal(await count("zyteron_contact_events"), 1);
  const event = (await db.query("SELECT payload FROM zyteron_contact_events")).rows[0].payload;
  assert.match(event.title, /inició una cotización/);
  assert.match(event.body, /pendiente de verificar/);
});
test("guardar falla atómicamente: no quedan cotización o aviso huérfanos", async () => {
  failLead = true;
  try {
    assert.equal((await start(req({ ...contact, key: randomUUID() }))).status, 503);
  } finally {
    failLead = false;
  }
  assert.equal(await count("Quote"), 1);
  assert.equal(await count("zyteron_contact_events"), 1);
});
test("cotización solo acepta catálogo válido y no permite monto del navegador", async () => {
  assert.equal((await update(req({ ...selection, amount: 1 }, "PATCH"))).status, 400);
  assert.equal((await update(req({ ...selection, planId: "enterprise" }, "PATCH"))).status, 400);
  assert.equal((await update(req(selection, "PATCH"))).status, 200);
});
test("registro comprueba doble contraseña, correo del borrador y no reescribe cuentas", async () => {
  const data = {
    firstName: "Prueba",
    lastName: "Local",
    company: "Prueba",
    email: contact.email,
    password: "Contrasena123!",
    confirmPassword: "Contrasena123!",
  };
  assert.equal((await account(req({ ...data, confirmPassword: "otra" }))).status, 400);
  assert.equal((await account(req({ ...data, email: "ajeno@example.com" }))).status, 403);
  assert.equal(await count("User"), 0);
  assert.equal((await account(req(data))).status, 200);
  assert.equal(sends, 1);
  const saved = (await db.query('SELECT body FROM "User"')).rows[0].body;
  assert.equal(saved.role, "CLIENT");
  assert.equal(saved.accountStatus, "PENDING");
  assert.ok(saved.passwordHash.startsWith("$2"));
  assert.equal(
    (await account(req({ ...data, password: "Distinta123!", confirmPassword: "Distinta123!" })))
      .status,
    409,
  );
  assert.equal(sends, 1);
  assert.equal(await count("User"), 1);
});
test("pago requiere sesión activa, correo verificado y coincidencia de propietario", async () => {
  assert.equal((await checkout(req(bill))).status, 401);
  for (const user of [
    { id: "client", email: contact.email, accountStatus: "PENDING" },
    { id: "client", email: contact.email, accountStatus: "ACTIVE" },
    {
      id: "client",
      email: "ajeno@example.com",
      accountStatus: "ACTIVE",
      emailVerifiedAt: "2026-11-08",
    },
  ]) {
    session = { user };
    assert.equal((await checkout(req(bill))).status, 401);
  }
  assert.equal(providerPayments, 0);
  session = {
    user: {
      id: "client",
      email: contact.email,
      accountStatus: "ACTIVE",
      emailVerifiedAt: "2026-11-08",
    },
  };
});
test("sin aceptación, con RUT inválido o sin pasarela no se prepara un cobro", async () => {
  assert.equal((await checkout(req({ ...bill, accepted: false }))).status, 400);
  assert.equal(
    (await checkout(req({ ...bill, billing: { ...bill.billing, rut: "1-1" } }))).status,
    400,
  );
  assert.equal((await checkout(req({ ...bill, expectedTotal: 1 }))).status, 409);
  assert.equal(
    (await checkout(req({ ...bill, quoteId: "a2000000-0000-4000-a000-000000000002" }))).status,
    409,
  );
  ready = false;
  try {
    assert.equal((await checkout(req(bill))).status, 503);
  } finally {
    ready = true;
  }
  const saved = JSON.parse(
    (await adapter(db).quote.findUnique({ where: { id: orderId } })).message,
  );
  assert.equal(saved.type, "MANUAL_QUOTE");
  assert.equal(providerPayments, 0);
});
test("fallo y reintento del proveedor conserva una sola orden y el alcance aceptado", async () => {
  flowFail = true;
  try {
    assert.equal((await checkout(req(bill))).status, 503);
  } finally {
    flowFail = false;
  }
  const results = await Promise.all([checkout(req(bill)), checkout(req(bill))]);
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(providerPayments, 1);
  assert.equal(await count("Quote"), 1);
  const saved = await adapter(db).quote.findUnique({ where: { id: orderId } });
  assert.equal(saved.userId, "client");
  assert.equal(saved.total, 309364);
  const meta = parseCheckoutMeta(saved.message);
  assert.equal(meta.manualQuote.snapshot.total, 309364);
  assert.equal(meta.manualQuote.snapshot.addons[0].quantity, 2);
  assert.ok(meta.manualQuote.acceptedAt);
  assert.equal(meta.flow.flowOrder, 1000);
  assert.equal((await update(req({ ...selection, addons: [] }, "PATCH"))).status, 409);
  const status = await (await get()).json();
  assert.equal(status.ready, true);
  assert.equal(status.locked, true);
  assert.equal(status.billing.rut, "12.345.678-5");
});
test("pedido reservado de catálogo anterior conserva precio y reintento de pago", async () => {
  const saved = await adapter(db).quote.findUnique({ where: { id: orderId } });
  const meta = parseCheckoutMeta(saved.message);
  meta.manualQuote.snapshot.version = "08-11-2026.1";
  meta.manualQuote.snapshot.selection.version = "08-11-2026.1";
  await adapter(db).quote.update({
    where: { id: orderId },
    data: { message: JSON.stringify(meta) },
  });
  const response = await get();
  const data = await response.json();
  assert.equal(data.snapshot.version, "08-11-2026.1");
  assert.equal(data.snapshot.total, 309364);
  assert.equal(
    (await checkout(req({ ...bill, selection: meta.manualQuote.snapshot.selection }))).status,
    200,
  );
  assert.equal(
    (
      await checkout(
        req({ ...bill, selection: meta.manualQuote.snapshot.selection, expectedTotal: 1 }),
      )
    ).status,
    409,
  );
  assert.equal(providerPayments, 1);
});
test("PDF conserva el alcance y exige acceso al borrador o a la orden propia", async () => {
  const response = await document(new Request("http://localhost/api/manual-quote/document"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  const pdf = Buffer.from(await response.arrayBuffer());
  assert.ok(pdf.byteLength > 2000);
  await mkdir("output/cotizador-manual-08-11-2026/pdf-local", { recursive: true });
  await writeFile("output/cotizador-manual-08-11-2026/pdf-local/alcance.pdf", pdf);
  cookie = "bad";
  assert.equal(
    (await document(new Request("http://localhost/api/manual-quote/document"))).status,
    401,
  );
  assert.equal(
    (await document(new Request(`http://localhost/api/manual-quote/document?order=${orderId}`)))
      .status,
    200,
  );
  session = {
    user: {
      id: "other",
      email: "other@example.com",
      accountStatus: "ACTIVE",
      emailVerifiedAt: "2026-11-08",
    },
  };
  assert.equal(
    (await document(new Request(`http://localhost/api/manual-quote/document?order=${orderId}`)))
      .status,
    404,
  );
});
test.after(() => db.close());

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

// PostgreSQL embebido: ejecuta el SQL real de recepción, con modelos y avisos de prueba.
// No usa credenciales ni envía mensajes a servicios externos.
process.env.NEXTAUTH_SECRET = "local-reception-test-secret-only";
const db = new PGlite();
await db.exec(`
 CREATE TABLE zyteron_request_rate(key text PRIMARY KEY,hits integer NOT NULL DEFAULT 1,window_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE zyteron_public_submission(namespace text,key_hash text,body_hash text,state text,lease_until timestamptz,response jsonb,PRIMARY KEY(namespace,key_hash));
 CREATE TABLE records(kind text,id text,body jsonb,PRIMARY KEY(kind,id));
`);
let persistenceFails = false, leadFails = false, notificationFails = false, crmCalls = 0;
const inbox = [];
const moduleUrl = (file) => new URL(`../src/${file}`, import.meta.url).href;
const sql = (parts) => parts.map((part, index) => part + (index < parts.length - 1 ? `$${index + 1}` : "")).join("");
const adapter = (connection) => ({
 $queryRaw: async (parts, ...values) => (await connection.query(sql(parts), values)).rows,
 $executeRaw: async (parts, ...values) => (await connection.query(sql(parts), values)).affectedRows,
 ...Object.fromEntries(["lead", "quote"].map((kind) => [kind, {
   create: async ({ data }) => {
     if (persistenceFails || (kind === "lead" && leadFails)) throw new Error("Controlled storage failure");
     await connection.query("INSERT INTO records VALUES($1,$2,$3::jsonb)", [kind, data.id, JSON.stringify(data)]);
     return data;
   },
   count: async () => Number((await connection.query("SELECT count(*) n FROM records WHERE kind=$1", [kind])).rows[0].n),
 }]))
});
mock.module("server-only", { defaultExport: {} });
mock.module(moduleUrl("lib/prisma.ts"), { namedExports: { prisma: {
 ...adapter(db), $transaction: async (work) => db.transaction((tx) => work(adapter(tx))),
} } });
mock.module(moduleUrl("lib/auth/portal-session.ts"), { namedExports: { getPortalSession: async () => null } });
mock.module(moduleUrl("lib/notifications/lead-alert.ts"), { namedExports: {
 sendLeadAlertEmail: async (data) => {
   if (notificationFails) throw new Error("Controlled outbox outage");
   inbox.push(data); return { sent: false, queued: true, id: "test-outbox" };
 }
} });
mock.module(moduleUrl("lib/sales-ai/web-leads.ts"), { namedExports: { registerWebLeadSafe: () => { crmCalls++; } } });
mock.method(globalThis, "fetch", async () => { throw new Error("External network prohibited"); });
const { POST: contact } = await import("../src/app/api/contacto/route.ts");
const { POST: quote } = await import("../src/app/api/cotizaciones/route.ts");
let ip = 0;
const request = (endpoint, data) => new Request(`http://localhost/${endpoint}`, {
 method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${++ip}`, referer: "http://localhost/contacto?tipo=sistema&plan=sistema" }, body: JSON.stringify(data),
});
const count = async (kind) => Number((await db.query("SELECT count(*) n FROM records WHERE kind=$1", [kind.toLowerCase()])).rows[0].n);
const contactData = {
  clientSubmissionId: "a1000000-0000-4000-a000-000000000001",
  name: "Prueba local",
  email: "test@example.com",
  phone: "+56911111111",
  projectType: "Sistema interno",
  company: "Prueba",
  marketingSource: "tipo=sistema | plan=sistema",
  message: "Controlar documentos y aprobaciones.",
};
const quoteData = {
  clientSubmissionId: "a1000000-0000-4000-a000-000000000002",
  projectType: "tienda-online",
  businessName: "Prueba",
  hasWebsite: "no",
  hasLogo: "no-se",
  hasDomain: "no",
  hasContent: "no-se",
  projectAnswers: [{ key: "objetivo", label: "Objetivo", value: "Vender productos con pagos" }],
  budgetRange: "no-claro",
  deadline: "no-claro",
  urgency: "medio",
  contactName: "Prueba local",
  contactWhatsapp: "+56911111111",
  contactEmail: "test@example.com",
};


test("contacto: dos envíos concurrentes guardan una recepción, una referencia y un aviso", async () => {
 const responses = await Promise.all([contact(request("api/contacto", contactData)), contact(request("api/contacto", contactData))]);
 const receipts = await Promise.all(responses.map((r) => r.json()));
 assert.ok(responses.every((r) => r.status === 200));
 assert.deepEqual(receipts[0], receipts[1]); assert.ok(receipts[0].leadId);
 assert.equal(await count("lead"), 1); assert.equal(inbox.length, 1); assert.equal(crmCalls, 1);
 const saved = (await db.query("SELECT body FROM records WHERE kind='lead'")).rows[0].body;
 assert.match(saved.message, /sistemas_automatizacion/); assert.match(saved.message, /plan=sistema/);
 const retry = await contact(request("api/contacto", contactData));
 assert.deepEqual(await retry.json(), receipts[0]); assert.equal(inbox.length, 1);
});

test("editar un intento confirmado exige una nueva clave y no sobrescribe datos", async () => {
 const response = await contact(request("api/contacto", { ...contactData, message: "Una solicitud distinta" }));
 assert.equal(response.status, 409); assert.equal(await count("lead"), 1);
});

test("cotización y lead se guardan juntos; un reintento devuelve el mismo comprobante", async () => {
 const response = await quote(request("api/cotizaciones", quoteData));
 assert.equal(response.status, 200); const receipt = await response.json();
 assert.ok(receipt.quoteId && receipt.leadId && receipt.reference); assert.equal(await count("quote"), 1); assert.equal(await count("lead"), 2);
 const before = inbox.length;
 const retry = await quote(request("api/cotizaciones", quoteData));
 assert.deepEqual(await retry.json(), receipt); assert.equal(inbox.length, before);
});

test("fallo al guardar lead revierte también la cotización y permite reintentar", async () => {
 const payload = { ...quoteData, clientSubmissionId: "a1000000-0000-4000-a000-000000000003" };
 const before = await count("quote"), notices = inbox.length;
 leadFails = true;
 try { const response = await quote(request("api/cotizaciones", payload)); assert.equal(response.status, 503); assert.equal((await response.json()).ok, undefined); }
 finally { leadFails = false; }
 assert.equal(await count("quote"), before); assert.equal(inbox.length, notices);
 assert.equal((await quote(request("api/cotizaciones", payload))).status, 200);
 assert.equal(await count("quote"), before + 1);
});

test("fallo del aviso no elimina la consulta ni duplica el registro al reintentar", async () => {
 notificationFails = true;
 const payload = { ...contactData, clientSubmissionId: "a1000000-0000-4000-a000-000000000004" };
 try {
   const first = await contact(request("api/contacto", payload)); assert.equal(first.status, 200);
   const receipt = await first.json(), before = await count("lead");
   const retry = await contact(request("api/contacto", payload)); assert.deepEqual(await retry.json(), receipt);
   assert.equal(await count("lead"), before);
 } finally { notificationFails = false; }
});

test("catálogo, personas y flota conservan su clasificación al guardar la solicitud", async () => {
 for (const [index, projectType] of ["catalogo", "gestion-personas", "control-flota"].entries()) {
   const payload = { ...quoteData, projectType, clientSubmissionId: `positioning-20261108-${index}` };
   const before = inbox.length;
   const response = await quote(request("api/cotizaciones", payload));
   assert.equal(response.status, 200);
   const receipt = await response.json();
   const saved = (await db.query("SELECT body FROM records WHERE kind='quote' AND id=$1", [receipt.quoteId])).rows[0].body;
   assert.ok(JSON.stringify(saved).includes(projectType));
   assert.equal(inbox.length, before + 1);
   const retry = await quote(request("api/cotizaciones", payload));
   assert.deepEqual(await retry.json(), receipt);
   assert.equal(inbox.length, before + 1);
 }
});

test("entrada inválida, cuerpo excesivo y honeypot no confirman registros", async () => {
 const before = await count("lead");
 assert.equal((await contact(request("api/contacto", { ...contactData, email: "invalid" }))).status, 400);
 assert.equal((await contact(request("api/contacto", { ...contactData, message: "x".repeat(70000) }))).status, 413);
 const filtered = await contact(request("api/contacto", { ...contactData, website: "bot.example" }));
 assert.equal((await filtered.json()).leadId, undefined); assert.equal(await count("lead"), before);
});
test.after(() => db.close());

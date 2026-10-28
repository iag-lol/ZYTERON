import fs from "node:fs";
import assert from "node:assert/strict";
import pg from "pg";

const clientId = "5f0123e6-6712-4a33-8666-e818e3e7f512";
const url = new URL(process.env.DATABASE_URL);
assert.ok(
  url.hostname.includes("bwybwrxrbzjkwpxhpkcr") ||
    decodeURIComponent(url.username).includes("bwybwrxrbzjkwpxhpkcr"),
  "UNEXPECTED_DATABASE",
);
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
const db = new pg.Client({
  connectionString: url.toString(),
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(new URL("../src/lib/database/supabase-ca.crt", import.meta.url), "utf8"),
  },
  connectionTimeoutMillis: 15000,
});
const ident = (s) => `"${s.replaceAll('"', '""')}"`;
await db.connect();
try {
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await db.query("SET LOCAL statement_timeout='20s'");
  const columns = (
    await db.query(
      "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'",
    )
  ).rows;
  async function rows(table, ownerColumn, owner, fields) {
    const available = columns.filter((c) => c.table_name === table).map((c) => c.column_name);
    if (!available.includes(ownerColumn)) return { unavailable: true };
    const selected = fields.split(",").filter((f) => available.includes(f));
    assert.ok(selected.length, `NO_SAFE_COLUMNS:${table}`);
    return (
      await db.query(
        `SELECT ${selected.map(ident).join(",")} FROM public.${ident(table)} WHERE ${ident(ownerColumn)}=$1 LIMIT 200`,
        [owner],
      )
    ).rows;
  }
  const client = await rows("clients", "id", clientId, "id,legal_name,trade_name,rut,status");
  assert.equal(client.length, 1, "CLIENT_NOT_FOUND");
  assert.equal(client[0].rut.replace(/[^0-9k]/gi, "").toUpperCase(), "76710961K");
  const links = await rows(
    "zyteron_legacy_client_link",
    "client_id",
    clientId,
    "client_id,user_id",
  );
  assert.equal(links.length, 1, "AMBIGUOUS_PORTAL_OWNER");
  const userId = links[0].user_id;
  const report = { checkedAt: new Date().toISOString(), mode: "READ_ONLY", client, links };
  const specs = [
    [
      "client_portal_settings",
      "client_id",
      clientId,
      "enabled,projects_visible,documents_visible,invoices_visible,tickets_visible,monitoring_visible,audits_visible",
    ],
    [
      "projects",
      "client_id",
      clientId,
      "id,project_number,name,status,progress,quote_id,work_order_id,legacy_project_id,client_visibility,completed_at,production_url",
    ],
    [
      "work_orders",
      "client_id",
      clientId,
      "id,work_order_number,title,status,quote_id,completed_at",
    ],
    [
      "client_services",
      "client_id",
      clientId,
      "id,service_name,status,project_id,legacy_project_id,legacy_quote_id,contract_id,billing_frequency,billing_type,agreed_price,currency,portal_visible,start_date,renewal_date",
    ],
    ["quotes", "client_id", clientId, "id,quote_number,status,billing_type,total_amount,currency"],
    [
      "invoices",
      "client_id",
      clientId,
      "id,invoice_number,description,status,total_amount,balance_due,currency,issue_date,due_date,quote_id,project_id",
    ],
    [
      "payments",
      "client_id",
      clientId,
      "id,payment_number,payment_reference,status,gross_amount,currency,received_at,confirmed_at",
    ],
    ["User", "id", userId, "id,company,accountStatus,emailVerifiedAt,role,authProvider"],
    ["Project", "clientId", userId, "id,title,status,quoteId,saleId,totalCharge,startDate,endDate"],
    [
      "Receivable",
      "clientId",
      userId,
      "id,description,status,totalAmount,currency,quoteId,projectId,saleId,dueAt",
    ],
    [
      "ClientDocument",
      "userId",
      userId,
      "id,title,category,fileName,mimeType,storagePath,projectId,quoteId,taxDocumentId,isPrivate,createdAt",
    ],
    ["ClientCredential", "userId", userId, "id,serviceName,projectId,isSensitive,updatedAt"],
    [
      "zyteron_billing_documents",
      "user_id",
      userId,
      "id,document_id,target_type,target_source,target_id",
    ],
    [
      "zyteron_monthly_plans",
      "user_id",
      userId,
      "id,quote_id,native_quote_id,label,amount,status,anchor_date,next_due,reminders_enabled",
    ],
    ["ClientNotification", "userId", userId, "id,title,body,isRead,createdAt"],
  ];
  for (const [table, ownerColumn, owner, fields] of specs)
    report[table] = await rows(table, ownerColumn, owner, fields);
  const quotes = await rows("Quote", "userId", userId, "id,status,total,message");
  report.Quote = quotes.map(({ message, ...q }) => {
    let meta = {};
    try {
      meta = JSON.parse(message || "{}");
    } catch {}
    return {
      ...q,
      number: meta.quoteCode || meta.quoteNumber,
      controlState: meta.controlState,
      billingType: meta.payment?.billingType,
      paymentEnabled: meta.payment?.enabled,
      recurringAmount: meta.payment?.subscription?.amount,
      recurringStatus: meta.payment?.subscription?.status,
    };
  });
  await db.query("ROLLBACK");
  const output = process.env.ZYTERON_AUDIT_OUTPUT;
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  else console.log(JSON.stringify(report, null, 2));
} finally {
  await db.end();
}

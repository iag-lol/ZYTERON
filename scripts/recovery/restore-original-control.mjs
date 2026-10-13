import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
const { Client } = createRequire(path.resolve("package.json"))("pg");
const recoveryDir = process.env.ZYTERON_RECOVERY_DIR;
if (!recoveryDir) throw Error("ZYTERON_RECOVERY_DIR is required");
const artifact = (name) => path.join(recoveryDir, name);
const source = JSON.parse(fs.readFileSync(artifact("recovery-data-private.json"))),
  meta = JSON.parse(fs.readFileSync(artifact("recovery-target-metadata-private.json"))),
  config = JSON.parse(fs.readFileSync(artifact("recovery-destination-private.json")));
const quote = (v) => '"' + String(v).replaceAll('"', '""') + '"';
const schema = (t) => "public." + quote(t);
const pk = (t) =>
  meta.constraints.find((c) => c.table_name === t && c.contype === "p")?.columns || [];
const key = (t, r) => JSON.stringify(pk(t).map((k) => String(r[k])));
const maps = {};
for (const [t, rows] of Object.entries(source))
  maps[t] = new Map(rows.map((r) => [key(t, r), { ...r }]));
const nr = (v) =>
  String(v || "")
    .replace(/[^0-9k]/gi, "")
    .toUpperCase();
for (const row of source.clients) {
  const matches = meta.clients.filter((v) => nr(v.rut) === nr(row.rut));
  if (matches.length > 1) throw Error("Ambiguous legal identity");
  if (matches.length === 1) {
    if (
      String(matches[0].general_email || "").toLowerCase() !==
      String(row.general_email || "").toLowerCase()
    )
      throw Error("Client contact requires review");
    maps.clients.set(key("clients", row), matches[0]);
  }
}
const indexesFor = (t) => meta.uniqueIndexes.filter((i) => i.table_name === t);
function expressionValue(k, r) {
  let name = k.replace(/^"|"$/g, "");
  if (Object.hasOwn(r, name)) return r[name];
  const match = k.match(/^lower\(\(?"?([a-z_0-9]+)"?\)?(?:::text)?\)$/);
  if (match) return String(r[match[1]] || "").toLowerCase();
  return undefined;
}
function applies(i, r) {
  if (!i.predicate) return true;
  if (i.predicate === "active") return Boolean(r.active);
  if (i.predicate.includes("archived_at IS NULL")) return r.archived_at === null;
  if (i.predicate.includes("IS NOT NULL"))
    return i.keys.every((k) => expressionValue(k, r) != null);
  return true;
}
function sameIndex(i, a, b) {
  if (!applies(i, a) || !applies(i, b)) return false;
  const av = i.keys.map((k) => expressionValue(k, a)),
    bv = i.keys.map((k) => expressionValue(k, b));
  if (av.some((v) => v === undefined) || bv.some((v) => v === undefined)) return false;
  if (!i.indnullsnotdistinct && (av.some((v) => v === null) || bv.some((v) => v === null)))
    return false;
  return av.every((v, n) => String(v) === String(bv[n]));
}
function translated(t, row) {
  const out = { ...row };
  if (out.client_id != null) {
    const parent = source.clients.find((c) => c.id === out.client_id);
    if (parent) out.client_id = maps.clients.get(key("clients", parent)).id;
  }
  for (const fk of meta.constraints.filter((c) => c.table_name === t && c.contype === "f")) {
    const parent = fk.parent_table.replace(/^public\./, "").replaceAll('"', "");
    if (!source[parent]) continue;
    const original = source[parent].find((p) =>
      fk.parent_columns.every((k, n) => String(p[k]) === String(row[fk.columns[n]])),
    );
    if (!original) continue;
    const mapped = maps[parent].get(key(parent, original));
    for (let n = 0; n < fk.columns.length; n++) out[fk.columns[n]] = mapped[fk.parent_columns[n]];
  }
  if (t === "document_links" && out.link_type === "CLIENT") {
    const parent = source.clients.find((c) => c.id === out.linked_id);
    if (parent) out.linked_id = maps.clients.get(key("clients", parent)).id;
  }
  return out;
}
for (let pass = 0; pass < 8; pass++) {
  let changed = false;
  for (const [t, rows] of Object.entries(source)) {
    for (const row of rows) {
      if (t === "clients") continue;
      const candidate = translated(t, row),
        matches = (meta.rows[t] || []).filter((target) =>
          indexesFor(t).some((i) => sameIndex(i, candidate, target)),
        );
      const ids = new Set(matches.map((m) => key(t, m)));
      if (ids.size > 1) throw Error("Conflicting identity in " + t);
      const next = matches[0] || candidate,
        old = maps[t].get(key(t, row));
      if (JSON.stringify(old) !== JSON.stringify(next)) {
        maps[t].set(key(t, row), next);
        changed = true;
      }
    }
  }
  if (!changed) break;
}
const excluded = (t) =>
  /^(app_|role_|security_|authorization_)/.test(t) ||
  [
    "registered_devices",
    "business_event_outbox",
    "system_jobs",
    "system_diagnostics",
    "monitoring_worker_heartbeats",
    "commercial_idempotency_keys",
    "finance_idempotency_keys",
    "commercial_notifications",
    "finance_notifications",
  ].includes(t);
const tables = Object.keys(source).filter((t) => !excluded(t));
const incoming = {};
for (const t of tables)
  incoming[t] = source[t]
    .map((r) => maps[t].get(key(t, r)))
    .filter((r) => !(meta.rows[t] || []).some((e) => key(t, e) === key(t, r)));
const url = new URL(config.DATABASE_URL);
if (
  !url.username.includes("bwybwrxrbzjkwpxhpkcr") &&
  !url.hostname.includes("bwybwrxrbzjkwpxhpkcr")
)
  throw Error("Wrong project");
for (const k of ["sslmode", "sslcert", "sslrootcert", "sslkey"]) url.searchParams.delete(k);
const db = new Client({
  connectionString: url.toString(),
  ssl: {
    ca: fs.readFileSync("src/lib/database/supabase-ca.crt", "utf8"),
    rejectUnauthorized: true,
  },
});
await db.connect();
await db.query("BEGIN");
const batch = randomUUID(),
  report = [];
let phase = "prepare";
try {
  await db.query("SET LOCAL lock_timeout='8s'; SET LOCAL statement_timeout='60s'");
  await db.query("SELECT pg_advisory_xact_lock(hashtext('zyteron_original_control_recovery'))");
  await db.query(
    `CREATE TABLE IF NOT EXISTS public.zyteron_control_recovery_batches(id uuid PRIMARY KEY,source_project text NOT NULL,source_sha256 text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),manifest jsonb NOT NULL);CREATE TABLE IF NOT EXISTS public.zyteron_control_recovery_records(batch_id uuid NOT NULL REFERENCES public.zyteron_control_recovery_batches(id),table_name text NOT NULL,source_pk text NOT NULL,target_pk jsonb NOT NULL,disposition text NOT NULL,snapshot jsonb NOT NULL,PRIMARY KEY(batch_id,table_name,source_pk));ALTER TABLE public.zyteron_control_recovery_batches ENABLE ROW LEVEL SECURITY;ALTER TABLE public.zyteron_control_recovery_records ENABLE ROW LEVEL SECURITY;REVOKE ALL ON public.zyteron_control_recovery_batches,public.zyteron_control_recovery_records FROM PUBLIC,anon,authenticated;GRANT SELECT,INSERT ON public.zyteron_control_recovery_batches,public.zyteron_control_recovery_records TO service_role`,
  );
  const touched = tables.filter((t) => incoming[t].length > 0);
  const triggerStates = (
    await db.query(
      "SELECT c.relname AS table_name,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname=ANY($1)",
      [touched],
    )
  ).rows;
  const foreignKeys = meta.constraints.filter(
    (c) => c.contype === "f" && touched.includes(c.table_name),
  );
  for (const fk of foreignKeys)
    if (!fk.condeferrable)
      await db.query(
        `ALTER TABLE ${schema(fk.table_name)} ALTER CONSTRAINT ${quote(fk.conname)} DEFERRABLE INITIALLY DEFERRED`,
      );
  await db.query("SET CONSTRAINTS ALL DEFERRED");
  for (const t of touched) await db.query(`ALTER TABLE ${schema(t)} DISABLE TRIGGER USER`);
  for (const t of tables) {
    phase = t;
    const rows = incoming[t];
    if (!rows.length) continue;
    const columns = meta.columns
      .filter(
        (c) =>
          c.table_name === t &&
          c.is_generated === "NEVER" &&
          source[t].some((r) => Object.hasOwn(r, c.column_name)),
      )
      .map((c) => c.column_name);
    const sql = `INSERT INTO ${schema(t)}(${columns.map(quote).join(",")}) OVERRIDING SYSTEM VALUE SELECT ${columns.map(quote).join(",")} FROM jsonb_populate_recordset(NULL::${schema(t)},$1::jsonb) ON CONFLICT DO NOTHING`;
    const result = await db.query(sql, [JSON.stringify(rows)]);
    report.push({ table: t, source: source[t].length, inserted: result.rowCount });
  }
  phase = "references";
  await db.query("SET CONSTRAINTS ALL IMMEDIATE");
  for (const fk of foreignKeys)
    if (!fk.condeferrable)
      await db.query(
        `ALTER TABLE ${schema(fk.table_name)} ALTER CONSTRAINT ${quote(fk.conname)} NOT DEFERRABLE`,
      );
    else if (!fk.condeferred)
      await db.query(
        `ALTER TABLE ${schema(fk.table_name)} ALTER CONSTRAINT ${quote(fk.conname)} DEFERRABLE INITIALLY IMMEDIATE`,
      );
  for (const t of triggerStates) {
    const action = { O: "ENABLE", A: "ENABLE ALWAYS", R: "ENABLE REPLICA", D: "DISABLE" }[
      t.tgenabled
    ];
    await db.query(`ALTER TABLE ${schema(t.table_name)} ${action} TRIGGER ${quote(t.tgname)}`);
  }
  for (const row of source.numbering_sequences || []) {
    const mapped = maps.numbering_sequences.get(key("numbering_sequences", row));
    await db.query(
      "UPDATE public.numbering_sequences SET next_value=GREATEST(next_value,$1) WHERE id=$2",
      [row.next_value, mapped.id],
    );
  }
  phase = "privacy";
  const privateTables = Object.keys(source);
  const views = (
    await db.query(
      `SELECT DISTINCT v.relname AS view_name FROM pg_rewrite r JOIN pg_class v ON v.oid=r.ev_class JOIN pg_depend d ON d.objid=r.oid JOIN pg_class t ON t.oid=d.refobjid JOIN pg_namespace n ON n.oid=v.relnamespace WHERE n.nspname='public' AND v.relkind='v' AND t.relname=ANY($1)`,
      [privateTables],
    )
  ).rows;
  for (const name of [
    "monitoring_portal_maintenance",
    "monitoring_portal_status",
    "monitoring_portal_incidents",
    "finance_portal_payments",
    "finance_portal_invoices",
    "portal_quote_payments",
  ])
    if (!views.some((v) => v.view_name === name)) views.push({ view_name: name });
  for (const v of views) {
    await db.query(
      `ALTER VIEW ${schema(v.view_name)} SET (security_invoker=true); REVOKE ALL ON ${schema(v.view_name)} FROM PUBLIC,anon,authenticated; GRANT SELECT ON ${schema(v.view_name)} TO service_role`,
    );
  }
  const funcs = (
    await db.query(
      "SELECT p.oid::regprocedure::text AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef",
    )
  ).rows;
  for (const f of funcs)
    await db.query(
      "REVOKE EXECUTE ON FUNCTION " +
        f.signature +
        " FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION " +
        f.signature +
        " TO service_role",
    );
  phase = "lineage";
  await db.query(
    "INSERT INTO public.zyteron_control_recovery_batches(id,source_project,source_sha256,manifest) VALUES($1,$2,$3,$4)",
    [
      batch,
      "hyvregmkdawcbeuhhaqc",
      createHash("sha256").update(JSON.stringify(source)).digest("hex"),
      JSON.stringify({
        report,
        archivedOnly: Object.keys(source).filter(excluded),
        viewsSecured: views.length,
        functionsSecured: funcs.length,
      }),
    ],
  );
  const archive = [];
  for (const [t, rows] of Object.entries(source))
    for (const row of rows) {
      const mapped = maps[t].get(key(t, row));
      archive.push({
        batch_id: batch,
        table_name: t,
        source_pk: key(t, row),
        target_pk: Object.fromEntries(pk(t).map((k) => [k, mapped[k]])),
        disposition: excluded(t)
          ? "ARCHIVED_ONLY"
          : incoming[t]?.some((v) => key(t, v) === key(t, mapped))
            ? "RESTORED"
            : "LINKED_EXISTING",
        snapshot: row,
      });
    }
  await db.query(
    "INSERT INTO public.zyteron_control_recovery_records SELECT * FROM jsonb_populate_recordset(NULL::public.zyteron_control_recovery_records,$1::jsonb)",
    [JSON.stringify(archive)],
  );
  const counts = {};
  for (const t of [
    "clients",
    "projects",
    "work_orders",
    "monitors",
    "documents",
    "payments",
    "support_tickets",
    "sales",
  ])
    counts[t] = (await db.query(`SELECT count(*)::int AS n FROM ${schema(t)}`)).rows[0].n;
  const applied = process.argv.includes("--apply");
  if (applied)
    await db.query(
      fs.readFileSync(
        "supabase/migrations/20261013040801_recovered_identity_sequences.sql",
        "utf8",
      ),
    );
  await db.query(applied ? "COMMIT" : "ROLLBACK");
  fs.writeFileSync(
    artifact("recovery-import-report.json"),
    JSON.stringify(
      {
        applied,
        batch,
        report,
        counts,
        archivedRecords: archive.length,
        securedViews: views.length,
        securedFunctions: funcs.length,
      },
      null,
      2,
    ),
  );
  console.log({
    applied,
    batch,
    restoredTables: report.length,
    restoredRows: report.reduce((n, r) => n + r.inserted, 0),
    counts,
    archivedRecords: archive.length,
    securedViews: views.length,
    securedFunctions: funcs.length,
  });
} catch (e) {
  await db.query("ROLLBACK");
  console.log({
    failed: true,
    phase,
    code: e.code,
    table: e.table,
    constraint: e.constraint,
    message: e.message.replace(/(?:postgres(?:ql)?:\/\/|sb_secret_|eyJ)\S+/g, "[private]"),
  });
  process.exitCode = 1;
} finally {
  await db.end();
}

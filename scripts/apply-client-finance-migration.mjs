import fs from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import pg from "pg";

const file = "supabase/migrations/20261024090000_client_finance_and_lead_enrollment.sql";
const sql = fs.readFileSync(file, "utf8"),
  version = "20261024090000",
  digest = createHash("sha256").update(sql).digest("hex");
const apply = process.argv.includes("--apply");
const d = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("src/lib/database/supabase-ca.crt", "utf8"),
  },
});
await d.connect();
try {
  await d.query("BEGIN");
  await d.query("SET LOCAL lock_timeout='8s'");
  await d.query(
    `CREATE TABLE IF NOT EXISTS public.zyteron_admin_client_migrations(version text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());ALTER TABLE public.zyteron_admin_client_migrations ENABLE ROW LEVEL SECURITY;REVOKE ALL ON public.zyteron_admin_client_migrations FROM PUBLIC,anon,authenticated;GRANT SELECT ON public.zyteron_admin_client_migrations TO service_role`,
  );
  const existing = (
    await d.query("SELECT sha256 FROM public.zyteron_admin_client_migrations WHERE version=$1", [
      version,
    ])
  ).rows[0];
  if (existing) {
    assert.equal(existing.sha256, digest, "MIGRATION_HASH_MISMATCH");
    await d.query("ROLLBACK");
    console.log(JSON.stringify({ version, alreadyApplied: true }));
  } else {
    await d.query(sql);
    if (apply) {
      await d.query(
        "INSERT INTO public.zyteron_admin_client_migrations(version,sha256) VALUES($1,$2)",
        [version, digest],
      );
      await d.query("NOTIFY pgrst,'reload schema'");
      await d.query("COMMIT");
      console.log(
        JSON.stringify({
          version,
          committed: true,
          accountsCreated: 0,
          paymentsChanged: 0,
          externalMessages: 0,
        }),
      );
    } else {
      const id = randomUUID(),
        email = `qa-${id}@example.invalid`;
      let rut;
      for (let n = 99999998; n > 99999900; n--) {
        let sum = 0,
          factor = 2;
        for (const digit of String(n).split("").reverse()) {
          sum += Number(digit) * factor;
          factor = factor === 7 ? 2 : factor + 1;
        }
        const dv = 11 - (sum % 11),
          candidate = `${n}-${dv === 11 ? "0" : dv === 10 ? "K" : dv}`;
        const found = await d.query(
          "SELECT 1 FROM clients WHERE upper(regexp_replace(rut,'[^0-9kK]','','g'))=replace($1,'-','')",
          [candidate],
        );
        if (!found.rowCount) {
          rut = candidate;
          break;
        }
      }
      assert.ok(rut);
      await d.query(
        "INSERT INTO leads(id,company_name,contact_name,email,status) VALUES($1,'QA TRANSACCIONAL','Contacto QA',$2,'NEW')",
        [id, email],
      );
      const args = [id, rut, "QA TRANSACCIONAL", email, "$2b$12$" + "a".repeat(53)];
      const first = (
        await d.query("SELECT zyteron_enroll_lead($1,$2,$3,$4,$5,null) AS result", args)
      ).rows[0].result;
      assert.equal(first.created, true);
      const retry = (
        await d.query("SELECT zyteron_enroll_lead($1,$2,$3,$4,$5,null) AS result", args)
      ).rows[0].result;
      assert.equal(retry.created, false);
      assert.equal(first.clientId, retry.clientId);
      const user = (
        await d.query('SELECT role,"accountStatus","emailVerifiedAt" FROM "User" WHERE id=$1', [
          first.userId,
        ])
      ).rows[0];
      assert.equal(user.role, "CLIENT");
      assert.equal(user.accountStatus, "PENDING");
      assert.equal(user.emailVerifiedAt, null);
      const permission = (
        await d.query(
          "SELECT has_table_privilege('zyteron_portal_client','zyteron_portal_login_ruts','SELECT') AS exposed",
        )
      ).rows[0];
      assert.equal(permission.exposed, false);
      await d.query("ROLLBACK");
      assert.equal(
        (await d.query('SELECT id FROM "User" WHERE id=$1', [first.userId])).rowCount,
        0,
      );
      console.log(
        JSON.stringify({
          version,
          schemaCheck: true,
          enrollmentCheck: true,
          retryCheck: true,
          portalIsolation: true,
          rolledBack: true,
          accountsPersisted: 0,
          externalMessages: 0,
        }),
      );
    }
  }
} catch (error) {
  await d.query("ROLLBACK");
  console.error(
    JSON.stringify({
      version,
      failed: true,
      code: error.code || "CHECK_FAILED",
      message: error.message,
    }),
  );
  process.exitCode = 1;
} finally {
  await d.end();
}

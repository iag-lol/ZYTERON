import fs from "node:fs";
import pg from "pg";

// This private configuration is deliberately kept outside the repository.
const privatePath = process.env.ZYTERON_RECOVERY_CONFIG;
if (!privatePath) throw new Error("ZYTERON_RECOVERY_CONFIG is required");
const config = JSON.parse(fs.readFileSync(privatePath, "utf8"));
const url = new URL(config.DATABASE_URL);
if (
  !url.username.includes("bwybwrxrbzjkwpxhpkcr") &&
  !url.hostname.includes("bwybwrxrbzjkwpxhpkcr")
)
  throw new Error("Unexpected recovery destination");
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
const db = new pg.Client({
  connectionString: url.toString(),
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("src/lib/database/supabase-ca.crt", "utf8"),
  },
});
await db.connect();
try {
  if (process.argv.includes("--repair-sequences")) {
    await db.query("BEGIN");
    await db.query("SET LOCAL lock_timeout='8s'; SET LOCAL statement_timeout='60s'");
    await db.query(
      fs.readFileSync(
        "supabase/migrations/20261013040801_recovered_identity_sequences.sql",
        "utf8",
      ),
    );
    await db.query("COMMIT");
  }
  const sequences =
    await db.query(`SELECT c.relname,a.attname,pg_get_serial_sequence(format('%I.%I',n.nspname,c.relname),a.attname) AS sequence_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    WHERE n.nspname='public' AND pg_get_serial_sequence(format('%I.%I',n.nspname,c.relname),a.attname) IS NOT NULL`);
  const report = [];
  const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
  for (const s of sequences.rows) {
    const maximum = (
      await db.query(
        `SELECT max(${quote(s.attname)})::text AS maximum FROM public.${quote(s.relname)}`,
      )
    ).rows[0].maximum;
    const state = (await db.query(`SELECT last_value::text,is_called FROM ${s.sequence_name}`))
      .rows[0];
    report.push({ table: s.relname, column: s.attname, maximum, ...state });
  }
  const constraints = (
    await db.query(
      "SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.payments'::regclass AND contype='c'",
    )
  ).rows;
  console.log(JSON.stringify({ sequences: report, paymentConstraints: constraints }, null, 2));
} catch (error) {
  await db.query("ROLLBACK");
  console.error({ code: error.code, message: "Recovery database verification failed" });
  process.exitCode = 1;
} finally {
  await db.end();
}

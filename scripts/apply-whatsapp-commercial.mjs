import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const migration = "20261021014026_connect_whatsapp_commercial_leads.sql";
export async function applyWhatsappCommercialMigration() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  if (!raw) throw new Error("DATABASE_URL_REQUIRED");
  const target = new URL(raw);
  const supabase = /\.supabase\.(co|com)$/.test(target.hostname);
  if (supabase)
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
      target.searchParams.delete(key);
  const db = new pg.Client({
    connectionString: target.toString(),
    connectionTimeoutMillis: 10_000,
    ...(supabase ? { ssl: {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA || readFileSync(new URL("../src/lib/database/supabase-ca.crt", import.meta.url), "utf8"),
    } } : {}),
  });
  const sql = readFileSync(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  try {
    await db.connect();
    await db.query("BEGIN");
    await db.query("SET LOCAL lock_timeout='8s'; SET LOCAL statement_timeout='60s'");
    await db.query("SELECT pg_advisory_xact_lock(hashtext('zyteron:whatsapp-commercial-migration'))");
    await db.query(`CREATE TABLE IF NOT EXISTS public.zyteron_admin_client_migrations (
      version text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());
      ALTER TABLE public.zyteron_admin_client_migrations ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON public.zyteron_admin_client_migrations FROM PUBLIC,anon,authenticated;
      GRANT SELECT ON public.zyteron_admin_client_migrations TO service_role`);
    const version = migration.slice(0, 14);
    const { rows } = await db.query("SELECT sha256 FROM public.zyteron_admin_client_migrations WHERE version=$1", [version]);
    if (rows.length && rows[0].sha256 !== checksum) throw new Error("WHATSAPP_MIGRATION_CHECKSUM_MISMATCH");
    if (!rows.length) {
      await db.query(sql);
      const validation = await db.query(`SELECT count(*)::int AS missing
        FROM public.whatsapp_conversations c LEFT JOIN public.leads l
        ON l.whatsapp_conversation_id=c.id WHERE l.id IS NULL`);
      if (validation.rows[0].missing !== 0) throw new Error("WHATSAPP_LEADS_INCOMPLETE");
      await db.query("INSERT INTO public.zyteron_admin_client_migrations(version,sha256) VALUES($1,$2)", [version, checksum]);
    }
    await db.query("COMMIT");
    console.log(JSON.stringify({ whatsappCommercialMigration: rows.length ? "current" : "applied" }));
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw new Error(`WHATSAPP_COMMERCIAL_MIGRATION_FAILED:${error.code || "SCHEMA"}`);
  } finally {
    await db.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await applyWhatsappCommercialMigration();

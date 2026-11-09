import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
try {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;");
  const sql = await readFile(new URL("../supabase/web_visit_storage.sql", import.meta.url), "utf8");
  const migration = await readFile(
    new URL("../supabase/migrations/20261109073000_web_visit_storage.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  await db.exec("SET ROLE service_role;");
  await db.query(
    'INSERT INTO public."WebVisit" (id,path,"ipHash","sessionId") VALUES ($1,$2,$3,$4)',
    ["qa-visit", "/contacto", "hashed-test", "opaque-test"],
  );
  await db.exec("RESET ROLE;");
  await db.exec(sql);
  await db.exec(migration);
  await db.exec("SET ROLE service_role;");
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM public."WebVisit"')).rows[0].count,
    1,
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`RESET ROLE; SET ROLE ${role};`);
    await assert.rejects(
      db.query('SELECT * FROM public."WebVisit"'),
      (error) => error.code === "42501",
    );
    await assert.rejects(
      db.query('INSERT INTO public."WebVisit" (id,path) VALUES ($1,$2)', ["denied", "/"]),
      (error) => error.code === "42501",
    );
  }
  await db.exec("RESET ROLE;");
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM public."WebVisit"')).rows[0].count,
    1,
  );
  console.log(
    "PASS: ejecución repetida, lectura/escritura del backend, denegación de anon/authenticated y conservación de la fila. PostgreSQL embebido; sin acceso a producción.",
  );
} finally {
  await db.close();
}

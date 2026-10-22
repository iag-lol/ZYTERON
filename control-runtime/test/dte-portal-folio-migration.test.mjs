import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const source = await readFile(
  new URL(
    "../../supabase/migrations/20261021202723_finance_dte_compatibility.sql",
    import.meta.url,
  ),
  "utf8",
);
const migration = source.slice(
  0,
  source.indexOf("create function public.finance_sync_dte_compatibility"),
);
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table tax_documents(id int primary key,client_id text,folio integer);
    insert into tax_documents values(1,'client-a',123),(2,'client-b',456);
    grant select on tax_documents to service_role;
    create view finance_portal_invoices with(security_invoker=true,security_barrier=true) as
      select id,folio,client_id from tax_documents where client_id=current_setting('zyteron.test_client',true);
    revoke all on finance_portal_invoices from public,anon,authenticated,service_role;
    grant all on finance_portal_invoices to service_role;`);
  return db;
}
const scalar = async (db, sql) => Object.values((await db.query(sql)).rows[0])[0];

test("ampliación conserva consulta, seguridad, ACL y alcance por cliente de la vista", async () => {
  const db = await fixture();
  try {
    const definition = await scalar(
      db,
      "select pg_get_viewdef('finance_portal_invoices'::regclass,true)",
    );
    const acl = await scalar(
      db,
      "select relacl::text from pg_class where oid='finance_portal_invoices'::regclass",
    );
    const original = (await db.query("select * from tax_documents order by id")).rows;
    await db.exec("begin");
    await db.exec(migration);
    await db.exec("commit");
    assert.equal(
      await scalar(
        db,
        "select data_type from information_schema.columns where table_name='finance_portal_invoices' and column_name='folio'",
      ),
      "bigint",
    );
    assert.equal(
      await scalar(db, "select pg_get_viewdef('finance_portal_invoices'::regclass,true)"),
      definition,
    );
    assert.equal(
      await scalar(
        db,
        "select relacl::text from pg_class where oid='finance_portal_invoices'::regclass",
      ),
      acl,
    );
    assert.deepEqual((await db.query("select * from tax_documents order by id")).rows, original);
    await db.exec("update tax_documents set folio=9999999999 where id=1");
    await db.exec("set role service_role;set zyteron.test_client='client-a'");
    assert.deepEqual((await db.query("select id,folio from finance_portal_invoices")).rows, [
      { id: 1, folio: 9999999999 },
    ]);
    await db.exec("set zyteron.test_client='client-b'");
    assert.deepEqual((await db.query("select id from finance_portal_invoices")).rows, [{ id: 2 }]);
    await db.exec("set zyteron.test_client='missing-client'");
    assert.deepEqual((await db.query("select * from finance_portal_invoices")).rows, []);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role;set role ${role}`);
      await assert.rejects(db.query("select * from finance_portal_invoices"), /permission denied/);
    }
  } finally {
    await db.close();
  }
});
for (const [name, alteration, expected] of [
  [
    "permisos inesperados",
    "grant select on finance_portal_invoices to anon",
    /ACL_REVIEW_REQUIRED/,
  ],
  [
    "opciones de seguridad distintas",
    "alter view finance_portal_invoices set(security_invoker=false)",
    /VIEW_REVIEW_REQUIRED/,
  ],
  [
    "metadatos no revisados",
    "comment on column finance_portal_invoices.folio is 'synthetic comment'",
    /VIEW_REVIEW_REQUIRED/,
  ],
  [
    "dependencias adicionales",
    "create view synthetic_dependent as select * from finance_portal_invoices",
    /depend/,
  ],
]) {
  test(`ampliación rechaza ${name} y revierte toda la transacción`, async () => {
    const db = await fixture();
    try {
      await db.exec(alteration);
      const before = await scalar(
        db,
        "select pg_get_viewdef('finance_portal_invoices'::regclass,true)",
      );
      await db.exec("begin;create table synthetic_release_marker(id int)");
      await assert.rejects(db.exec(migration), expected);
      await db.exec("rollback");
      assert.equal(await scalar(db, "select to_regclass('synthetic_release_marker')::text"), null);
      assert.equal(
        await scalar(
          db,
          "select data_type from information_schema.columns where table_name='tax_documents' and column_name='folio'",
        ),
        "integer",
      );
      assert.equal(
        await scalar(db, "select pg_get_viewdef('finance_portal_invoices'::regclass,true)"),
        before,
      );
      assert.equal(await scalar(db, "select count(*)::int from tax_documents"), 2);
    } finally {
      await db.close();
    }
  });
}

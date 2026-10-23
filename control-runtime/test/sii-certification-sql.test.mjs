import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL(
    "../../supabase/migrations/20261021084523_sii_certification_workspace.sql",
    import.meta.url,
  ),
  "utf8",
);
const run = "11111111-1111-4111-8111-111111111111",
  authorization = "22222222-2222-4222-8222-222222222222";
const folioA = "33333333-3333-4333-8333-333333333333",
  folioB = "44444444-4444-4444-8444-444444444444";
const hash = "a".repeat(64),
  sourceHash = "b".repeat(64);
const plan = {
  companyRut: "11111111-1",
  request: { synthetic: true },
  cases: [
    { caseId: "1234567-1", type: 33, folio: 1, folioId: folioA },
    { caseId: "1234567-2", type: 61, folio: 1, folioId: folioB },
  ],
};
const artifacts = [
  {
    name: "set-qa.xml",
    kind: "DTE",
    storagePath: `sii-certification/${run}/${hash}.xml`,
    sha256: hash,
    caseIds: ["1234567-1", "1234567-2"],
  },
];
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create table public.finance_settings(company_rut text,dte_environment text,dte_provider text);
    insert into public.finance_settings values('11111111-1','CERTIFICATION','SII_DIRECT');
    create table public.tax_document_types(code integer primary key);insert into public.tax_document_types values(33),(61);
    create table public.tax_folio_authorizations(id uuid primary key,status text,environment text);
    insert into public.tax_folio_authorizations values('${authorization}','ACTIVE','CERTIFICATION');
    create table public.tax_folios(id uuid primary key,authorization_id uuid references public.tax_folio_authorizations(id),document_type_code integer,environment text,folio bigint,status text,reserved_at timestamptz,used_at timestamptz);
    insert into public.tax_folios values('${folioA}','${authorization}',33,'CERTIFICATION',1,'AVAILABLE',null,null),('${folioB}','${authorization}',61,'CERTIFICATION',1,'AVAILABLE',null,null);
    create table public.synthetic_commercial_payments(id integer primary key,amount integer,status text);
    insert into public.synthetic_commercial_payments values(1,500,'CONFIRMED');
  `);
  await db.exec(migration);
  return db;
}
test("ampliación de identificadores conserva DTE y limita CASO-1 a boletas sin cambiar folios", async () => {
  const db = await fixture();
  try {
    await prepare(db);
    const before = (await db.query("select * from tax_folios order by id")).rows;
    const casesBefore = (await db.query("select * from sii_certification_cases order by case_id"))
      .rows;
    const sql = await readFile(
      new URL(
        "../../supabase/migrations/20261021101426_boleta_certification_case_ids.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(sql);
    assert.deepEqual((await db.query("select * from tax_folios order by id")).rows, before);
    assert.deepEqual(
      (await db.query("select * from sii_certification_cases order by case_id")).rows,
      casesBefore,
    );
    await db.query("update sii_certification_cases set case_id=$1 where document_type_code=33", [
      "1234567-10",
    ]);
    await assert.rejects(
      () =>
        db.query("update sii_certification_cases set case_id=$1 where document_type_code=33", [
          "CASO-1",
        ]),
      /case_id_check/,
    );
    await db.exec("insert into tax_document_types values(39)");
    await db.exec(
      "insert into tax_folios(id,authorization_id,document_type_code,environment,folio,status) values('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222',39,'CERTIFICATION',1,'AVAILABLE')",
    );
    await db.query(
      "insert into sii_certification_cases(run_id,case_id,document_type_code,folio_id,folio) values($1,'CASO-1',39,'55555555-5555-4555-8555-555555555555',1)",
      [run],
    );
    await assert.rejects(
      () =>
        db.query("update sii_certification_cases set case_id='CASO-0' where document_type_code=39"),
      /case_id_check/,
    );
    const after = (await db.query("select * from tax_folios where document_type_code=39")).rows[0];
    assert.equal(after.status, "AVAILABLE");
    assert.equal(after.reserved_at, null);
    assert.equal(before.length, 2);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        () => db.query("select * from sii_certification_cases"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
const prepare = (db, p = plan, a = artifacts, id = run) =>
  db.query(
    "select public.finance_prepare_sii_certification($1::uuid,$2,$3::jsonb,$4::jsonb,$5) as id",
    [id, sourceHash, JSON.stringify(p), JSON.stringify(a), "synthetic-admin"],
  );
test("reserva atómica del set y reintento idempotente sin tocar pagos", async () => {
  const db = await fixture();
  try {
    await prepare(db);
    await prepare(db);
    assert.equal(
      (await db.query("select count(*)::int as n from sii_certification_runs")).rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("select count(*)::int as n from sii_certification_cases")).rows[0].n,
      2,
    );
    assert(
      (await db.query("select status from tax_folios")).rows.every((r) => r.status === "RESERVED"),
    );
    assert.deepEqual(
      (await db.query("select amount,status from synthetic_commercial_payments")).rows,
      [{ amount: 500, status: "CONFIRMED" }],
    );
    await assert.rejects(
      () => prepare(db, { ...plan, request: { synthetic: "changed" } }),
      /ya tiene un plan/,
    );
    await assert.rejects(
      () => prepare(db, plan, artifacts, "55555555-5555-4555-8555-555555555555"),
      /ya tiene un plan/,
    );
  } finally {
    await db.close();
  }
});
test("fallo en el segundo folio revierte también el primero y todo el proceso", async () => {
  const db = await fixture();
  try {
    await db.exec(`update tax_folios set status='USED' where id='${folioB}'`);
    await assert.rejects(() => prepare(db), /folio cambió/);
    assert.equal(
      (await db.query("select count(*)::int as n from sii_certification_runs")).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select status from tax_folios where id=$1", [folioA])).rows[0].status,
      "AVAILABLE",
    );
  } finally {
    await db.close();
  }
});
test("receptor productivo, empresa incorrecta, folio ajeno y lote incompleto bloqueados", async () => {
  for (const mutate of [
    async (db) => db.exec("update finance_settings set dte_environment='PRODUCTION'"),
    async (db) => db.exec("update finance_settings set company_rut='22222222-2'"),
    async (db) => db.exec(`update tax_folios set environment='PRODUCTION' where id='${folioA}'`),
  ]) {
    const db = await fixture();
    try {
      await mutate(db);
      await assert.rejects(() => prepare(db));
      assert.equal(
        (await db.query("select count(*)::int as n from sii_certification_runs")).rows[0].n,
        0,
      );
    } finally {
      await db.close();
    }
  }
  const db = await fixture();
  try {
    await assert.rejects(
      () => prepare(db, plan, [{ ...artifacts[0], caseIds: ["1234567-1"] }]),
      /único envío/,
    );
    assert.equal(
      (await db.query("select status from tax_folios where id=$1", [folioA])).rows[0].status,
      "AVAILABLE",
    );
  } finally {
    await db.close();
  }
});
test("adquisición exclusiva y finalización: doble clic no produce un segundo envío", async () => {
  const db = await fixture();
  try {
    await prepare(db);
    const id = (await db.query("select id from sii_certification_submissions")).rows[0].id;
    assert.equal(
      (await db.query("select finance_claim_sii_certification_submission($1) as claimed", [id]))
        .rows[0].claimed,
      true,
    );
    assert.equal(
      (await db.query("select finance_claim_sii_certification_submission($1) as claimed", [id]))
        .rows[0].claimed,
      false,
    );
    await db.query("select finance_complete_sii_certification_submission($1,$2,$3::jsonb,false)", [
      id,
      "123456",
      JSON.stringify({ trackId: "123456" }),
    ]);
    assert(
      (await db.query("select status from tax_folios")).rows.every((r) => r.status === "USED"),
    );
    await assert.rejects(
      () =>
        db.query("select finance_complete_sii_certification_submission($1,$2,$3::jsonb,false)", [
          id,
          "654321",
          "{}",
        ]),
      /exclusiva/,
    );
    assert.equal(
      (await db.query("select track_id from sii_certification_submissions")).rows[0].track_id,
      "123456",
    );
  } finally {
    await db.close();
  }
});
test("timeout bloquea retransmisión y mantiene folios reservados", async () => {
  const db = await fixture();
  try {
    await prepare(db);
    const id = (await db.query("select id from sii_certification_submissions")).rows[0].id;
    await db.query("select finance_claim_sii_certification_submission($1)", [id]);
    await db.query("select finance_complete_sii_certification_submission($1,null,$2::jsonb,true)", [
      id,
      '{"message":"synthetic timeout"}',
    ]);
    assert.equal(
      (await db.query("select status from sii_certification_submissions")).rows[0].status,
      "UNKNOWN",
    );
    assert.equal(
      (await db.query("select finance_claim_sii_certification_submission($1) as claimed", [id]))
        .rows[0].claimed,
      false,
    );
    assert(
      (await db.query("select status from tax_folios")).rows.every((r) => r.status === "RESERVED"),
    );
  } finally {
    await db.close();
  }
});
test("RLS y permisos: usuarios web no leen ni reservan folios directamente", async () => {
  const db = await fixture();
  try {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        () => db.query("select * from sii_certification_runs"),
        /permission denied/,
      );
      await assert.rejects(() => prepare(db), /permission denied/);
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});

test("borradores privados por usuario: versiones concurrentes y recarga sin reservar folios", async () => {
  const db = await fixture();
  const save = (actor, version, payload) =>
    db.query("select finance_save_sii_certification_draft($1,$2,$3,$4,$5::jsonb) as version", [
      "11111111-1",
      actor,
      sourceHash,
      version,
      JSON.stringify(payload),
    ]);
  try {
    assert.equal((await save("qa-one", 0, { cases: [] })).rows[0].version, 1);
    await assert.rejects(() => save("qa-one", 0, { cases: [1] }), /borrador cambió/);
    assert.equal((await save("qa-one", 1, { cases: [2] })).rows[0].version, 2);
    assert.equal((await save("qa-two", 0, { cases: [3] })).rows[0].version, 1);
    assert.equal(
      (await db.query("select count(*)::int as n from sii_certification_drafts")).rows[0].n,
      2,
    );
    assert(
      (await db.query("select status from tax_folios")).rows.every((r) => r.status === "AVAILABLE"),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        () => db.query("select * from sii_certification_drafts"),
        /permission denied/,
      );
      await assert.rejects(() => save("qa-one", 2, {}), /permission denied/);
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
test("recibo recuperado conserva Track ID y no vuelve a aplicar ni reservar folios", async () => {
  const db = await fixture();
  try {
    await prepare(db);
    const id = (await db.query("select id from sii_certification_submissions")).rows[0].id;
    await db.query("select finance_claim_sii_certification_submission($1)", [id]);
    await db.query("select finance_complete_sii_certification_submission($1,null,'{}',true)", [id]);
    const complete = () =>
      db.query("select finance_complete_sii_certification_submission($1,'1234','{}',false)", [id]);
    await complete();
    await complete();
    assert.equal(
      (await db.query("select status,track_id from sii_certification_submissions")).rows[0]
        .track_id,
      "1234",
    );
    assert(
      (await db.query("select status from tax_folios")).rows.every((r) => r.status === "USED"),
    );
    const state = (status) =>
      db.query("select finance_record_sii_certification_status($1,$2,'{}') as changed", [
        id,
        status,
      ]);
    await state("ACCEPTED_WITH_REPAIRS");
    assert.equal((await state("SUBMITTED")).rows[0].changed, false);
    await state("ACCEPTED");
    assert.equal((await state("REJECTED")).rows[0].changed, false);
    assert.equal(
      (await db.query("select status from sii_certification_submissions")).rows[0].status,
      "ACCEPTED",
    );
  } finally {
    await db.close();
  }
});
test("lote con casos duplicados o almacenamiento fuera del proceso se revierte completo", async () => {
  for (const a of [
    [{ ...artifacts[0], caseIds: ["1234567-1", "1234567-1", "1234567-2"] }],
    [
      {
        ...artifacts[0],
        storagePath: `sii-certification/55555555-5555-4555-8555-555555555555/${hash}.xml`,
      },
    ],
    [{ ...artifacts[0], kind: "PDF" }],
  ]) {
    const db = await fixture();
    try {
      await assert.rejects(() => prepare(db, plan, a));
      assert(
        (await db.query("select status from tax_folios")).rows.every(
          (r) => r.status === "AVAILABLE",
        ),
      );
      assert.equal(
        (await db.query("select count(*)::int as n from sii_certification_runs")).rows[0].n,
        0,
      );
    } finally {
      await db.close();
    }
  }
});

test('revisión explícita conserva originales, reserva folios nuevos y exige último proceso', async () => {
  const db=await fixture();
  try {
    await prepare(db);
    await db.exec("update tax_folios set status='USED'");
    const before=(await db.query('select * from tax_folios order by id')).rows;
    const payments=(await db.query('select * from synthetic_commercial_payments')).rows;
    const sql=await readFile(new URL('../../supabase/migrations/20261023010000_sii_certification_revisions.sql',import.meta.url),'utf8');
    await db.exec(sql);
    assert.deepEqual((await db.query('select * from tax_folios order by id')).rows,before);
    const next='66666666-6666-4666-8666-666666666666';
    const newA='77777777-7777-4777-8777-777777777777',newB='88888888-8888-4888-8888-888888888888';
    await db.query("insert into tax_folios(id,authorization_id,document_type_code,environment,folio,status) values($1,$2,33,'CERTIFICATION',2,'AVAILABLE'),($3,$2,61,'CERTIFICATION',2,'AVAILABLE')",[newA,authorization,newB]);
    const revised={...plan,previousRunId:run,request:{synthetic:true,revisionReason:'Firma corregida; folios nuevos',bookNotificationBase:4},cases:plan.cases.map((c,i)=>({...c,folio:2,folioId:i?newB:newA}))};
    const revisedArtifacts=artifacts.map(a=>({...a,storagePath:a.storagePath.replace(run,next)}));
    await assert.rejects(()=>prepare(db,{...revised,previousRunId:undefined},revisedArtifacts,next),/último proceso/);
    await db.exec('rollback');
    await prepare(db,revised,revisedArtifacts,next);
    await prepare(db,revised,revisedArtifacts,next);
    const runs=(await db.query('select id,revision,previous_run_id from sii_certification_runs order by revision')).rows;
    assert.deepEqual(runs,[{id:run,revision:1,previous_run_id:null},{id:next,revision:2,previous_run_id:run}]);
    assert.deepEqual((await db.query("select * from tax_folios where id=any($1::uuid[]) order by id",[[folioA,folioB]])).rows,before);
    assert.ok((await db.query("select status from tax_folios where id=any($1::uuid[])",[[newA,newB]])).rows.every(r=>r.status==='RESERVED'));
    assert.equal((await db.query('select count(*)::int as n from sii_certification_cases')).rows[0].n,4);
    const other='99999999-9999-4999-8999-999999999999';
    await assert.rejects(()=>prepare(db,revised,revisedArtifacts.map(a=>({...a,storagePath:a.storagePath.replace(next,other)})),other),/último proceso/);
    await db.exec('rollback');
    assert.deepEqual((await db.query('select * from synthetic_commercial_payments')).rows,payments);
    for(const role of ['anon','authenticated']) {
      const allowed=(await db.query("select has_function_privilege($1,'public.finance_prepare_sii_certification(uuid,text,jsonb,jsonb,text)','execute') as allowed",[role])).rows[0].allowed;
      assert.equal(allowed,false);
    }
  } finally {await db.close();}
});

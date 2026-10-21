import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { DteService } from "../dist/finance/finance.dte.js";
import { decryptSecret, encryptSecret } from "../dist/finance/finance.util.js";
import { DteSubmissionJournal } from "../dist/finance/finance.dte-journal.js";

const migration = await readFile(
  new URL("../../supabase/migrations/20261021193657_dte_submission_journal.sql", import.meta.url),
  "utf8",
);
const document = "11111111-1111-4111-8111-111111111111",
  invoice = "22222222-2222-4222-8222-222222222222";
const signed = "a".repeat(64),
  envelope = "b".repeat(64),
  base = "dte/certification/33/1/";
export async function journalFixture() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create table finance_settings(company_rut text,dte_environment text,dte_provider text,dte_production_authorized boolean);
    insert into finance_settings values('11111111-1','CERTIFICATION','SII_DIRECT',false);
    create table invoices(id uuid primary key,status text,document_type_code integer,currency text,issue_date date,
      net_amount numeric,exempt_amount numeric,tax_amount numeric,total_amount numeric,tax_document_id uuid,client_snapshot jsonb);
    insert into invoices values('${invoice}','READY_TO_ISSUE',33,'CLP','2026-01-02',1000,0,190,1190,null,'{"rut":"22222222-2"}');
    create table tax_documents(id uuid primary key,invoice_id uuid,status text,provider text,environment text,document_type_code integer,
      folio bigint,emitter_rut text,receiver_rut text,issue_date date,net_amount numeric,exempt_amount numeric,tax_amount numeric,total_amount numeric,
      xml_unsigned_path text,xml_unsigned_sha256 text,xml_signed_path text,xml_signed_sha256 text,track_id text,submitted_at timestamptz,response_path text,status_message text);
    insert into tax_documents(id,invoice_id,status,provider,environment,document_type_code,emitter_rut,receiver_rut,issue_date,net_amount,exempt_amount,tax_amount,total_amount)
      values('${document}','${invoice}','DRAFT','SII_DIRECT','CERTIFICATION',33,'11111111-1','22222222-2','2026-01-02',1000,0,190,1190);
    create table tax_folio_authorizations(id integer primary key,status text);insert into tax_folio_authorizations values(1,'ACTIVE');
    create table tax_folios(id uuid primary key default gen_random_uuid(),authorization_id integer,document_type_code integer,environment text,folio bigint,
      status text,tax_document_id uuid,reserved_at timestamptz,used_at timestamptz,voided_at timestamptz,void_reason text,
      unique(environment,document_type_code,folio));
    insert into tax_folios(authorization_id,document_type_code,environment,folio,status) values(1,33,'CERTIFICATION',1,'AVAILABLE'),(1,33,'CERTIFICATION',2,'AVAILABLE');
    create table synthetic_payments(id integer primary key,amount integer,status text);insert into synthetic_payments values(1,1190,'CONFIRMED');
    grant select,update on invoices,tax_documents,tax_folios to service_role;grant select on finance_settings,tax_folio_authorizations to service_role;
  `);
  await db.exec(
    await readFile(new URL("./fixtures/dte-existing-guards.sql", import.meta.url), "utf8"),
  );
  await db.exec(migration);
  return db;
}
const value = async (db, sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
export const claim = (db) =>
  value(db, "select finance_claim_dte_issue($1,$2)", [document, "synthetic-finance-actor"]);
const reserve = (db) =>
  value(db, "select finance_reserve_folio(33,'CERTIFICATION',$1)", [document]);
const stage = (db, status, path, hash) =>
  value(db, "select finance_update_dte_preparation($1,$2,$3,$4)", [document, status, path, hash]);
export async function prepareSigned(db) {
  await claim(db);
  await reserve(db);
  await stage(db, "VALIDATED", base + "unsigned.xml", signed);
  await stage(db, "SIGNED", base + "signed.xml", signed);
}
export const start = (db) =>
  value(db, "select finance_start_dte_transmission($1,$2,$3,$4)", [
    document,
    signed,
    envelope,
    base + "envio.xml",
  ]);
const finish = (db, track = "1234567890") =>
  value(db, "select finance_complete_dte_submission($1,$2,$3,$4)", [
    document,
    signed,
    envelope,
    track,
  ]);
const fail = (db) =>
  value(db, "select finance_fail_dte_issue($1,$2)", [document, "synthetic failure"]);
const abandon = (db) =>
  value(db, "select finance_abandon_dte_issue($1,$2)", [document, "synthetic local cancellation"]);

test("registro DTE es privado y la migración no cambia documentos, pagos ni folios existentes", async () => {
  const db = await journalFixture();
  try {
    assert.equal(await value(db, "select finance_dte_journal_ready()"), true);
    assert.equal(
      await value(
        db,
        "select count(*)::int from pg_proc where proname in('finance_guard_active_dte_invoice','finance_claim_dte_issue','finance_reserve_folio','finance_update_dte_preparation','finance_start_dte_transmission','finance_fail_dte_issue','finance_complete_dte_submission','finance_abandon_dte_issue','finance_dte_journal_ready') and prosecdef",
      ),
      0,
    );
    await assert.rejects(
      new DteSubmissionJournal({}).received({}, signed, envelope, "0"),
      /Track ID/,
    );
    assert.equal(await value(db, "select count(*)::int from tax_document_transmissions"), 0);
    assert.deepEqual((await db.query("select amount,status from synthetic_payments")).rows, [
      { amount: 1190, status: "CONFIRMED" },
    ]);
    assert.deepEqual((await db.query("select status from tax_folios")).rows, [
      { status: "AVAILABLE" },
      { status: "AVAILABLE" },
    ]);
    assert.equal(
      await value(
        db,
        "select has_table_privilege('service_role','tax_document_transmissions','DELETE')",
      ),
      false,
    );
    assert.equal(
      await value(
        db,
        "select count(*)::int from pg_proc where proname like 'finance_%dte%' and (has_function_privilege('anon',oid,'EXECUTE') or has_function_privilege('authenticated',oid,'EXECUTE'))",
      ),
      0,
    );
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from tax_document_transmissions"), /permission denied/);
    await assert.rejects(claim(db), /permission denied/);
    await db.exec("reset role;set role authenticated");
    await assert.rejects(db.query("select * from tax_document_transmissions"), /permission denied/);
    await assert.rejects(claim(db), /permission denied/);
    await db.exec("reset role;set role service_role");
    assert.equal(await claim(db), true);
  } finally {
    await db.close();
  }
});
test("doble clic adquiere un solo intento y reserva un solo folio sin reutilizarlo", async () => {
  const db = await journalFixture();
  try {
    const claims = await Promise.all(Array.from({ length: 10 }, () => claim(db)));
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(await reserve(db), 1);
    assert.equal(await reserve(db), 1);
    assert.equal(
      await value(db, "select count(*)::int from tax_folios where status='RESERVED'"),
      1,
    );
    assert.equal(await value(db, "select status from invoices"), "ISSUING");
    await assert.rejects(
      db.query("select finance_reserve_folio(34,'CERTIFICATION',$1)", [document]),
      /MISMATCH/,
    );
  } finally {
    await db.close();
  }
});
test("emisor, moneda, receptor, importes, ambientes e IDs incompatibles no adquieren el intento", async () => {
  for (const sql of [
    "update tax_documents set emitter_rut='22222222-2'",
    "update invoices set currency='USD'",
    "update invoices set currency=null",
    "update tax_documents set status=null",
    "update invoices set client_snapshot=null",
    "update tax_documents set receiver_rut='33333333-3'",
    "update tax_documents set total_amount=1200",
    "update finance_settings set dte_environment='PRODUCTION'",
  ]) {
    const db = await journalFixture();
    try {
      await db.exec(sql);
      await assert.rejects(claim(db));
      assert.equal(await value(db, "select count(*)::int from tax_document_transmissions"), 0);
      assert.equal(
        await value(db, "select count(*)::int from tax_folios where status='RESERVED'"),
        0,
      );
    } finally {
      await db.close();
    }
  }
  const db = await journalFixture();
  try {
    await assert.rejects(
      db.query("select finance_claim_dte_issue($1,$2)", ["invalid-id", "synthetic"]),
    );
    await assert.rejects(
      db.query("select finance_claim_dte_issue($1,$2)", [
        "33333333-3333-4333-8333-333333333333",
        "synthetic",
      ]),
      /NOT_FOUND/,
    );
  } finally {
    await db.close();
  }
});
test("sólo un envío pasa a SENDING; una recepción incierta bloquea reenvío y abandono", async () => {
  const db = await journalFixture();
  try {
    await prepareSigned(db);
    const starts = await Promise.all(Array.from({ length: 10 }, () => start(db)));
    assert.equal(starts.filter(Boolean).length, 1);
    await fail(db);
    assert.equal(await value(db, "select state from tax_document_transmissions"), "UNKNOWN");
    await assert.rejects(db.exec("update invoices set status='CANCELLED'"), /DTE_INVOICE_LOCKED/);
    assert.equal(await claim(db), false);
    assert.equal(await start(db), false);
    await assert.rejects(abandon(db), /REQUIRES_SII_REVIEW/);
    assert.equal(await value(db, "select status from invoices"), "ISSUING");
    assert.equal(await value(db, "select status from tax_folios where folio=1"), "RESERVED");
  } finally {
    await db.close();
  }
});
test("el recibo cierra documento y folio juntos, admite reintentos y conserva estados finales", async () => {
  const db = await journalFixture();
  try {
    await prepareSigned(db);
    await start(db);
    await fail(db);
    assert.equal(await finish(db), true);
    assert.equal(await finish(db), true);
    assert.equal(await value(db, "select status from tax_documents"), "SUBMITTED");
    assert.equal(await value(db, "select status from tax_folios where folio=1"), "USED");
    assert.equal(await value(db, "select state from tax_document_transmissions"), "SUBMITTED");
    await assert.rejects(finish(db, "9999999999"), /MISMATCH/);
    await db.exec("update tax_documents set status='ACCEPTED'");
    await finish(db);
    assert.equal(await value(db, "select status from tax_documents"), "ACCEPTED");
  } finally {
    await db.close();
  }
});
test("un cierre interrumpido revierte también el uso del folio", async () => {
  const db = await journalFixture();
  try {
    await prepareSigned(db);
    await start(db);
    await db.exec(
      "create function synthetic_failure() returns trigger language plpgsql as $$begin if new.status='SUBMITTED' then raise exception 'SYNTHETIC_WRITE_FAILURE';end if;return new;end$$;create trigger synthetic_failure before update on tax_documents for each row execute function synthetic_failure();",
    );
    await assert.rejects(finish(db), /SYNTHETIC_WRITE_FAILURE/);
    assert.equal(await value(db, "select status from tax_folios where folio=1"), "RESERVED");
    assert.equal(await value(db, "select status from tax_documents"), "SIGNED");
    await db.exec("drop trigger synthetic_failure on tax_documents");
    assert.equal(await finish(db), true);
  } finally {
    await db.close();
  }
});
test("un fallo local puede abandonarse sin permitir que una respuesta tardía reactive el intento", async () => {
  const db = await journalFixture();
  try {
    await prepareSigned(db);
    await fail(db);
    assert.equal(await value(db, "select status from invoices"), "READY_TO_ISSUE");
    assert.equal(await claim(db), false);
    assert.equal(await abandon(db), true);
    assert.equal(await stage(db, "SIGNED", base + "signed.xml", signed), false);
    assert.equal(await start(db), false);
    assert.equal(await value(db, "select status from tax_folios where folio=1"), "VOIDED");
    assert.equal(await value(db, "select status from tax_documents"), "CANCELLED");
    await assert.rejects(reserve(db), /MISMATCH/);
  } finally {
    await db.close();
  }
});
test("hashes nulos, rutas ajenas y folios inconsistentes no inician transmisión ni marcan pagos", async () => {
  const db = await journalFixture();
  try {
    await prepareSigned(db);
    for (const args of [
      [document, signed, null, base + "envio.xml"],
      [document, signed, envelope, "../other.xml"],
      [document, "c".repeat(64), envelope, base + "envio.xml"],
    ])
      await assert.rejects(
        db.query("select finance_start_dte_transmission($1,$2,$3,$4)", args),
        /MISMATCH/,
      );
    await assert.rejects(db.exec("update tax_folios set environment='PRODUCTION' where folio=1"), /identidad de folio inmutable/);
    await db.exec("update tax_folios set tax_document_id=null where folio=1");
    await assert.rejects(start(db), /FOLIO_MISMATCH/);
    assert.deepEqual((await db.query("select amount,status from synthetic_payments")).rows, [
      { amount: 1190, status: "CONFIRMED" },
    ]);
  } finally {
    await db.close();
  }
});

async function emissionFixture(options = {}) {
  const db = await journalFixture(),
    files = new Map(),
    events = [];
  const counts = { posts: 0, reads: 0 };
  const camel = (row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        ["folio", "net_amount", "exempt_amount", "tax_amount", "total_amount"].includes(key) &&
        value !== null
          ? Number(value)
          : value,
      ]),
    );
  const methods = {
    finance_claim_dte_issue: ["p_document", "p_actor"],
    finance_update_dte_preparation: ["p_document", "p_status", "p_path", "p_sha"],
    finance_start_dte_transmission: [
      "p_document",
      "p_signed_sha",
      "p_envelope_sha",
      "p_envelope_path",
    ],
    finance_fail_dte_issue: ["p_document", "p_message"],
    finance_complete_dte_submission: ["p_document", "p_signed_sha", "p_envelope_sha", "p_track"],
    finance_abandon_dte_issue: ["p_document", "p_reason"],
  };
  const repo = {
    configured: () => true,
    settings: async () => ({
      dteProvider: "SII_DIRECT",
      dteEnvironment: "CERTIFICATION",
      companyRut: "11111111-1",
      companyLegalName: "Emisor QA",
      companyBusinessActivity: "Software QA",
      companyActivityCode: 620200,
      companyAddress: "Dirección QA",
      companyCommune: "Comuna QA",
      companyCity: null,
      dteResolutionNumber: 0,
      dteResolutionDate: "2026-01-01",
    }),
    get: async (table, id) => {
      assert.ok(["tax_documents", "invoices"].includes(table));
      const row = (await db.query(`select * from ${table} where id=$1`, [id])).rows[0];
      if (!row) return;
      const result = camel(row);
      if (table === "invoices")
        return {
          ...result,
          clientId: "33333333-3333-4333-8333-333333333333",
          clientSnapshot: {
            rut: "22222222-2",
            legalName: "Receptor QA",
            businessActivity: "Pruebas",
            address: "Dirección QA",
            commune: "Comuna QA",
          },
        };
      return result;
    },
    findOne: async (table, filters) => {
      assert.equal(table, "tax_document_transmissions");
      const row = (
        await db.query("select * from tax_document_transmissions where tax_document_id=$1", [
          filters.taxDocumentId,
        ])
      ).rows[0];
      return row ? camel(row) : undefined;
    },
    list: async (table, filters = {}) => {
      if (table === "invoice_lines")
        return [
          {
            lineNumber: 1,
            description: "Servicio sintético",
            quantity: 1,
            unitPrice: 1000,
            discountAmount: 0,
            netAmount: 1000,
            isExempt: false,
          },
        ];
      if (table === "tax_document_events") return events;
      assert.equal(table, "tax_documents");
      return (await db.query("select * from tax_documents")).rows
        .map(camel)
        .filter((row) =>
          Object.entries(filters).every(([key, value]) =>
            typeof value === "object"
              ? !(value.notIn || []).includes(row[key])
              : row[key] === value,
          ),
        );
    },
    create: async (table, row) => {
      assert.equal(table, "tax_document_events");
      const event = { id: String(events.length + 1), ...row };
      events.push(event);
      return event;
    },
    reserveFolio: async (type, environment, id) =>
      value(db, "select finance_reserve_folio($1,$2,$3)", [type, environment, id]),
    dteEmissionRpc: async (name, args) => {
      assert.ok(methods[name]);
      const keys = methods[name];
      return value(
        db,
        `select ${name}(${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
        keys.map((k) => args[k]),
      );
    },
    saveFile: async (bucket, path, bytes) => {
      const key = bucket + "/" + path;
      if (files.has(key) && !files.get(key).equals(bytes)) throw Error("IMMUTABLE_OBJECT");
      files.set(key, Buffer.from(bytes));
      return path;
    },
    readFile: async (bucket, path) => {
      counts.reads++;
      return files.get(bucket + "/" + path) || null;
    },
    audit: async () => {},
  };
  const ctx = {
    repo,
    require() {},
    requireAny(actor) {
      if (actor.role === "NO_ACCESS") throw Error("DENIED");
    },
    must: async (table, id) => {
      const r = await repo.get(table, id);
      if (!r) throw Error("NOT_FOUND");
      return r;
    },
  };
  let entered = 0,
    release;
  const gate = options.parallel
    ? new Promise((resolve) => {
        release = resolve;
      })
    : null;
  const invoices = {
    prepareForIssue: async (id) => {
      const row = await repo.get("invoices", id);
      if (row.status !== "READY_TO_ISSUE") throw Error("NOT_READY");
      entered++;
      if (gate) {
        if (entered === options.parallel) release();
        await gate;
      }
      return row;
    },
  };
  const sii = {
    name: "SII_DIRECT",
    createDraft: async () => "<Documento>synthetic</Documento>",
    validate: async () => [],
    sign: async () => "<DTE>synthetic-signed</DTE>",
    standalone: (xml) => xml,
    send: async (signed, input, beforeTransmit) => {
      const xml = "<EnvioDTE>synthetic-envelope</EnvioDTE>";
      await beforeTransmit(xml);
      counts.posts++;
      if (options.timeout) throw Error("SYNTHETIC_TIMEOUT");
      if (options.commitFailure)
        await db.exec(
          "create function synthetic_commit_failure() returns trigger language plpgsql as $$begin if new.status='SUBMITTED' then raise exception 'SYNTHETIC_COMMIT_FAILURE';end if;return new;end$$;create trigger synthetic_commit_failure before update on tax_documents for each row execute function synthetic_commit_failure();",
        );
      return { trackId: "1234567890", envelopeXml: xml };
    },
  };
  const service = new DteService(ctx, invoices, sii, {}, {});
  service.readiness = async () => ({ canIssue: true, missing: [] });
  service.cafFor = async () => ({});
  return { db, repo, service, files, counts };
}
const actor = { userId: "synthetic-finance-actor", role: "GERENTE_GENERAL" };
test("emisión completa ante diez solicitudes concurrentes transmite una vez y registra el mismo recibo", async () => {
  const old = process.env.FINANCE_ENCRYPTION_KEY;
  process.env.FINANCE_ENCRYPTION_KEY = "d".repeat(64);
  const x = await emissionFixture({ parallel: 10 });
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => x.service.issue(invoice, actor)),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(x.counts.posts, 1);
    assert.equal(
      results.find((r) => r.status === "fulfilled").value.transmission.state,
      "SUBMITTED",
    );
    assert.equal(await value(x.db, "select status from tax_documents"), "SUBMITTED");
    assert.equal(await value(x.db, "select status from tax_folios where folio=1"), "USED");
    assert.ok(x.files.has(`finance-secrets/dte-transmission-receipts/${document}.enc`));
    await assert.rejects(x.service.issue(invoice, actor));
    assert.equal(x.counts.posts, 1);
  } finally {
    if (old === undefined) delete process.env.FINANCE_ENCRYPTION_KEY;
    else process.env.FINANCE_ENCRYPTION_KEY = old;
    await x.db.close();
  }
});
test("timeout conserva el intento incierto y ningún reintento o abandono vuelve a transmitir", async () => {
  const x = await emissionFixture({ timeout: true });
  try {
    await assert.rejects(x.service.issue(invoice, actor), /SYNTHETIC_TIMEOUT/);
    assert.equal(await value(x.db, "select state from tax_document_transmissions"), "UNKNOWN");
    await assert.rejects(x.service.issue(invoice, actor));
    await assert.rejects(
      x.service.abandon(document, { reason: "synthetic" }, actor),
      /REQUIRES_SII_REVIEW/,
    );
    await assert.rejects(x.service.recoverReceipt(document, actor), /No hay un recibo/);
    assert.equal(x.counts.posts, 1);
    assert.equal(await value(x.db, "select status from invoices"), "ISSUING");
  } finally {
    await x.db.close();
  }
});
test("recuperación después de un fallo de base usa el recibo cifrado sin reenviar ni degradar aceptación", async () => {
  const old = process.env.FINANCE_ENCRYPTION_KEY;
  process.env.FINANCE_ENCRYPTION_KEY = "d".repeat(64);
  const x = await emissionFixture({ commitFailure: true });
  try {
    await assert.rejects(x.service.issue(invoice, actor), /Recuperar recibo/);
    assert.equal(x.counts.posts, 1);
    assert.equal(await value(x.db, "select status from tax_folios where folio=1"), "RESERVED");
    const key = `finance-secrets/dte-transmission-receipts/${document}.enc`,
      original = x.files.get(key);
    const receipt = JSON.parse(decryptSecret(original.toString("utf8")));
    x.files.set(
      key,
      Buffer.from(
        encryptSecret(
          JSON.stringify({ ...receipt, invoiceId: "33333333-3333-4333-8333-333333333333" }),
        ),
      ),
    );
    await assert.rejects(x.service.recoverReceipt(document, actor), /no corresponde/);
    x.files.set(key, original);
    const reads = x.counts.reads;
    await assert.rejects(
      x.service.recoverReceipt(document, { ...actor, role: "NO_ACCESS" }),
      /DENIED/,
    );
    assert.equal(x.counts.reads, reads);
    for (const id of ["invalid-id", "../other", "11111111-1111-4111-8111-111111111111/../../other"])
      await assert.rejects(x.service.recoverReceipt(id, actor), (e) => e.getStatus?.() === 400);
    assert.equal(x.counts.reads, reads);
    await x.db.exec("drop trigger synthetic_commit_failure on tax_documents");
    await x.service.recoverReceipt(document, actor);
    await x.service.recoverReceipt(document, actor);
    assert.equal(await value(x.db, "select status from tax_documents"), "SUBMITTED");
    assert.equal(await value(x.db, "select status from tax_folios where folio=1"), "USED");
    await x.db.exec("update tax_documents set status='ACCEPTED'");
    await x.service.recoverReceipt(document, actor);
    assert.equal(await value(x.db, "select status from tax_documents"), "ACCEPTED");
    assert.equal(x.counts.posts, 1);
  } finally {
    if (old === undefined) delete process.env.FINANCE_ENCRYPTION_KEY;
    else process.env.FINANCE_ENCRYPTION_KEY = old;
    await x.db.close();
  }
});

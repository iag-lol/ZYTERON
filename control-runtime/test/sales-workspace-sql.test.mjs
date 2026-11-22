import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const base = await readFile(new URL("./fixtures/sales-workspace.sql", import.meta.url), "utf8");
const quoteMigration = await readFile(
  new URL("../../supabase/migrations/20261013084933_quote_billing_frequency.sql", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL(
    "../../supabase/migrations/20261122100000_sales_executive_workspace.sql",
    import.meta.url,
  ),
  "utf8",
);
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  manager = "33333333-3333-4333-8333-333333333333";
async function fixture() {
  const db = new PGlite();
  await db.exec(base);
  await db.exec(quoteMigration);
  await db.exec(migration);
  return db;
}
const scalar = async (db, sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const write = (db, actor, action, target, payload, role = "EJECUTIVA_VENTAS") =>
  scalar(db, "select sales_workspace_write($1,$2,$3,$4,$5)", [
    actor,
    role,
    action,
    target,
    JSON.stringify(payload),
  ]);
const admin = (db, action, target, payload) =>
  write(db, manager, action, target, payload, "GERENTE_GENERAL");
const payload = () => ({
  requestId: crypto.randomUUID(),
  company_name: "Empresa sintética",
  contact_name: "Contacto sintético",
  rut: "12345678-5",
  email: "synthetic@example.invalid",
  phone: "",
  interest: "Necesita una web para su negocio",
  notes: "Registro de prueba",
  next_action_at: "2026-12-01T12:00:00Z",
});
const proposal = () => ({
  requestId: crypto.randomUUID(),
  quote: {
    currency: "CLP",
    subtotal: 100000,
    discount_total: 0,
    net_amount: 100000,
    tax_rate: 19,
    tax_amount: 19000,
    total_amount: 119000,
    billing_type: "ONE_TIME",
    valid_until: "2026-12-31",
    payment_terms: "A convenir",
    commercial_terms: "Alcance sintético",
    status: "APPROVED",
    owner_id: b,
    client_id: null,
    lead_id: null,
  },
  items: [
    {
      id: crypto.randomUUID(),
      description: "Servicio sintético",
      quantity: 1,
      unit_price: 100000,
      discount_percent: 0,
      taxable: true,
      subtotal: 100000,
    },
  ],
});
async function accepted(db) {
  const r = await write(db, a, "record_create", null, payload());
  await admin(db, "record_review", r, {
    decision: "APPROVED",
    create_client: true,
    reason: "Datos verificados",
  });
  const q = await write(db, a, "proposal_create", r, proposal());
  await admin(db, "proposal_review", q, { decision: "APPROVED", reason: "Alcance validado" });
  await write(db, a, "proposal_share", q, { reason: "Entrega declarada" });
  await admin(db, "acceptance_validate", q, { reason: "Aceptación respaldada" });
  return { r, q };
}
async function paid(db, q) {
  return scalar(
    db,
    `insert into quote_payment_installments(quote_id,status,paid_amount,amount,invoice_storage_path,marked_paid_by,currency,paid_at,sequence,sii_folio,sii_document_type)values($1,'PAID',119000,119000,'synthetic.pdf',$2,'CLP',now(),1,11,33)returning id`,
    [q, manager],
  );
}
test("cartera propia: no se modifica ni cotiza el contacto de otro ejecutivo; no se puede aprobar", async () => {
  const db = await fixture();
  try {
    const r = await write(db, a, "record_create", null, payload());
    await assert.rejects(
      () =>
        write(db, b, "event_add", r, {
          requestId: crypto.randomUUID(),
          kind: "CALL",
          body: "Intento ajeno",
          stage: "INTERESTED",
        }),
      /SALES_NOT_FOUND/,
    );
    await assert.rejects(() => write(db, b, "proposal_create", r, proposal()), /SALES_NOT_FOUND/);
    await assert.rejects(
      () => write(db, a, "record_review", r, { decision: "APPROVED" }),
      /SALES_FORBIDDEN/,
    );
    await assert.rejects(() => write(db, a, "profit_validate", r, {}), /SALES_FORBIDDEN/);
    assert.equal(await scalar(db, "select count(*)::int from sales_work_events"), 1);
  } finally {
    await db.close();
  }
});
test("reintentos no duplican cliente potencial, propuesta ni gestiones; propietario y aprobación no se toman del cliente", async () => {
  const db = await fixture();
  try {
    const input = payload(),
      r = await write(db, a, "record_create", null, {
        ...input,
        owner_id: b,
        stage: "COMPLETED",
        review_status: "APPROVED",
      });
    assert.equal(await write(db, a, "record_create", null, input), r);
    const qp = proposal(),
      q = await write(db, a, "proposal_create", r, qp);
    assert.equal(await write(db, a, "proposal_create", r, qp), q);
    const quote = (await db.query("select * from quotes where id=$1", [q])).rows[0];
    assert.equal(quote.owner_id, a);
    assert.equal(quote.status, "PENDING_APPROVAL");
    assert.equal(await scalar(db, "select count(*)::int from leads"), 1);
    assert.equal(await scalar(db, "select count(*)::int from quotes"), 1);
    await assert.rejects(
      () => write(db, a, "proposal_share", q, { reason: "No autorizada" }),
      /SALES_APPROVED_PROPOSAL_REQUIRED/,
    );
    const ev = {
      requestId: crypto.randomUUID(),
      kind: "CALL",
      body: "Respuesta registrada",
      stage: "RESPONDED",
    };
    assert.equal(await write(db, a, "event_add", r, ev), await write(db, a, "event_add", r, ev));
  } finally {
    await db.close();
  }
});
test("alta requiere validación; no permite apropiarse de un cliente existente de otro ejecutivo", async () => {
  const db = await fixture();
  try {
    await db.query(
      "insert into clients(legal_name,rut,account_executive_id)values('Cliente ajeno','12.345.678-5',$1)",
      [b],
    );
    const r = await write(db, a, "record_create", null, payload());
    await assert.rejects(
      () => admin(db, "record_review", r, { decision: "APPROVED", create_client: true }),
      /SALES_CLIENT_ALREADY_EXISTS/,
    );
    const q = await write(db, a, "proposal_create", r, proposal());
    await assert.rejects(
      () => admin(db, "proposal_review", q, { decision: "APPROVED" }),
      /SALES_CONTACT_REVIEW_REQUIRED/,
    );
    assert.equal(await scalar(db, "select review_status from sales_work_records"), "PENDING");
    assert.equal(await scalar(db, "select account_executive_id from clients"), b);
  } finally {
    await db.close();
  }
});
test("15% de utilidad sin IVA sólo después del pago completo y costos validados; no registra un pago al ejecutivo", async () => {
  const db = await fixture();
  try {
    const { r, q } = await accepted(db);
    await assert.rejects(
      () =>
        admin(db, "profit_validate", r, {
          source_kind: "INSTALLMENT",
          source_id: crypto.randomUUID(),
          validated_cost: 40000,
          cost_note: "Costo revisado",
        }),
      /SALES_VERIFIED_PAYMENT_REQUIRED/,
    );
    const payment = await paid(db, q);
    const p = {
      source_kind: "INSTALLMENT",
      source_id: payment,
      validated_cost: 40000,
      cost_note: "Costos directos validados",
    };
    const result = await admin(db, "profit_validate", r, p);
    assert.equal(await admin(db, "profit_validate", r, p), result);
    const s = (await db.query("select * from sales_work_profit_settlements")).rows[0];
    assert.equal(Number(s.net_revenue), 100000);
    assert.equal(Number(s.profit), 60000);
    assert.equal(Number(s.commission_amount), 9000);
    await assert.rejects(
      () => admin(db, "profit_validate", r, { ...p, validated_cost: 0 }),
      /SALES_SETTLEMENT_LOCKED/,
    );
    await admin(db, "complete", r, { reason: "Venta y cobro validados" });
    assert.equal(await scalar(db, "select stage from sales_work_records"), "COMPLETED");
    assert.equal(await scalar(db, "select count(*)::int from sales_work_profit_settlements"), 1);
  } finally {
    await db.close();
  }
});
test("abonos incompletos, falta de respaldo, cobros de otro cliente y reversas no son comisión ganada", async () => {
  const db = await fixture();
  try {
    const { r, q } = await accepted(db),
      payment = await paid(db, q);
    for (const change of ["paid_amount=10000", "invoice_storage_path=null", "status='SCHEDULED'"]) {
      await db.query(
        "update quote_payment_installments set paid_amount=119000,invoice_storage_path='synthetic.pdf',status='PAID'",
      );
      await db.exec("update quote_payment_installments set " + change);
      assert.equal(await scalar(db, "select count(*)::int from sales_work_verified_receipts"), 0);
      await assert.rejects(
        () =>
          admin(db, "profit_validate", r, {
            source_kind: "INSTALLMENT",
            source_id: payment,
            validated_cost: 40000,
            cost_note: "Costo",
          }),
        /SALES_VERIFIED_PAYMENT_REQUIRED/,
      );
    }
  } finally {
    await db.close();
  }
});
test("los informes y las revisiones mantienen el alcance y quedan pendientes de administración", async () => {
  const db = await fixture();
  try {
    const r = await write(db, a, "record_create", null, payload());
    await assert.rejects(
      () =>
        write(db, b, "report_create", null, {
          requestId: crypto.randomUUID(),
          record_id: r,
          title: "Ajeno",
          body: "Ajeno",
          period_from: "2026-11-01",
          period_to: "2026-11-30",
        }),
      /SALES_NOT_FOUND/,
    );
    const report = await write(db, a, "report_create", null, {
      requestId: crypto.randomUUID(),
      record_id: r,
      title: "Informe propio",
      body: "Resultado y próximos pasos",
      period_from: "2026-11-01",
      period_to: "2026-11-30",
    });
    await assert.rejects(
      () => write(db, a, "report_review", report, { decision: "APPROVED" }),
      /SALES_FORBIDDEN/,
    );
    await admin(db, "report_review", report, { decision: "APPROVED", reason: "Revisado" });
    assert.equal(await scalar(db, "select review_status from sales_work_reports"), "APPROVED");
  } finally {
    await db.close();
  }
});
test("PostgREST no habilita tablas, costos ni RPC; la política restrictiva protege tablas con políticas antiguas amplias", async () => {
  const db = await fixture();
  try {
    await db.query(
      "insert into clients(legal_name,rut,account_executive_id)values('Empresa interna','11111111-1',$1)",
      [b],
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      await assert.rejects(
        () => write(db, a, "record_create", null, payload()),
        /permission denied/,
      );
      await assert.rejects(
        () => db.query("select * from sales_work_profit_settlements"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    await db.exec(
      `set role authenticated;set request.jwt.claims='{"app_metadata":{"role":"EJECUTIVA_VENTAS"}}'`,
    );
    assert.equal(await scalar(db, "select count(*)::int from clients"), 0);
    await db.exec(`set request.jwt.claims='{"app_metadata":{"role":"GERENTE_GENERAL"}}'`);
    assert.equal(await scalar(db, "select count(*)::int from clients"), 1);
  } finally {
    await db.close();
  }
});
test("una factura y una cuota del mismo folio conservan una sola comisión aunque se registren en fechas distintas", async () => {
  const db = await fixture();
  try {
    const { r, q } = await accepted(db);
    const sale = await scalar(db, "insert into sales(quote_id,owner_id)values($1,$2)returning id", [
      q,
      a,
    ]);
    const document = await scalar(db, "insert into tax_documents(folio)values(11)returning id");
    const invoice = await scalar(
      db,
      "insert into invoices(sale_id,status,document_type_code,currency,net_amount,total_amount,invoice_number,tax_document_id)values($1,'PAID',33,'CLP',100000,119000,'FACTURA-SINTETICA',$2)returning id",
      [sale, document],
    );
    const payment = await scalar(
      db,
      "insert into payments(status,currency)values('CONFIRMED','CLP')returning id",
    );
    await db.query(
      "insert into payment_allocations(invoice_id,payment_id,amount)values($1,$2,119000)",
      [invoice, payment],
    );
    const first = await admin(db, "profit_validate", r, {
      source_kind: "INVOICE",
      source_id: invoice,
      validated_cost: 40000,
      cost_note: "Costo confirmado",
    });
    const installment = await paid(db, q);
    assert.equal(await scalar(db, "select count(*)::int from sales_work_verified_receipts"), 1);
    assert.equal(
      await scalar(db, "select source_kind from sales_work_verified_receipts"),
      "INSTALLMENT",
    );
    const second = await admin(db, "profit_validate", r, {
      source_kind: "INSTALLMENT",
      source_id: installment,
      validated_cost: 40000,
      cost_note: "Mismo costo",
    });
    assert.equal(second, first);
    assert.equal(await scalar(db, "select count(*)::int from sales_work_profit_settlements"), 1);
    await db.query("update invoices set amount_credited=100000 where id=$1", [invoice]);
    assert.equal(await scalar(db, "select count(*)::int from sales_work_verified_receipts"), 0);
  } finally {
    await db.close();
  }
});
test("una nueva oportunidad de un cliente asignado no vuelve a contar al cliente como generado", async () => {
  const db = await fixture();
  try {
    const { r } = await accepted(db),
      client = await scalar(db, "select client_id from sales_work_records where id=$1", [r]);
    const next = await write(db, a, "record_create", null, {
      ...payload(),
      client_id: client,
      company_name: "Nombre manipulado",
      rut: "22222222-2",
    });
    const row = (await db.query("select * from sales_work_records where id=$1", [next])).rows[0];
    assert.equal(row.client_id, client);
    assert.equal(row.rut, "12345678-5");
    assert.equal(row.client_created, false);
    assert.equal(await scalar(db, "select count(*)::int from clients"), 1);
    assert.equal(
      await scalar(db, "select count(*)::int from sales_work_records where client_created"),
      1,
    );
    assert.equal(await scalar(db, "select count(*)::int from client_contacts"), 1);
  } finally {
    await db.close();
  }
});

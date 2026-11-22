import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { Reflector } from "@nestjs/core";
import { SalesWorkspaceService } from "../dist/sales-workspace/sales-workspace.service.js";
import { SalesWorkspaceController } from "../dist/sales-workspace/sales-workspace.controller.js";
import { RoleGuard } from "../dist/auth/role.guard.js";
import { CommercialController } from "../dist/commercial/commercial.controller.js";
import {
  recordInput,
  amount,
  date,
  csvCell,
} from "../dist/sales-workspace/sales-workspace.validation.js";
const a = { userId: "11111111-1111-4111-8111-111111111111", role: "EJECUTIVA_VENTAS" },
  other = "22222222-2222-4222-8222-222222222222";
const manager = { userId: "33333333-3333-4333-8333-333333333333", role: "GERENTE_GENERAL" };
const record = {
  id: "44444444-4444-4444-8444-444444444444",
  owner_id: a.userId,
  company_name: "Empresa propia",
  contact_name: "Contacto propio",
  rut: "12345678-5",
  email: "synthetic@example.invalid",
  interest: "Necesidad registrada",
  stage: "INTERESTED",
  review_status: "APPROVED",
  client_id: "client",
  client_created: true,
  created_at: "2026-11-22T10:00:00Z",
};
const quote = {
  quote_id: "55555555-5555-4555-8555-555555555555",
  record_id: record.id,
  owner_id: a.userId,
  status: "ACCEPTED",
  created_at: record.created_at,
};
function fixture(stamp) {
  const own = stamp ? { ...record, created_at: stamp } : record;
  const calls = [],
    writes = [];
  const repo = {
    async rows(table, columns, filter, order) {
      calls.push({ table, columns, filter, order });
      if (table === "sales_work_records") return [own];
      if (table === "sales_work_proposal_view") return [quote];
      if (table === "sales_work_profit_settlements")
        return [
          {
            id: "earned",
            owner_id: a.userId,
            quote_id: quote.quote_id,
            commission_amount: 9000,
            net_revenue: 100000,
            validated_cost: 40000,
            profit: 60000,
            cost_note: "COSTO EMPRESARIAL PRIVADO",
            source_kind: "INSTALLMENT",
            source_id: "payment",
            receipt_key: "quote:33:11",
            approved_at: record.created_at,
          },
        ];
      if (table === "sales_work_verified_receipts")
        return [
          {
            quote_id: quote.quote_id,
            source_kind: "INSTALLMENT",
            source_id: "payment",
            receipt_key: "quote:33:11",
            net_revenue: 100000,
          },
        ];
      return [];
    },
    async owners() {
      return [{ id: a.userId, name: "Ejecutivo A" }];
    },
    async record(id, actor) {
      if (actor.userId !== a.userId && actor.role !== "GERENTE_GENERAL") throw Error("NOT_FOUND");
      return record;
    },
    async quote() {
      return quote;
    },
    async write(...args) {
      writes.push(args);
      return quote.quote_id;
    },
  };
  return { service: new SalesWorkspaceService(repo, {}, {}), calls, writes, repo };
}
test("el tablero fuerza la cartera del JWT, ignora propietario ajeno y oculta costos, utilidad y recibos", async () => {
  const f = fixture();
  const board = await f.service.board(a, { owner: other });
  for (const table of [
    "sales_work_records",
    "sales_work_proposal_view",
    "sales_work_reports",
    "sales_work_profit_settlements",
  ])
    assert.deepEqual(f.calls.find((c) => c.table === table).filter, { owner_id: a.userId });
  assert.deepEqual(f.calls.find((c) => c.table === "clients").filter, {
    account_executive_id: a.userId,
  });
  assert.equal(board.owners.length, 0);
  assert.equal(board.receipts, undefined);
  assert.equal(board.summary.contacts, 1);
  assert.equal(board.summary.earnedCommission, 9000);
  const serialized = JSON.stringify(board);
  for (const field of [
    "validated_cost",
    "net_revenue",
    "profit",
    "cost_note",
    "COSTO EMPRESARIAL PRIVADO",
    "payment",
  ])
    assert.equal(serialized.includes(field), false);
});
test("administración conserva datos de validación y el reporte exportado evita fórmulas", async () => {
  const f = fixture(),
    board = await f.service.board(manager, {});
  assert.equal(board.earnings[0].validated_cost, 40000);
  assert.equal(board.receipts.length, 1);
  assert.equal(board.owners.length, 1);
  const report = await f.service.export(a, {});
  assert.match(report, /Empresa propia/);
  assert.equal(report.includes("40000"), false);
  assert.equal(csvCell(' =HYPERLINK("bad")').startsWith("\"'"), true);
});
test("un ejecutivo no autoriza alta, propuestas, informes, aceptación, utilidad ni cierre", async () => {
  const f = fixture();
  for (const work of [
    () => f.service.reviewRecord(a, record.id, {}),
    () => f.service.reviewProposal(a, quote.quote_id, {}),
    () => f.service.reviewOther(a, "report", record.id, {}),
    () => f.service.accept(a, quote.quote_id, {}),
    () => f.service.validateProfit(a, record.id, {}),
    () => f.service.complete(a, record.id, {}),
  ])
    await assert.rejects(work, /administración/);
  assert.equal(f.writes.length, 0);
});
test("precios y totales se recalculan; no se aceptan propietario, impuestos ni estado aportados por el navegador", async () => {
  const f = fixture();
  await f.service.propose(a, record.id, {
    requestId: crypto.randomUUID(),
    owner_id: other,
    status: "APPROVED",
    taxRate: 0,
    netAmount: 1,
    billingType: "ONE_TIME",
    validUntil: "2099-01-01",
    paymentTerms: "Por acordar",
    commercialTerms: "Alcance revisable",
    items: [{ description: "Servicio", quantity: 2, unitPrice: 10000, discountPercent: 10 }],
  });
  const payload = f.writes[0][3];
  assert.equal(payload.quote.net_amount, 18000);
  assert.equal(payload.quote.tax_amount, 3420);
  assert.equal(payload.quote.total_amount, 21420);
  assert.equal(payload.quote.status, undefined);
  assert.equal(payload.quote.owner_id, undefined);
});
test("valores inválidos, RUT, correo, fechas y cantidades no llegan a persistencia", async () => {
  assert.throws(() => recordInput({ ...record, rut: "12345678-0" }));
  assert.throws(() => recordInput({ ...record, email: "no válido" }));
  for (const value of [NaN, Infinity, -1, "100"]) assert.throws(() => amount(value, "Monto"));
  for (const value of ["x", "2026-02-30", "2026-99-99"]) assert.throws(() => date(value));
  const f = fixture();
  await assert.rejects(() =>
    f.service.propose(a, record.id, {
      items: [{ description: "x", quantity: NaN, unitPrice: 1 }],
      billingType: "ONE_TIME",
    }),
  );
  assert.equal(f.writes.length, 0);
});
test("el guardián global impide a ejecutivos entrar a controladores empresariales aunque sus permisos antiguos lo permitan", async () => {
  const previous = { mode: process.env.AUTH_MODE, env: process.env.NODE_ENV };
  process.env.AUTH_MODE = "development";
  process.env.NODE_ENV = "test";
  const guard = new RoleGuard(new Reflector(), {
    hasPermissions: async () => true,
    observe: async () => true,
  });
  const context = (controller, handler, role = "EJECUTIVA_VENTAS") => ({
    getClass: () => controller,
    getHandler: () => controller.prototype[handler],
    switchToHttp: () => ({
      getRequest: () => ({ headers: { "x-zyteron-role": role, "x-zyteron-user-id": a.userId } }),
    }),
  });
  try {
    await assert.rejects(
      () => guard.canActivate(context(CommercialController, "summary")),
      /sólo a su espacio/,
    );
    assert.equal(await guard.canActivate(context(SalesWorkspaceController, "board")), true);
    assert.equal(
      await guard.canActivate(context(CommercialController, "summary", "GERENTE_GENERAL")),
      true,
    );
  } finally {
    if (previous.mode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = previous.mode;
    if (previous.env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.env;
  }
});

test("la presentación comercial incluye organizaciones y alcance corporativo, sin limitar el tamaño del cliente", () => {
  const c = fixture().service.catalog().company;
  assert.match(c.presentation, /corporativos/);
  assert.match(c.description, /organizaciones/);
  assert.doesNotMatch(
    c.presentation + c.description,
    /microempresas|micro y pequeñas|solo.*pymes/i,
  );
});
test("la descarga PDF del ejecutivo aplica la reserva bancaria también a propuestas aprobadas", async () => {
  const contexts = [];
  const repo = { record: async () => record, quote: async () => quote };
  const commercial = { getQuote: async () => ({ ...quote, status: "APPROVED" }) };
  const pdf = {
    render: async (_quote, context) => {
      contexts.push(context);
      return { bytes: Buffer.from("synthetic"), filename: "synthetic.pdf" };
    },
  };
  const service = new SalesWorkspaceService(repo, commercial, pdf);
  await service.document(a, quote.quote_id);
  await service.document(manager, quote.quote_id);
  assert.equal(contexts[0].hideBankDetails, true);
  assert.equal(contexts[0].preview, false);
  assert.equal(contexts[0].numericDates, true);
  assert.equal(contexts[1].hideBankDetails, false);
});

test("el período del informe usa la fecha de Chile en el borde de medianoche", async () => {
  const f = fixture("2026-11-23T02:30:00Z");
  const board = await f.service.board(a, { from: "2026-11-22", to: "2026-11-22" });
  assert.equal(board.summary.contacts, 1);
  assert.equal(board.records.length, 1);
});
test("el tablero distingue ficha para facturación de cliente con compra, e invalida la conversión sin cobro", async () => {
  const f = fixture(),
    original = f.repo.rows;
  let hasReceipt = true,
    converted = false;
  f.repo.rows = async (table, ...args) =>
    table === "sales_work_records"
      ? [
          {
            ...record,
            owner_type: "EXECUTIVE",
            converted_at: converted ? record.created_at : null,
            conversion_receipt_key: converted ? "quote:33:11" : null,
          },
        ]
      : table === "sales_work_verified_receipts" && !hasReceipt
        ? []
        : original(table, ...args);
  assert.equal((await f.service.board(manager)).summary.generatedClients, 0);
  converted = true;
  assert.equal((await f.service.board(manager)).summary.generatedClients, 1);
  hasReceipt = false;
  const board = await f.service.board(manager);
  assert.equal(board.summary.generatedClients, 0);
  assert.equal(board.records[0].purchase_confirmed, false);
});
test("administración registra contactos y propuestas; el filtro corporativo no usa columnas inexistentes ni revela cartera ajena", async () => {
  const f = fixture(),
    original = f.repo.rows;
  f.repo.rows = async (table, ...args) =>
    table === "sales_work_records"
      ? [record, { ...record, id: other, owner_id: manager.userId, owner_type: "ADMIN" }]
      : original(table, ...args);
  await f.service.create(manager, {
    requestId: crypto.randomUUID(),
    company_name: "Empresa corporativa",
    contact_name: "Contacto",
    email: "contacto@example.invalid",
    interest: "Plataforma de operación",
    owner_id: other,
  });
  assert.equal(f.writes[0][0].role, "GERENTE_GENERAL");
  assert.equal(f.writes[0][3].owner_id, undefined);
  const board = await f.service.board(manager, { owner: "administration" });
  assert.equal(board.records.length, 1);
  assert.equal(board.records[0].owner_type, "ADMIN");
  assert.equal(board.proposals.length, 0);
  for (const call of f.calls) assert.equal(call.filter?.owner_type, undefined);
});

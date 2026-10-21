import test from "node:test";
import assert from "node:assert/strict";
import { InvoiceService, boletaPaymentMethod } from "../dist/finance/finance.billing.js";
const clientId = "11111111-1111-4111-8111-111111111111",
  invoiceId = "22222222-2222-4222-8222-222222222222",
  actor = { role: "FINANZAS", userId: "synthetic-finance-actor" };
function fixture({ access = true } = {}) {
  const records = { invoices: [], invoice_lines: [] },
    writes = [];
  let taxQueries = 0;
  const repo = {
    settings: async () => ({ defaultPaymentTermsDays: 0 }),
    create: async (table, data) => {
      writes.push(table);
      const row = {
        ...data,
        id: table === "invoices" ? invoiceId : "33333333-3333-4333-8333-333333333333",
        invoiceNumber: "SYNTHETIC",
        balanceDue: data.totalAmount,
      };
      records[table].push(row);
      return row;
    },
    list: async (table, filters) =>
      table === "invoice_lines"
        ? records.invoice_lines
        : table === "invoices"
          ? records.invoices.filter((i) => i.referenceInvoiceId === filters.referenceInvoiceId)
          : [],
    audit: async () => {},
    notify: async () => {},
    update: async (table, id, patch) => {
      writes.push(table);
      Object.assign(
        records[table].find((x) => x.id === id),
        patch,
      );
      return records[table].find((x) => x.id === id);
    },
  };
  const ctx = {
    repo,
    require() {},
    requireAny() {},
    assertClientAccess: async (a, id) => {
      assert.equal(id, clientId);
      if (!access) throw Error("CLIENT_DENIED");
    },
    sources: {
      client: async () => ({
        rut: "22222222-2",
        legalName: "Cliente Sintético",
        currency: "CLP",
        creditDays: 0,
      }),
    },
    taxRate: async () => {
      taxQueries++;
      return { rate: 0.19, versionId: null };
    },
    must: async (table, id) => records[table].find((x) => x.id === id),
    withClientNames: async (rows) => rows,
  };
  return { service: new InvoiceService(ctx, {}), writes, records, taxQueries: () => taxQueries };
}
const body = (code = 39) => ({
  clientId,
  documentTypeCode: code,
  boletaPaymentMethod: 3,
  lines: [{ description: "Servicio sintético", quantity: 1, unitPrice: 1000, isExempt: false }],
});
test("borrador de boleta afecta o exenta calcula importes y no registra dinero", async () => {
  for (const code of [39, 41]) {
    const f = fixture();
    const invoice = await f.service.createDraft(body(code), actor);
    assert.equal(invoice.boletaPaymentMethod, 3);
    assert.equal(invoice.status, "DRAFT");
    assert.equal(invoice.amountPaid, 0);
    assert.equal(invoice.taxDocumentId, null);
    assert.equal(invoice.totalAmount, code === 39 ? 1190 : 1000);
    assert.equal(invoice.lines[0].isExempt, code === 41);
    assert.equal(f.taxQueries(), code === 39 ? 1 : 0);
    assert.deepEqual(f.writes, ["invoices", "invoice_lines"]);
  }
});
test("cliente ajeno, medio inválido y montos no finitos fallan antes de escribir", async () => {
  const denied = fixture({ access: false });
  await assert.rejects(denied.service.createDraft(body(), actor), /CLIENT_DENIED/);
  assert.deepEqual(denied.writes, []);
  for (const method of [undefined, null, true, [], 0, 6, "1.0", "", NaN]) {
    const f = fixture();
    await assert.rejects(f.service.createDraft({ ...body(), boletaPaymentMethod: method }, actor));
    assert.deepEqual(f.writes, []);
  }
  for (const line of [
    { quantity: Infinity },
    { unitPrice: NaN },
    { discountAmount: Infinity },
    { discountAmount: -1 },
  ]) {
    const f = fixture();
    await assert.rejects(
      f.service.createDraft({ ...body(), lines: [{ ...body().lines[0], ...line }] }, actor),
    );
    assert.deepEqual(f.writes, []);
  }
  for (const method of [1, 2, 3, 4, 5, "3"])
    assert.equal(boletaPaymentMethod(method), Number(method));
});
test("cambiar el medio declarado exige volver a aprobación y conserva pagos en cero", async () => {
  const f = fixture();
  await f.service.createDraft(body(), actor);
  f.records.invoices[0].status = "PENDING_APPROVAL";
  await f.service.updateDraft(invoiceId, { boletaPaymentMethod: 2 }, actor);
  assert.equal(f.records.invoices[0].status, "DRAFT");
  assert.equal(f.records.invoices[0].boletaPaymentMethod, 2);
  assert.equal(f.records.invoices[0].amountPaid, 0);
  assert(f.writes.every((table) => ["invoices", "invoice_lines"].includes(table)));
  f.records.invoices[0].status = "ISSUING";
  await assert.rejects(
    f.service.updateDraft(invoiceId, { boletaPaymentMethod: 1 }, actor),
    /Sólo se editan borradores/,
  );
});

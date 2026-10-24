import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clientPaymentRows,
  financeCivilDay,
  financeCsv,
  nextReceivables,
  receivableState,
  receivableCaption,
  receivablesForQuote,
  receivablesForPayment,
  selectClientPayments,
  selectClientQuotes,
  type ClientQuote,
  type ClientReceivable,
} from "./client-finance-model";

const quote = (id: string, extra: Partial<ClientQuote> = {}) =>
  ({
    id,
    quoteNumber: `COT-${id}`,
    status: "ACCEPTED",
    createdAt: "2026-10-24T12:00:00Z",
    items: [{ description: "Mantención web" }],
    billing: { frequency: "MONTHLY", balance: 120000 },
    ...extra,
  }) as ClientQuote;
const debt = (id: string, dueAt: string | null, status = "PENDING", balanceAmount = 100) =>
  ({ id, dueAt, status, balanceAmount }) as ClientReceivable;

test("las mensualidades muestran propuestas vigentes y la búsqueda admite acentos", () => {
  const rows = [
    quote("mensual"),
    quote("borrada", { archivedAt: "2026-10-23" }),
    quote("unica", { billing: { frequency: "ONE_TIME", balance: 10 } as ClientQuote["billing"] }),
  ];
  const options = {
    query: "mantencion",
    frequency: "MONTHLY",
    status: "ALL",
    archived: false,
    sort: "recent",
  };
  assert.deepEqual(
    selectClientQuotes(rows, options).map((r) => r.id),
    ["mensual"],
  );
  assert.equal(rows.length, 3);
});

test("el filtro de saldo no presenta una propuesta anulada o en eliminación como cobrable", () => {
  const rows = [
    quote("vigente"),
    quote("anulada", { status: "CANCELLED" }),
    quote("pendiente", { archivePending: true }),
  ];
  assert.deepEqual(
    selectClientQuotes(rows, {
      query: "",
      frequency: "ALL",
      status: "BALANCE",
      archived: true,
      sort: "balance",
    }).map((r) => r.id),
    ["vigente"],
  );
});

test("los cobros priorizan vencidos, próximos y sin fecha, excluyendo cuentas cerradas", () => {
  const rows = [
    debt("sin-fecha", null),
    debt("proximo", "2026-10-29"),
    debt("vencido", "2026-10-20"),
    debt("anulado", "2026-10-01", "CANCELLED"),
    debt("pagado", "2026-10-01", "PAID", 0),
  ];
  assert.deepEqual(
    nextReceivables(rows, "2026-10-24").map((r) => r.id),
    ["vencido", "proximo", "sin-fecha"],
  );
  assert.equal(receivableState(debt("parcial", "2026-10-23", "PARTIAL"), "2026-10-24"), "OVERDUE");
  assert.equal(receivableState(debt("hoy", "2026-10-24"), "2026-10-24"), "PENDING");
});

test("cobros con el mismo número de cotización se distinguen por su identidad y modalidad", () => {
  const monthly = quote("mensual", { quoteNumber: "COT-2026-09804" });
  const fixed = quote("fijo", {
    quoteNumber: "COT-2026-09804",
    billing: { frequency: "ONE_TIME" } as ClientQuote["billing"],
  });
  const r = {
    ...debt("cuenta", null),
    description: "Factura",
    quoteId: "id-nativo",
    quoteViewId: "mensual",
  };
  assert.equal(receivableCaption(r, [monthly, fixed]), "Factura · COT-2026-09804 · Mensual");
  assert.equal(
    receivableCaption({ ...r, quoteViewId: "fijo" }, [monthly, fixed]),
    "Factura · COT-2026-09804 · Pago único",
  );
  assert.equal(
    receivableCaption({ ...r, quoteViewId: "sin-vinculo" }, [monthly, fixed]),
    "Factura",
  );
});

test("un pago conserva su día civil de Santiago al filtrar el rango de fechas", () => {
  assert.equal(financeCivilDay("2026-10-24T01:00:00Z"), "2026-10-23");
  assert.equal(financeCivilDay("2026-10-24"), "2026-10-24");
  assert.equal(financeCivilDay("inválida"), "");
  const rows = [
    {
      id: "1",
      reference: "Abono",
      source: "commercial",
      status: "CONFIRMED",
      method: "BANK_TRANSFER",
      receivedAt: "2026-10-24T01:00:00Z",
    },
  ] as ReturnType<typeof clientPaymentRows>;
  assert.equal(
    selectClientPayments(rows, {
      query: "transferencia",
      source: "commercial",
      status: "CONFIRMED",
      from: "2026-10-23",
      to: "2026-10-23",
    }).length,
    1,
  );
  assert.equal(
    selectClientPayments(rows, {
      query: "",
      source: "ALL",
      status: "ALL",
      from: "2026-10-24",
      to: "2026-10-24",
    }).length,
    0,
  );
});

test("referencias repetidas conservan la identidad y la moneda de cada registro", () => {
  const portal = {
    available: true,
    payments: [
      {
        id: "igual",
        reference: "R1",
        amount: 50000,
        allocatedAmount: 40000,
        creditAmount: 10000,
        method: "CASH",
        status: "CONFIRMED",
        receivedAt: "2026-10-24T12:00:00Z",
      },
    ],
  } as Parameters<typeof clientPaymentRows>[0];
  const accounting = {
    payments: [
      {
        id: "igual",
        paymentReference: "R1",
        grossAmount: 100,
        allocatedAmount: 70,
        unappliedAmount: 30,
        currency: "USD",
        provider: "BANK_TRANSFER",
        status: "CONFIRMED",
        receivedAt: "2026-10-23T12:00:00Z",
      },
    ],
  } as Parameters<typeof clientPaymentRows>[1];
  const rows = clientPaymentRows(portal, accounting);
  assert.deepEqual(
    rows.map((r) => [r.key, r.currency, r.credit]),
    [
      ["commercial:igual", "CLP", 10000],
      ["accounting:igual", "USD", 30],
    ],
  );
  assert.equal(
    selectClientPayments(rows, { query: "", source: "accounting", status: "ALL", from: "", to: "" })
      .length,
    1,
  );
});

test("la exportación CSV escapa separadores, saltos de línea y fórmulas de Excel", () => {
  const csv = financeCsv(
    ["Referencia", "Monto"],
    [
      ["=1+1", 100],
      ['Texto; con "comillas"\nnueva línea', 50],
      ["  @SUM(A1)", 1],
    ],
  );
  assert.ok(csv.startsWith('\uFEFF"Referencia";"Monto"\r\n'));
  assert.ok(csv.includes('"\'=1+1";"100"'));
  assert.ok(csv.includes('"Texto; con ""comillas""\nnueva línea";"50"'));
  assert.ok(csv.includes('"\'  @SUM(A1)"'));
});

test("las relaciones usan la identidad de cotización y las aplicaciones reales de pagos", () => {
  const rows = [
    {
      ...debt("mensual", null),
      quoteId: "native-monthly",
      quoteViewId: "monthly",
      paymentLinks: [{ paymentId: "pay-one", amount: 40 }],
    },
    {
      ...debt("unica", null),
      quoteId: "fixed",
      paymentLinks: [{ paymentId: "pay-two", amount: 40 }],
    },
    {
      ...debt("eliminada", null, "CANCELLED"),
      quoteId: "native-monthly",
      quoteViewId: "monthly",
      paymentLinks: [{ paymentId: "pay-one", amount: 20 }],
    },
  ];
  assert.deepEqual(
    receivablesForQuote(rows, "monthly").map((r) => r.id),
    ["mensual", "eliminada"],
  );
  assert.deepEqual(
    receivablesForQuote(rows, "fixed").map((r) => r.id),
    ["unica"],
  );
  assert.deepEqual(receivablesForQuote(rows, "native-monthly"), []);
  assert.deepEqual(
    receivablesForPayment(rows, "pay-one").map((r) => r.id),
    ["mensual", "eliminada"],
  );
  assert.deepEqual(receivablesForPayment(rows, "40"), []);
  assert.deepEqual(receivablesForPayment([debt("sin-vinculo", null)], "pay-one"), []);
});

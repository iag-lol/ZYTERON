import test from "node:test";
import assert from "node:assert/strict";
import type { Stage, WorkEarning, WorkProposal, WorkRecord } from "./sales-workspace-api";
import {
  agenda,
  agendaIcs,
  chilePhone,
  daysUntil,
  expiringProposals,
  funnel,
  googleCalendarLink,
  matches,
  monthlyCommission,
  pipeline,
  priority,
  reportDraft,
  toCsv,
  weekStart,
  weeklySeries,
  whatsappLink,
  winRate,
} from "./sales-insights";

// 22-11-2026 12:00 en Santiago (UTC-3).
const NOW = Date.parse("2026-11-22T15:00:00Z");
const labels = {
  CONTACTED: "Contactado",
  RESPONDED: "Respondió",
  INTERESTED: "Interesado",
  PROPOSAL: "En propuesta",
  ACCEPTED: "Aceptación informada",
  COMPLETED: "Venta validada",
  LOST: "No continúa",
} satisfies Record<Stage, string>;
const money = (v: number) => `$${v}`;

let seq = 0;
function record(partial: Partial<WorkRecord> = {}): WorkRecord {
  seq += 1;
  return {
    id: `r${seq}`,
    owner_id: "u1",
    lead_id: `l${seq}`,
    client_id: null,
    client_created: false,
    company_name: `Empresa ${seq}`,
    contact_name: "Ana Pérez",
    rut: null,
    email: null,
    phone: null,
    website: null,
    business_activity: null,
    address: null,
    commune: null,
    city: null,
    interest: "Sitio web",
    notes: "",
    stage: "CONTACTED",
    review_status: "APPROVED",
    review_note: null,
    next_action_at: null,
    created_at: "2026-11-20T12:00:00Z",
    updated_at: "2026-11-21T12:00:00Z",
    ...partial,
  };
}
function proposal(partial: Partial<WorkProposal> = {}): WorkProposal {
  seq += 1;
  return {
    quote_id: `q${seq}`,
    record_id: "r0",
    owner_id: "u1",
    quote_number: `COT-${seq}`,
    status: "SENT",
    company_name: "Empresa",
    contact_name: "Ana Pérez",
    contact_email: "ana@example.cl",
    net_amount: 1_000_000,
    tax_amount: 190_000,
    total_amount: 1_190_000,
    billing_type: "ONE_TIME",
    valid_until: "2026-12-31",
    payment_terms: "",
    commercial_terms: "",
    notes: "",
    review_note: null,
    created_at: "2026-11-20T12:00:00Z",
    items: [],
    ...partial,
  };
}

test("la agenda separa atrasados, hoy, semana y sin seguimiento según la hora de Santiago", () => {
  const rows = [
    record({ next_action_at: "2026-11-22T13:00:00Z" }), // 10:00 hoy, ya pasó
    record({ next_action_at: "2026-11-23T02:30:00Z" }), // 23:30 del 22 en Santiago → hoy
    record({ next_action_at: "2026-11-25T15:00:00Z" }),
    record({ next_action_at: "2026-12-15T15:00:00Z" }),
    record({}),
    record({ stage: "COMPLETED", next_action_at: "2026-11-01T15:00:00Z" }),
  ];
  const g = agenda(rows, NOW);
  assert.equal(g.overdue.length, 1);
  assert.equal(g.today.length, 1);
  assert.equal(g.week.length, 1);
  assert.equal(g.later.length, 1);
  assert.equal(g.unscheduled.length, 1);
});

test("la prioridad sube con seguimiento atrasado y baja sin movimiento", () => {
  const hot = record({ stage: "PROPOSAL", next_action_at: "2026-11-21T15:00:00Z", updated_at: "2026-11-21T15:00:00Z" });
  const cold = record({ stage: "RESPONDED", updated_at: "2026-10-01T15:00:00Z" });
  const closed = record({ stage: "LOST" });
  assert.equal(priority(hot, [], NOW).level, "high");
  assert.ok(priority(hot, [], NOW).reasons.includes("Seguimiento atrasado"));
  assert.equal(priority(cold, [], NOW).level, "low");
  assert.equal(priority(closed, [], NOW).level, "closed");
});

test("el embudo es acumulado y LOST sólo cuenta como contactado", () => {
  const rows = [
    record({ stage: "CONTACTED" }),
    record({ stage: "INTERESTED" }),
    record({ stage: "PROPOSAL" }),
    record({ stage: "COMPLETED", purchase_confirmed: true }),
    record({ stage: "LOST" }),
  ];
  const f = funnel(rows);
  assert.deepEqual(
    f.map((s) => s.reached),
    [5, 3, 3, 2, 1, 1],
  );
  assert.equal(f[0].conversion, null);
  assert.equal(f[1].conversion, 3 / 5);
});

test("el pipeline ponderado sólo usa propuestas abiertas", () => {
  const p = pipeline([
    proposal({ status: "SENT", net_amount: 1_000_000 }),
    proposal({ status: "NEGOTIATING", net_amount: 2_000_000, billing_type: "SUBSCRIPTION" }),
    proposal({ status: "ACCEPTED", net_amount: 500_000 }),
    proposal({ status: "EXPIRED", net_amount: 9_000_000 }),
  ]);
  assert.equal(p.open, 2);
  assert.equal(p.value, 3_000_000);
  assert.equal(p.weighted, 500_000 + 1_300_000);
  assert.equal(p.won, 1);
  assert.equal(p.recurring, 2_000_000);
});

test("la tasa de cierre ignora gestiones abiertas", () => {
  assert.equal(winRate([record({ stage: "COMPLETED", purchase_confirmed: true }), record({ stage: "LOST" }), record({})]), 0.5);
  assert.equal(winRate([record({})]), null);
});

test("las propuestas por vencer respetan la ventana de días", () => {
  const list = expiringProposals(
    [
      proposal({ valid_until: "2026-11-24" }),
      proposal({ valid_until: "2026-11-30" }),
      proposal({ valid_until: "2026-11-20" }),
      proposal({ valid_until: "2026-11-23", status: "ACCEPTED" }),
    ],
    5,
    NOW,
  );
  assert.equal(list.length, 1);
  assert.equal(daysUntil(list[0].valid_until, NOW), 2);
});

test("las series semanales empiezan el lunes y cuentan por semana", () => {
  assert.equal(weekStart("2026-11-22"), "2026-11-16");
  const series = weeklySeries(["2026-11-17T15:00:00Z", "2026-11-20T15:00:00Z", "2026-11-10T15:00:00Z"], 3, NOW);
  assert.deepEqual(
    series.map((s) => [s.start, s.value]),
    [
      ["2026-11-02", 0],
      ["2026-11-09", 1],
      ["2026-11-16", 2],
    ],
  );
});

test("las comisiones mensuales sólo suman las ganadas", () => {
  const e = (approved_at: string, amount: number, status: WorkEarning["status"] = "EARNED"): WorkEarning => ({
    id: approved_at + amount,
    owner_id: "u1",
    quote_id: "q",
    commission_amount: amount,
    commission_rate: 15,
    status,
    approved_at,
  });
  const months = monthlyCommission([e("2026-11-05T15:00:00Z", 100), e("2026-10-05T15:00:00Z", 50), e("2026-11-06T15:00:00Z", 999, "ON_HOLD")], 2, NOW);
  assert.deepEqual(months, [
    { month: "2026-10", value: 50 },
    { month: "2026-11", value: 100 },
  ]);
});

test("los teléfonos chilenos se normalizan para WhatsApp", () => {
  assert.equal(chilePhone("+56 9 1234 5678"), "56912345678");
  assert.equal(chilePhone("9 1234 5678"), "56912345678");
  assert.equal(chilePhone("1234"), null);
  assert.equal(whatsappLink("912345678", "Hola"), "https://wa.me/56912345678?text=Hola");
  assert.equal(whatsappLink(null, "Hola"), null);
});

test("el calendario ICS escapa texto y omite gestiones cerradas", () => {
  const ics = agendaIcs(
    [
      record({ company_name: "Uno, Dos; Tres", next_action_at: "2026-11-25T15:00:00Z" }),
      record({ stage: "LOST", next_action_at: "2026-11-25T15:00:00Z" }),
    ],
    NOW,
  );
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 1);
  assert.ok(ics.includes("SUMMARY:Seguimiento · Uno\\, Dos\\; Tres"));
  assert.ok(ics.includes("DTSTART:20261125T150000Z"));
  assert.ok(ics.includes("\r\n"));
});

test("el enlace de Google Calendar dura 30 minutos", () => {
  const link = googleCalendarLink(record({ next_action_at: "2026-11-25T15:00:00Z" }));
  assert.ok(link?.includes("dates=20261125T150000Z%2F20261125T153000Z"));
});

test("el CSV neutraliza fórmulas y escapa separadores", () => {
  const csv = toCsv([["=SUMA(A1)", "a;b", 'di "hola"', null]]);
  assert.equal(csv, "﻿'=SUMA(A1);\"a;b\";\"di \"\"hola\"\"\";");
});

test("la búsqueda ignora tildes y combina términos", () => {
  assert.ok(matches("pena gomez", "Peña", "Gómez"));
  assert.ok(!matches("pena lopez", "Peña", "Gómez"));
  assert.ok(matches("", "x"));
});

test("el borrador de informe usa sólo datos del período", () => {
  const text = reportDraft(
    {
      records: [record({ created_at: "2026-11-18T15:00:00Z" }), record({ created_at: "2026-10-01T15:00:00Z" })],
      proposals: [proposal({ created_at: "2026-11-19T15:00:00Z", net_amount: 700 })],
      from: "2026-11-16",
      to: "2026-11-22",
      labels,
      money,
    },
    NOW,
  );
  assert.ok(text.includes("Período informado: 16-11-2026 al 22-11-2026"));
  assert.ok(text.includes("- Contactos nuevos: 1"));
  assert.ok(text.includes("- Propuestas preparadas: 1 (neto $700)"));
});


test("un cobro revertido no suma ventas confirmadas ni tasa de cierre", () => {
  const reversed = record({ stage: "COMPLETED", purchase_confirmed: false });
  const lost = record({ stage: "LOST" });
  assert.equal(winRate([reversed, lost]), 0);
  assert.equal(funnel([reversed]).at(-1)?.reached, 0);
  const text = reportDraft({ records: [reversed], proposals: [], from: "2026-11-16", to: "2026-11-22", labels, money }, NOW);
  assert.ok(text.includes("- Ventas validadas: 0"));
  assert.ok(text.includes("- Compras por revisar: 1"));
  assert.ok(!text.includes("- Venta validada: 1"));
});

test("el informe fecha la venta por conversión y no por una edición posterior", () => {
  const text = reportDraft({ records: [record({ stage: "COMPLETED", purchase_confirmed: true, converted_at: "2026-10-10T12:00:00Z", updated_at: "2026-11-21T12:00:00Z" })], proposals: [], from: "2026-11-16", to: "2026-11-22", labels, money }, NOW);
  assert.ok(text.includes("- Ventas validadas: 0"));
});

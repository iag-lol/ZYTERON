import test from "node:test";
import assert from "node:assert/strict";
import {
  clientRecurringProjection,
  recurringAssignmentVisible,
  recurringStateLabel,
  type RecurringCandidate,
} from "./client-recurring-projection";
import { projectMonthlyPayments } from "./payment-projection";
const candidate = (id: string, extra: Partial<RecurringCandidate> = {}): RecurringCandidate => ({
  quoteId: id,
  quoteViewId: id,
  label: "COT-REPETIDA",
  amount: 280514,
  currency: "CLP",
  state: "ASSIGNED",
  managedBy: "ASSIGNED",
  nextDate: null,
  activatedAt: null,
  paidThrough: null,
  anchorDate: null,
  approved: true,
  closed: false,
  ...extra,
});
test("retirar una mensualidad en administración también la retira del portal por su identidad exacta", () => {
  const old = candidate("vieja", { amount: 195134 }),
    updated = candidate("nueva");
  assert.deepEqual(
    clientRecurringProjection(
      [old, updated],
      [{ quote_id: "vieja", native_quote_id: "vieja", state: "ARCHIVED" }],
    ).map((p) => [p.quoteId, p.amount]),
    [["nueva", 280514]],
  );
  assert.equal(old.state, "ASSIGNED");
});
test("el archivo reconoce identificadores nativos antiguos y la cancelación pendiente no permite proyecciones sin cobertura", () => {
  const raw = candidate("cuid-nativo", {
    quoteViewId: "uuid-vista",
    state: "ACTIVE",
    managedBy: "FLOW",
    nextDate: "2026-10-24",
  });
  assert.equal(
    clientRecurringProjection(
      [raw],
      [{ quote_id: "uuid-vista", native_quote_id: "cuid-nativo", state: "ARCHIVED" }],
    ).length,
    0,
  );
  const [pending] = clientRecurringProjection(
    [raw],
    [{ quote_id: "uuid-vista", native_quote_id: "cuid-nativo", state: "PENDING_CANCELLATION" }],
  );
  assert.equal(pending.state, "CANCEL_REQUESTED");
  assert.deepEqual(projectMonthlyPayments(pending, 2026), []);
});
test("una mensualidad aprobada es visible como asignada sin acreditar pagos ni generar deudas proyectadas", () => {
  assert.equal(recurringAssignmentVisible("PENDING", "APPROVED"), true);
  const [assigned] = clientRecurringProjection([candidate("mensual")], []);
  assert.equal(assigned.state, "ASSIGNED");
  assert.deepEqual(projectMonthlyPayments(assigned, 2026), []);
  assert.equal(recurringStateLabel(assigned.state), "Pendiente de activación");
});
test("los borradores, rechazos y propuestas cerradas no se publican como mensualidades", () => {
  for (const state of ["DRAFT", "PENDING_APPROVAL", "REJECTED", "CANCELLED", "EXPIRED"])
    assert.equal(recurringAssignmentVisible("PENDING", state), false);
  assert.equal(recurringAssignmentVisible("LOST", "APPROVED"), false);
  assert.deepEqual(
    clientRecurringProjection(
      [
        candidate("cerrada", { closed: true }),
        candidate("privada", { approved: false }),
        candidate("cero", { amount: 0 }),
      ],
      [],
    ),
    [],
  );
});
test("una pausa conserva el acuerdo y deja de proyectar nuevos cobros", () => {
  const [paused] = clientRecurringProjection(
    [candidate("pausa", { state: "PAUSED", managedBy: "MANUAL", nextDate: "2026-10-24" })],
    [],
  );
  assert.equal(paused.state, "PAUSED");
  assert.deepEqual(projectMonthlyPayments(paused, 2026), []);
});

test("deshabilitar el pago online no oculta una mensualidad aprobada y no convierte pagos únicos en planes", () => {
  assert.equal(
    recurringAssignmentVisible("PENDING", "APPROVED", {
      billingType: "SUBSCRIPTION",
      enabled: false,
    }),
    true,
  );
  assert.equal(
    recurringAssignmentVisible("PENDING", "DRAFT", { billingType: "SUBSCRIPTION", enabled: false }),
    false,
  );
  assert.equal(
    recurringAssignmentVisible("WON", "ACCEPTED", { billingType: "ONE_TIME", enabled: true }),
    false,
  );
});

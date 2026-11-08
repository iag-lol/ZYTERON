import test from "node:test";
import assert from "node:assert/strict";
import {
  CATALOG_VERSION,
  CLOSED_PLANS,
  CLOSED_ADDONS,
  calculateManualQuote,
  addonAvailability,
} from "./catalog";
import { PLAN_PRICE_AMOUNTS, ADDON_PRICE_AMOUNTS } from "@/config/pricing";
import { createManualGrant, readManualGrant } from "./grant";
const base = { version: CATALOG_VERSION, planId: "web-basica", addons: [] };
test("catálogo cerrado conserva las tarifas publicadas y todos los límites", () => {
  for (const p of CLOSED_PLANS) {
    assert.equal(p.amount, PLAN_PRICE_AMOUNTS[p.id]);
    assert.ok(p.includes.length && p.excludes.length && p.days[1] >= p.days[0]);
  }
  for (const a of CLOSED_ADDONS) {
    assert.equal(a.amount, ADDON_PRICE_AMOUNTS[a.id]);
    assert.ok(a.scope && a.excludes && a.days > 0);
  }
});
test("total con IVA, cantidades y plazo se calculan en CLP enteros", () => {
  const q = calculateManualQuote({
    ...base,
    addons: [
      { id: "extraPage", quantity: 2 },
      { id: "blog", quantity: 1 },
    ],
  });
  assert.equal(q.net, 509960);
  assert.equal(q.tax, 96892);
  assert.equal(q.total, 606852);
  assert.deepEqual(q.days, [14, 19]);
});
test("rechaza montos del navegador, catálogo obsoleto y proyectos que exigen levantamiento", () => {
  for (const value of [
    { ...base, price: 1 },
    { ...base, version: "old" },
    { ...base, planId: "enterprise" },
    { ...base, addons: [{ id: "extraPage", quantity: 0 }] },
    { ...base, addons: [{ id: "extraPage", quantity: 11 }] },
  ])
    assert.throws(() => calculateManualQuote(value));
});
test("evita duplicados, extras incluidos y combinaciones incompatibles", () => {
  for (const selection of [
    {
      ...base,
      addons: [
        { id: "extraPage", quantity: 1 },
        { id: "extraPage", quantity: 1 },
      ],
    },
    { ...base, planId: "ecommerce", addons: [{ id: "payments", quantity: 1 }] },
    { ...base, addons: [{ id: "products20", quantity: 1 }] },
    {
      ...base,
      planId: "catalogo",
      addons: [
        { id: "products20", quantity: 1 },
        { id: "products50", quantity: 1 },
      ],
    },
    {
      ...base,
      addons: [
        { id: "advancedSeo", quantity: 1 },
        { id: "technicalSeo", quantity: 1 },
      ],
    },
  ])
    assert.throws(() => calculateManualQuote(selection));
});
test("cada adicional disponible produce un resumen con alcance y plazo", () => {
  for (const p of CLOSED_PLANS)
    for (const a of CLOSED_ADDONS)
      if (!addonAvailability(p.id, a)) {
        const q = calculateManualQuote({
          ...base,
          planId: p.id,
          addons: [{ id: a.id, quantity: a.max }],
        });
        assert.equal(q.total, q.net + Math.round(q.net * 0.19));
        assert.equal(q.days[1], p.days[1] + a.days * a.max);
        assert.equal(q.addons[0].scope, a.scope);
      }
});
test("acceso al borrador firmado, acotado en tiempo y resistente a alteración", () => {
  const prior = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "test-only-".repeat(5);
  try {
    const now = 1700000000000,
      id = "12345678-1234-4123-a123-123456789012",
      token = createManualGrant(id, now);
    assert.equal(readManualGrant(token, now), id);
    assert.equal(readManualGrant(token + "x", now), null);
    assert.equal(readManualGrant(token, now + 8 * 86400000), null);
    assert.equal(readManualGrant(undefined), null);
  } finally {
    process.env.NEXTAUTH_SECRET = prior;
  }
});

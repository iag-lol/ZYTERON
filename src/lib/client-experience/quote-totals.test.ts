import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteTotals } from "./quote-totals";
test("editing a quote retains its agreed discounts before applying VAT", () => {
  assert.deepEqual(quoteTotals([{ qty: 1, unitPrice: 10000, discountPct: 10 }], true), {
    subtotal: 9000,
    totalDescuento: 1000,
    iva: 1710,
    grandTotal: 10710,
  });
});
test("fractional quantities and quotes excluding VAT retain their amount", () => {
  assert.deepEqual(
    quoteTotals(
      [
        { qty: 1.5, unitPrice: 10000, discountPct: 20 },
        { qty: 1, unitPrice: 1000 },
      ],
      false,
    ),
    { subtotal: 13000, totalDescuento: 3000, iva: 0, grandTotal: 13000 },
  );
});

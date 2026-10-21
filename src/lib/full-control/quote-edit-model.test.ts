import test from "node:test";
import assert from "node:assert/strict";
import { quoteEditSchema, commercialTotals, nativeQuoteLocked } from "./quote-edit-model";
test("quote editor validates bounded money and discounts", () => {
  const body = {
    revision: "v1",
    contactName: "Empresa",
    contactEmail: "qa@example.invalid",
    companyName: "Empresa",
    validUntil: "2026-12-31",
    paymentTerms: "",
    commercialTerms: "",
    notes: "",
    taxRate: 19,
    items: [
      { description: "Web", quantity: 2, unitPrice: 100000, discountPercent: 10, taxable: true },
    ],
  };
  assert.equal(quoteEditSchema.safeParse(body).success, true);
  for (const patch of [
    { quantity: 0 },
    { unitPrice: -1 },
    { unitPrice: Infinity },
    { discountPercent: 101 },
    { description: "" },
  ])
    assert.equal(
      quoteEditSchema.safeParse({ ...body, items: [{ ...body.items[0], ...patch }] }).success,
      false,
    );
  assert.deepEqual(commercialTotals(body.items, 19), {
    subtotal: 200000,
    discount: 20000,
    net: 180000,
    tax: 34200,
    total: 214200,
  });
});
test("quote tax only includes taxable services and preserves foreign currency cents", () => {
  assert.deepEqual(
    commercialTotals(
      [
        { description: "A", quantity: 1, unitPrice: 100, discountPercent: 0, taxable: true },
        { description: "B", quantity: 1, unitPrice: 200, discountPercent: 0, taxable: false },
      ],
      19,
    ),
    { subtotal: 300, discount: 0, net: 300, tax: 19, total: 319 },
  );
  assert.equal(
    commercialTotals(
      [{ description: "A", quantity: 1, unitPrice: 10.5, discountPercent: 0, taxable: true }],
      19,
      "USD",
    ).total,
    12.5,
  );
});
test("generated documents, accepted proposals and payment commitments lock in-place edits", () => {
  assert.equal(nativeQuoteLocked("PENDING", { controlState: "DRAFT" }, 0), false);
  for (const [status, meta, count] of [
    ["SENT", {}, 0],
    ["WON", {}, 0],
    ["PENDING", { controlState: "ACCEPTED" }, 0],
    ["PENDING", { pdfGeneratedAt: "2026-10-20" }, 0],
    ["PENDING", {}, 1],
    ["PENDING", { payment: { subscription: { registerToken: "token" } } }, 0],
    ["PENDING", { payment: { legalAcceptance: { acceptedAt: "2026-10-20" } } }, 0],
    ["PENDING", { payment: { stages: [{ status: "PROCESSING" }] } }, 0],
  ] as const)
    assert.equal(
      nativeQuoteLocked(status, meta as Parameters<typeof nativeQuoteLocked>[1], count),
      true,
    );
});

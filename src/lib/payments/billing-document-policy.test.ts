import test from "node:test";
import assert from "node:assert/strict";
import {
  assertInvoicePdf,
  paymentBillingDocuments,
  type BillingDocument,
} from "./billing-document-policy";
const file = (
  id: string,
  targetType: "PAYMENT" | "INVOICE",
  targetId: string,
  targetSource: "commercial" | "accounting" = "accounting",
  documentId = id,
): BillingDocument => ({
  id,
  documentId,
  targetType,
  targetId,
  targetSource,
  title: "Factura",
  fileName: "factura.pdf",
  size: 20,
  uploadedAt: "2026-10-24T12:00:00Z",
});
test("payment invoices require an exact record and source, including explicit allocations", () => {
  const files = [
    file("direct", "PAYMENT", "pay"),
    file("wrong", "PAYMENT", "other"),
    file("other-source", "PAYMENT", "pay", "commercial"),
    file("allocated", "INVOICE", "inv"),
    file("unrelated", "INVOICE", "other"),
  ];
  assert.deepEqual(
    paymentBillingDocuments(files, {
      id: "pay",
      source: "accounting",
      allocations: [{ receivableId: "inv" }],
    }).map((f) => f.id),
    ["direct", "allocated"],
  );
});
test("one PDF linked to both a payment and its invoice appears once", () => {
  const files = [
    file("a", "PAYMENT", "pay", "accounting", "pdf"),
    file("b", "INVOICE", "inv", "accounting", "pdf"),
  ];
  assert.equal(
    paymentBillingDocuments(files, {
      id: "pay",
      source: "accounting",
      allocations: [{ receivableId: "inv" }],
    }).length,
    1,
  );
});
test("a payment without allocations still exposes its own PDF only", () => {
  assert.deepEqual(
    paymentBillingDocuments([file("own", "PAYMENT", "pay"), file("invoice", "INVOICE", "inv")], {
      id: "pay",
      source: "accounting",
      allocations: [],
    }).map((f) => f.id),
    ["own"],
  );
});
test("invoice uploads reject disguised files, wrong MIME, empty files and oversized PDFs", () => {
  assert.doesNotThrow(() => assertInvoicePdf(Buffer.from("%PDF-1.7\n"), "application/pdf"));
  for (const bytes of [Buffer.from("<html>"), Buffer.alloc(0), Buffer.alloc(20 * 1024 * 1024 + 1)])
    assert.throws(() => assertInvoicePdf(bytes, "application/pdf"));
  assert.throws(() => assertInvoicePdf(Buffer.from("%PDF-1.7\n"), "text/html"));
});

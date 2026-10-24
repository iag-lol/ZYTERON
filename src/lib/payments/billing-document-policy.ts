import { z } from "zod";

export const billingTargetSchema = z.object({
  targetType: z.enum(["PAYMENT", "INVOICE"]),
  targetSource: z.enum(["commercial", "accounting"]),
  targetId: z.string().trim().min(1).max(100),
});
export type BillingTarget = z.infer<typeof billingTargetSchema>;
export type BillingDocument = BillingTarget & {
  id: string;
  documentId: string;
  title: string;
  fileName: string;
  size: number | null;
  uploadedAt: string;
};

export function assertInvoicePdf(bytes: Uint8Array, mime: string) {
  if (
    mime !== "application/pdf" ||
    bytes.length < 5 ||
    bytes.length > 20 * 1024 * 1024 ||
    String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-"
  )
    throw new Error("Adjunta una factura en PDF válido, de hasta 20 MB.");
}

export function paymentBillingDocuments(
  documents: readonly BillingDocument[],
  payment: { id: string; source: string; allocations: readonly { receivableId: string }[] },
) {
  const selected = documents.filter(
    (file) =>
      file.targetSource === payment.source &&
      (file.targetType === "PAYMENT"
        ? file.targetId === payment.id
        : payment.allocations.some((allocation) => allocation.receivableId === file.targetId)),
  );
  return selected.filter(
    (file, index) => selected.findIndex((row) => row.documentId === file.documentId) === index,
  );
}

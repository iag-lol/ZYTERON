import { z } from "zod";
export const quoteEditSchema = z
  .object({
    revision: z.string().min(1).max(100),
    contactName: z.string().trim().min(1).max(200),
    contactEmail: z.union([z.email(), z.literal("")]),
    companyName: z.string().trim().min(1).max(250),
    validUntil: z.union([z.iso.date(), z.literal("")]),
    paymentTerms: z.string().max(5000),
    commercialTerms: z.string().max(10000),
    notes: z.string().max(10000),
    taxRate: z.union([z.literal(0), z.literal(19)]),
    items: z
      .array(
        z
          .object({
            description: z.string().trim().min(1).max(2000),
            quantity: z.number().finite().positive().max(1000000),
            unitPrice: z.number().finite().nonnegative().max(1000000000),
            discountPercent: z.number().finite().min(0).max(100),
            taxable: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type QuoteEdit = z.infer<typeof quoteEditSchema>;
export function commercialTotals(items: QuoteEdit["items"], taxRate: number, currency = "CLP") {
  const round = (n: number) =>
    Math.round((n + Number.EPSILON) * (currency === "CLP" ? 1 : 100)) /
    (currency === "CLP" ? 1 : 100);
  const subtotal = round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const discount = round(
    items.reduce((s, i) => s + (i.quantity * i.unitPrice * i.discountPercent) / 100, 0),
  );
  const tax = round(
    (items
      .filter((i) => i.taxable)
      .reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discountPercent / 100), 0) *
      taxRate) /
      100,
  );
  const net = round(subtotal - discount);
  return { subtotal, discount, net, tax, total: round(net + tax) };
}
export function nativeQuoteLocked(
  status: string,
  meta: {
    controlState?: string;
    pdfGeneratedAt?: string;
    payment?: {
      legalAcceptance?: { acceptedAt?: string };
      subscription?: { subscriptionId?: string; registerToken?: string };
      stages?: Array<{ status: string; flow?: { token?: string } }>;
    };
  },
  obligations: number,
) {
  return (
    status !== "PENDING" ||
    !["DRAFT", "REJECTED"].includes(meta.controlState || "DRAFT") ||
    obligations > 0 ||
    !!meta.pdfGeneratedAt ||
    !!meta.payment?.legalAcceptance?.acceptedAt ||
    !!meta.payment?.subscription?.subscriptionId ||
    !!meta.payment?.subscription?.registerToken ||
    !!meta.payment?.stages?.some(
      (s) => s.flow?.token || ["PAID", "PROCESSING", "PENDING_TRANSFER_REVIEW"].includes(s.status),
    )
  );
}

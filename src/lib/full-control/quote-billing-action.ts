import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseQuoteMessage, serializeQuoteMessage } from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";
import { legacyViewId } from "./legacy-id";
export async function setWebsiteQuoteBilling(
  viewId: string,
  frequency: "ONE_TIME" | "MONTHLY",
  actorId: string | null,
  transaction?: Prisma.TransactionClient,
) {
  const work = async (db: Prisma.TransactionClient) => {
    const source = (await db.quote.findMany({ select: { id: true } })).find(
      (q) => legacyViewId("quote", q.id) === viewId,
    );
    if (!source) {
      const [canonical] = await db.$queryRaw<
        Array<{
          id: string;
          status: string;
          document_id: string | null;
          sent_at: Date | null;
          accepted_at: Date | null;
        }>
      >`SELECT id,status,document_id,sent_at,accepted_at FROM quotes WHERE id=${viewId}::uuid FOR UPDATE`;
      if (!canonical) throw Error("QUOTE_NOT_FOUND");
      const [plan] = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM quote_payment_plans WHERE quote_id=${viewId}::uuid LIMIT 1`;
      if (
        canonical.status !== "DRAFT" ||
        canonical.document_id ||
        canonical.sent_at ||
        canonical.accepted_at ||
        plan
      )
        throw Error("QUOTE_BILLING_LOCKED");
      await db.$executeRaw`UPDATE quotes SET billing_type=${frequency === "MONTHLY" ? "SUBSCRIPTION" : "ONE_TIME"},updated_at=now() WHERE id=${viewId}::uuid`;
      await db.clientAuditLog.create({
        data: {
          actorId,
          action: "QUOTE_BILLING_DEFINED",
          entityType: "quotes",
          entityId: viewId,
          details: { frequency, createsPayment: false, createsSubscription: false },
        },
      });
      return { ok: true, frequency };
    }
    await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${source.id} FOR UPDATE`;
    const quote = await db.quote.findUniqueOrThrow({ where: { id: source.id } });
    const meta = parseQuoteMessage(quote.message) as ReturnType<typeof parseQuoteMessage> & {
      controlState?: string;
    };
    const obligations = await db.receivable.count({ where: { quoteId: quote.id } });
    if (
      quote.status !== "PENDING" ||
      (meta.controlState && meta.controlState !== "DRAFT") ||
      obligations ||
      meta.payment?.legalAcceptance?.acceptedAt ||
      meta.payment?.subscription?.subscriptionId ||
      meta.payment?.subscription?.registerToken ||
      meta.pdfGeneratedAt ||
      meta.payment?.stages?.some(
        (s) =>
          s.flow?.token || ["PAID", "PROCESSING", "PENDING_TRANSFER_REVIEW"].includes(s.status),
      )
    )
      throw Error("QUOTE_BILLING_LOCKED");
    const next = normalizeQuoteMetaPayment({
      ...meta,
      payment: {
        ...meta.payment,
        billingType: frequency === "MONTHLY" ? "SUBSCRIPTION" : "ONE_TIME",
        stages: undefined,
        subscription:
          frequency === "MONTHLY"
            ? { interval: "MONTHLY", amount: quote.total, status: "PENDING" }
            : undefined,
      },
    });
    await db.quote.update({
      where: { id: quote.id },
      data: { message: serializeQuoteMessage(next) },
    });
    await db.clientAuditLog.create({
      data: {
        actorId,
        targetUserId: quote.userId,
        action: "QUOTE_BILLING_DEFINED",
        entityType: "Quote",
        entityId: quote.id,
        details: { frequency, createsSubscription: false, createsPayment: false },
      },
    });
    return { ok: true, frequency };
  };
  return transaction ? work(transaction) : prisma.$transaction(work);
}

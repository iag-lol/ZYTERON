import "server-only";
import {finalizePendingQuoteArchive} from "@/lib/full-control/quote-archive";
import { prisma } from "@/lib/prisma";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment } from "./quote-payments";
import { getFlowSubscription, cancelFlowSubscription } from "./flow";
import { providerInstant, providerPeriodEnd } from "./subscription-evidence";
import { consumeFinancialCode } from "./financial-challenge";
import { ZYTERON_COMPANY } from "@/lib/company";
export async function requestSubscriptionCancellation(input: {
  userId: string;
  quoteId: string;
  challengeId: string;
  code: string;
}) {
  const accepted = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${input.quoteId} FOR UPDATE`;
    const quote = await tx.quote.findFirst({ where: { id: input.quoteId, userId: input.userId } });
    if (!quote) throw new Error("SUBSCRIPTION_OWNER_REQUIRED");
    const meta = normalizeQuoteMetaPayment(
      enrichQuoteRecord({ ...quote, createdAt: quote.createdAt.toISOString() }).meta,
    );
    if (!meta.payment?.subscription?.subscriptionId) throw new Error("SUBSCRIPTION_UNAVAILABLE");
    if (
      !(await consumeFinancialCode(tx, {
        id: input.challengeId,
        userId: input.userId,
        quoteId: input.quoteId,
        purpose: "CANCEL_SUBSCRIPTION",
        code: input.code,
      }))
    )
      return false;
    await tx.$executeRaw`INSERT INTO zyteron_recurring_lifecycle(quote_id,client_id,subscription_id,state,requested_at) VALUES(${quote.id},${input.userId},${meta.payment.subscription.subscriptionId},'CANCEL_REQUESTED',now()) ON CONFLICT(quote_id) DO UPDATE SET state=CASE WHEN zyteron_recurring_lifecycle.state='ACTIVE' THEN 'CANCEL_REQUESTED' ELSE zyteron_recurring_lifecycle.state END,requested_at=coalesce(zyteron_recurring_lifecycle.requested_at,now())`;
    const message =
      "El cliente solicitó cancelar su suscripción. El período pagado se conservará. La confirmación de cancelación y la cobertura se verifican con la pasarela.";
    for (const recipient of [quote.email, ZYTERON_COMPANY.salesEmail])
      await tx.$executeRaw`INSERT INTO zyteron_payment_mail(dedupe,quote_id,recipient,kind,amount,payload) VALUES(${"cancel-request/" + quote.id + "/" + recipient},${quote.id},${recipient},'SUBSCRIPTION_CANCELLED',0,${JSON.stringify({ message })}::jsonb) ON CONFLICT(dedupe) DO NOTHING`;
    return true;
  });
  if (!accepted) throw new Error("FINANCIAL_CODE_INVALID");
  await reconcileCancellation(input.quoteId);
}
export async function reconcileCancellation(quoteId: string) {
  const q = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!q?.userId) throw new Error("SUBSCRIPTION_BINDING_REQUIRED");
  const binding = normalizeQuoteMetaPayment(
    enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() }).meta,
  ).payment?.subscription;
  if (!binding?.subscriptionId || !binding.customerId || !binding.planId)
    throw new Error("SUBSCRIPTION_BINDING_REQUIRED");
  const life = await prisma.$queryRaw<
    Array<{ state: string }>
  >`SELECT state FROM zyteron_recurring_lifecycle WHERE quote_id=${quoteId}`;
  if (!life[0] || life[0].state === "ACTIVE") return;
  let remote = await getFlowSubscription(binding.subscriptionId);
  const matches = () =>
    remote.customerId === binding.customerId &&
    remote.planId === binding.planId &&
    remote.subscriptionId === binding.subscriptionId;
  if (!matches()) throw new Error("SUBSCRIPTION_OWNERSHIP_MISMATCH");
  if (remote.status !== 4 && remote.cancel_at_period_end !== 1) {
    remote = await cancelFlowSubscription(binding.subscriptionId);
    if (!matches()) throw new Error("SUBSCRIPTION_OWNERSHIP_MISMATCH");
  }
  if (remote.status !== 4 && remote.cancel_at_period_end !== 1)
    throw new Error("SUBSCRIPTION_CANCEL_UNCONFIRMED");
  const payments = await prisma.payment.findMany({
    where: { clientId: q.userId, status: "CONFIRMED", source: "SUBSCRIPTION", provider: "FLOW" },
    select: { metadata: true },
  });
  const ends = payments
    .map((p) => p.metadata as { quoteId?: string; periodEnd?: string } | null)
    .filter((p) => p?.quoteId === quoteId && p.periodEnd)
    .map((p) => providerInstant(p!.periodEnd))
    .sort();
  const paidThrough = ends.at(-1) || null,
    remoteEnd = remote.period_end ? providerPeriodEnd(remote.period_end) : null;
  await prisma.$executeRaw`UPDATE zyteron_recurring_lifecycle SET state=${remote.status === 4 ? "CANCELLED" : "CANCEL_SCHEDULED"},verified_at=now(),paid_through=${paidThrough}::timestamptz,cancel_effective_at=${paidThrough || remoteEnd}::timestamptz,updated_at=now() WHERE quote_id=${quoteId}`;
  await finalizePendingQuoteArchive(quoteId);
}
export async function runRecurringCancellations() {
  const rows = await prisma.$queryRaw<
    Array<{ quote_id: string }>
  >`SELECT quote_id FROM zyteron_recurring_lifecycle WHERE state IN ('CANCEL_REQUESTED','CANCEL_SCHEDULED','CANCELLED') ORDER BY updated_at LIMIT 10`;
  for (const r of rows) {
    try {
      await reconcileCancellation(r.quote_id);
    } catch {
      /* durable request remains pending for reconciliation */
    }
  }
}

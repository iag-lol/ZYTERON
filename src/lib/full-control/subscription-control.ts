import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nativeQuote } from "./quote-commercial";
import { parseQuoteMessage } from "@/lib/admin/quote";
import { reconcileCancellation } from "@/lib/payments/recurring-lifecycle";

async function binding(db: Prisma.TransactionClient, quoteId: string, clientId: string) {
  const q = await nativeQuote(db, quoteId);
  if (!q?.userId) return null;
  const [link] = await db.$queryRaw<
    Array<{ client_id: string }>
  >`SELECT client_id FROM zyteron_legacy_client_link WHERE user_id=${q.userId}`;
  if (link?.client_id !== clientId) throw Error("SUBSCRIPTION_OWNER_REQUIRED");
  return { quote: q, subscription: parseQuoteMessage(q.message).payment?.subscription };
}
export async function subscriptionControl(quoteId: string, clientId: string) {
  return prisma.$transaction(async (db) => {
    const b = await binding(db, quoteId, clientId);
    if (!b) return { managed: false, canCancel: false };
    const s = b.subscription;
    const [life] = await db.$queryRaw<
      Array<{ state: string; paid_through: Date | null; verified_at: Date | null }>
    >`SELECT state,paid_through,verified_at FROM zyteron_recurring_lifecycle WHERE quote_id=${b.quote.id}`;
    return {
      managed: Boolean(s?.subscriptionId || s?.registerToken),
      canCancel: Boolean(
        s?.subscriptionId && s.customerId && s.planId && (!life || life.state === "ACTIVE"),
      ),
      state: life?.state || (s?.subscriptionId ? "ACTIVE" : "PENDING_AUTHORIZATION"),
      paidThrough: life?.paid_through?.toISOString() ?? null,
      verifiedAt: life?.verified_at?.toISOString() ?? null,
    };
  });
}
export async function cancelAdminSubscription(
  quoteId: string,
  clientId: string,
  reason: string,
  actorId: string | null,
) {
  const rawId = await prisma.$transaction(async (db) => {
    const b = await binding(db, quoteId, clientId),
      s = b?.subscription;
    if (!b || !s?.subscriptionId || !s.customerId || !s.planId)
      throw Error("SUBSCRIPTION_BINDING_REQUIRED");
    await db.$executeRaw`INSERT INTO zyteron_recurring_lifecycle(quote_id,client_id,subscription_id,state,requested_at) VALUES(${b.quote.id},${b.quote.userId},${s.subscriptionId},'CANCEL_REQUESTED',now()) ON CONFLICT(quote_id) DO UPDATE SET state=CASE WHEN zyteron_recurring_lifecycle.state='ACTIVE' THEN 'CANCEL_REQUESTED' ELSE zyteron_recurring_lifecycle.state END,requested_at=coalesce(zyteron_recurring_lifecycle.requested_at,now())`;
    await db.clientAuditLog.create({
      data: {
        actorId,
        targetUserId: b.quote.userId,
        action: "ADMIN_SUBSCRIPTION_CANCELLATION_REQUESTED",
        entityType: "Quote",
        entityId: b.quote.id,
        details: { clientId, reason, atPeriodEnd: true, automaticRefund: false },
      },
    });
    return b.quote.id;
  });
  try {
    await reconcileCancellation(rawId);
  } catch {
    /* La solicitud persistida permanece pendiente para conciliación del proveedor. */
  }
  return subscriptionControl(quoteId, clientId);
}

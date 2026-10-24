import "server-only";
import type { Prisma } from "@prisma/client";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { legacyViewId } from "@/lib/full-control/legacy-id";
import { normalizeQuoteMetaPayment } from "./quote-payments";
import {
  clientRecurringProjection,
  recurringAssignmentVisible,
  type RecurringCandidate,
} from "./client-recurring-projection";

/** Todas las consultas se restringen al propietario, también cuando las usa administración. */
export async function clientRecurringState(db: Prisma.TransactionClient, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return { recurring: [], archives: [] };
  const [native, canonical, plans, archives, lifecycle] = await Promise.all([
    db.quote.findMany({
      where: {
        OR: [{ userId }, { userId: null, email: { equals: user.email, mode: "insensitive" } }],
      },
    }),
    db.$queryRaw<
      Array<{
        id: string;
        quote_number: string;
        total_amount: number;
        currency: string;
        status: string;
        created_at: Date;
      }>
    >`SELECT q.id,q.quote_number,q.total_amount,q.currency,q.status,q.created_at FROM quotes q JOIN zyteron_legacy_client_link l ON l.client_id=q.client_id WHERE l.user_id=${userId} AND q.billing_type='SUBSCRIPTION' AND q.status IN ('SENT','NEGOTIATING','ACCEPTED','CONVERTED')`,
    db.$queryRaw<
      Array<{
        quote_id: string;
        label: string;
        amount: number;
        next_due: string;
        anchor_date: string;
        status: string;
        created_at: Date;
      }>
    >`SELECT quote_id,label,amount,next_due::text,anchor_date::text,status,created_at FROM zyteron_monthly_plans WHERE user_id=${userId}`,
    db.$queryRaw<
      Array<{ quote_id: string; native_quote_id: string | null; state: string }>
    >`SELECT a.quote_id,a.native_quote_id,a.state FROM zyteron_archived_quotes a JOIN zyteron_legacy_client_link l ON l.client_id=a.client_id WHERE l.user_id=${userId}`,
    db.$queryRaw<
      Array<{ quote_id: string; state: string; paid_through: Date | null }>
    >`SELECT quote_id,state,paid_through FROM zyteron_recurring_lifecycle WHERE client_id=${userId}`,
  ]);
  const candidates: RecurringCandidate[] = native.flatMap((q) => {
    const v = enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() });
    const p = normalizeQuoteMetaPayment(v.meta).payment;
    if (p?.billingType !== "SUBSCRIPTION" || p.enabled === false) return [];
    const state = (v.meta as typeof v.meta & { controlState?: string }).controlState;
    const viewId = legacyViewId("quote", q.id),
      plan = plans.find((p) => p.quote_id === viewId);
    const life = lifecycle.find((l) => l.quote_id === q.id);
    const flow = Boolean(p.subscription?.subscriptionId);
    return [
      {
        quoteId: q.id,
        quoteViewId: viewId,
        label: v.displayNumber,
        amount: plan?.amount || p.subscription?.amount || q.total,
        currency: "CLP",
        approved: recurringAssignmentVisible(q.status, state),
        closed:
          q.status === "LOST" ||
          ["CANCELLED", "DECLINED", "REJECTED", "EXPIRED"].includes(state || ""),
        state:
          plan?.status || (flow ? life?.state || p.subscription?.status || "PENDING" : "ASSIGNED"),
        managedBy: plan ? "MANUAL" : flow ? "FLOW" : "ASSIGNED",
        nextDate: plan?.next_due || (flow ? p.subscription?.nextInvoiceDate || null : null),
        activatedAt: plan?.created_at.toISOString() || p.subscription?.activatedAt || null,
        paidThrough: life?.paid_through?.toISOString() || p.subscription?.paidThrough || null,
        anchorDate: plan?.anchor_date || null,
      },
    ];
  });
  for (const q of canonical) {
    if (native.some((n) => legacyViewId("quote", n.id) === q.id)) continue;
    const plan = plans.find((p) => p.quote_id === q.id);
    candidates.push({
      quoteId: q.id,
      quoteViewId: q.id,
      label: q.quote_number,
      amount: plan?.amount || Number(q.total_amount),
      currency: q.currency.trim(),
      approved: true,
      closed: false,
      state: plan?.status || "ASSIGNED",
      managedBy: plan ? "MANUAL" : "ASSIGNED",
      nextDate: plan?.next_due || null,
      activatedAt: plan?.created_at.toISOString() || null,
      paidThrough: null,
      anchorDate: plan?.anchor_date || null,
    });
  }
  return { recurring: clientRecurringProjection(candidates, archives), archives };
}

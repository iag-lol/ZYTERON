import "server-only";
import type { Prisma } from "@prisma/client";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { legacyViewId } from "@/lib/full-control/legacy-id";
import { normalizeQuoteMetaPayment } from "./quote-payments";
import {
  financeRecurringProjection,
  type FinanceRecurringPlan,
} from "./finance-recurring-projection";
import { collectionAnchor } from "./collection-calendar";
import {
  clientRecurringProjection,
  recurringAssignmentVisible,
  type RecurringCandidate,
} from "./client-recurring-projection";

/** Todas las consultas se restringen al propietario, también cuando las usa administración. */
export async function clientRecurringState(db: Prisma.TransactionClient, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return { recurring: [], archives: [] };
  const [native, canonical, plans, archives, lifecycle, settings, finance] = await Promise.all([
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
    db.$queryRaw<
      Array<{ quote_id: string; first_date: string; charge_day: number }>
    >`SELECT quote_id,first_date::text,charge_day FROM zyteron_quote_collection_settings`,
    db.$queryRaw<
      FinanceRecurringPlan[]
    >`SELECT p.quote_id,q.quote_number AS label,p.amount,p.currency,p.start_date::text,p.payment_day,p.total_installments,p.status,
      coalesce((SELECT jsonb_agg(jsonb_build_object('sequence',i.sequence,'due',i.due_date::text,'amount',i.amount,'status',i.status) ORDER BY i.sequence)
      FROM quote_payment_installments i WHERE i.plan_id=p.id),'[]'::jsonb) AS installments
      FROM quote_payment_plans p JOIN quotes q ON q.id=p.quote_id WHERE p.frequency='MONTHLY'`,
  ]);
  const candidates: RecurringCandidate[] = native.flatMap((q) => {
    const v = enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() });
    const p = normalizeQuoteMetaPayment(v.meta).payment;
    if (!p) return [];
    const state = (v.meta as typeof v.meta & { controlState?: string }).controlState;
    if (!recurringAssignmentVisible(q.status, state, p)) return [];
    const viewId = legacyViewId("quote", q.id),
      plan = plans.find((p) => p.quote_id === viewId);
    const life = lifecycle.find((l) => l.quote_id === q.id);
    const schedule = settings.find((s) => s.quote_id === viewId);
    const flow = Boolean(p.subscription?.subscriptionId);
    return [
      {
        quoteId: q.id,
        quoteViewId: viewId,
        label: v.displayNumber,
        amount: plan?.amount || p.subscription?.amount || q.total,
        currency: "CLP",
        approved: true,
        closed:
          q.status === "LOST" ||
          ["CANCELLED", "DECLINED", "REJECTED", "EXPIRED"].includes(state || ""),
        state:
          plan?.status || (flow ? life?.state || p.subscription?.status || "PENDING" : "ASSIGNED"),
        managedBy: plan ? "MANUAL" : flow ? "FLOW" : "ASSIGNED",
        nextDate:
          plan?.next_due ||
          (flow ? p.subscription?.nextInvoiceDate || null : schedule?.first_date || null),
        activatedAt: plan?.created_at.toISOString() || p.subscription?.activatedAt || null,
        paidThrough: life?.paid_through?.toISOString() || p.subscription?.paidThrough || null,
        anchorDate: plan?.anchor_date || (schedule ? collectionAnchor(schedule.charge_day) : null),
      },
    ];
  });
  for (const q of canonical) {
    if (native.some((n) => legacyViewId("quote", n.id) === q.id)) continue;
    const plan = plans.find((p) => p.quote_id === q.id);
    const schedule = settings.find((s) => s.quote_id === q.id);
    const financePlan = finance.find((p) => p.quote_id === q.id);
    if (financePlan) {
      candidates.push({
        ...financeRecurringProjection(financePlan),
        approved: true,
        closed: false,
      });
      continue;
    }
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
      nextDate: plan?.next_due || schedule?.first_date || null,
      activatedAt: plan?.created_at.toISOString() || null,
      paidThrough: null,
      anchorDate: plan?.anchor_date || (schedule ? collectionAnchor(schedule.charge_day) : null),
    });
  }
  for (const plan of finance) {
    if (!candidates.some((p) => p.quoteViewId === plan.quote_id))
      candidates.push({ ...financeRecurringProjection(plan), approved: true, closed: false });
  }
  return { recurring: clientRecurringProjection(candidates, archives), archives };
}

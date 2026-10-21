import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nativeQuote } from "@/lib/full-control/quote-commercial";
import { legacyViewId } from "@/lib/full-control/legacy-id";
import { parseQuoteMessage } from "@/lib/admin/quote";
import { parseSiteBindings } from "./site-access-policy";
import { billingToday } from "./monthly-calendar";
import { suspensionDate } from "./collection-calendar";

export type CollectionSettings = {
  quote_id: string;
  first_date: string;
  charge_day: number;
  reminders_enabled: boolean;
  suspension_enabled: boolean;
  grace_days: number;
  revision: number;
};
export async function quoteBillingContext(db: Prisma.TransactionClient, id: string) {
  const native = await nativeQuote(db, id);
  if (native) {
    const m = parseQuoteMessage(native.message) as ReturnType<typeof parseQuoteMessage> & {
      controlState?: string;
    };
    return {
      nativeId: native.id,
      userId: native.userId,
      amount: native.total,
      label: m.quoteCode || m.quoteNumber || "Servicio mensual",
      monthly: m.payment?.billingType === "SUBSCRIPTION",
      accepted: native.status === "WON" || m.controlState === "ACCEPTED",
      closed:
        native.status === "LOST" ||
        ["CANCELLED", "DECLINED", "EXPIRED"].includes(m.controlState || ""),
      flow: !!(m.payment?.subscription?.subscriptionId || m.payment?.subscription?.registerToken),
      finance: false,
    };
  }
  const [q] = await db.$queryRaw<
    Array<{
      client_id: string;
      total_amount: number;
      currency: string;
      status: string;
      billing_type: string;
      quote_number: string;
    }>
  >`SELECT client_id,total_amount,currency,status,billing_type,quote_number FROM quotes WHERE id=${id}::uuid FOR UPDATE`;
  if (!q) throw Error("QUOTE_NOT_FOUND");
  const [link] = await db.$queryRaw<
    Array<{ user_id: string }>
  >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${q.client_id}::uuid`;
  const plans = await db.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM quote_payment_plans WHERE quote_id=${id}::uuid LIMIT 1`;
  return {
    nativeId: null,
    userId: link?.user_id || null,
    amount: Number(q.total_amount),
    label: q.quote_number,
    monthly: q.billing_type === "SUBSCRIPTION" && q.currency.trim() === "CLP",
    accepted: ["ACCEPTED", "CONVERTED"].includes(q.status),
    closed: ["CANCELLED", "DECLINED", "EXPIRED"].includes(q.status),
    flow: false,
    finance: !!plans.length,
  };
}
export async function collectionSettings(id: string) {
  const [row] = await prisma.$queryRaw<
    CollectionSettings[]
  >`SELECT quote_id,first_date::text,charge_day,reminders_enabled,suspension_enabled,grace_days,revision FROM zyteron_quote_collection_settings WHERE quote_id=${id}::uuid`;
  return row || null;
}
export function collectionBinding(id: string) {
  return (
    parseSiteBindings(process.env.PAYMENT_SITE_BINDINGS).find(
      (b) => legacyViewId("quote", b.quoteId) === id,
    )?.origin || null
  );
}
export async function collectionEligibility(id: string) {
  return prisma.$transaction(async (db) => {
    const c = await quoteBillingContext(db, id);
    return {
      canActivate: c.accepted && !!c.userId && c.monthly && !c.closed && !c.flow && !c.finance,
      managedBy: c.flow ? "FLOW" : c.finance ? "FINANCE" : "MANUAL",
      closed: c.closed,
      accepted: c.accepted,
      linked: !!c.userId,
      siteOrigin: collectionBinding(id),
    };
  });
}
export async function monthlyContinuity(id: string, now = new Date()) {
  const rows = await prisma.$queryRaw<
    Array<{
      due: Date;
      grace_days: number;
      balance: number;
      native_quote_id: string | null;
      native_status: string | null;
      native_message: string | null;
    }>
  >`
    SELECT r."dueAt" AS due,s.grace_days,p.native_quote_id,nq.status AS native_status,nq.message AS native_message,
    r."totalAmount"-COALESCE((SELECT sum(a.amount) FROM "PaymentAllocation" a JOIN "Payment" pay ON pay.id=a."paymentId" WHERE a."receivableId"=r.id AND pay.status='CONFIRMED' AND pay.currency=r.currency),0) AS balance
    FROM zyteron_quote_collection_settings s JOIN zyteron_monthly_plans p ON p.quote_id=s.quote_id
    LEFT JOIN "Quote" nq ON nq.id=p.native_quote_id AND nq."userId"=p.user_id
    JOIN "Receivable" r ON r.metadata->>'monthlyPlanId'=p.id::text AND r."clientId"=p.user_id AND r.currency='CLP'
    WHERE s.quote_id=${id}::uuid AND s.suspension_enabled AND p.status='ACTIVE' AND r.status NOT IN ('VOID','CANCELLED') AND r."dueAt" IS NOT NULL
    AND ((p.native_quote_id IS NOT NULL AND nq.id IS NOT NULL)
    OR (p.native_quote_id IS NULL AND EXISTS(SELECT 1 FROM quotes q JOIN zyteron_legacy_client_link l ON l.client_id=q.client_id WHERE q.id=p.quote_id AND l.user_id=p.user_id AND q.status IN ('ACCEPTED','CONVERTED') AND q.billing_type='SUBSCRIPTION')))
    ORDER BY r."dueAt"`;
  const unpaid = rows.find((r) => {
    if (Number(r.balance) <= 0) return false;
    if (!r.native_quote_id) return true;
    const m = parseQuoteMessage(r.native_message) as ReturnType<typeof parseQuoteMessage> & {
      controlState?: string;
    };
    return (
      r.native_status !== "LOST" &&
      !["CANCELLED", "DECLINED", "EXPIRED"].includes(m.controlState || "") &&
      (r.native_status === "WON" || m.controlState === "ACCEPTED") &&
      m.payment?.billingType === "SUBSCRIPTION" &&
      !m.payment?.subscription?.subscriptionId &&
      !m.payment?.subscription?.registerToken
    );
  });
  if (!unpaid) return { mode: "ACTIVE" as const, suspensionDate: null, balance: 0 };
  const date = suspensionDate(billingToday(unpaid.due), unpaid.grace_days);
  return {
    mode: billingToday(now) >= date ? ("MAINTENANCE" as const) : ("ACTIVE" as const),
    suspensionDate: date,
    balance: Number(unpaid.balance),
  };
}

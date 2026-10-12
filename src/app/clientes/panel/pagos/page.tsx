import { requirePortalSession } from "@/lib/auth/portal-session";
import { getScopedPortalDatabase } from "@/lib/portal/scoped-db";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";
import { PaymentCalendar } from "@/components/client-experience/payment-calendar";
import type { RecurringProjection } from "@/lib/payments/payment-projection";
export const dynamic = "force-dynamic";
export default async function ClientPaymentsPage() {
  const session = await requirePortalSession();
  const prisma = getScopedPortalDatabase(session.user.id);
  const [quotes, payments, lifecycle] = await Promise.all([
    prisma.quote.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { clientId: session.user.id, status: "CONFIRMED" },
      orderBy: { receivedAt: "desc" },
      select: { id: true, amount: true, receivedAt: true, provider: true },
    }),
    prisma.$queryRaw<
      Array<{ quote_id: string; state: string; paid_through: Date | null }>
    >`SELECT quote_id,state,paid_through FROM zyteron_recurring_lifecycle WHERE client_id=${session.user.id}`,
  ]);
  const subscriptions: RecurringProjection[] = quotes.flatMap((q) => {
    const v = enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() }),
      m = normalizeQuoteMetaPayment(v.meta),
      s = m.payment?.subscription;
    if (m.payment?.billingType !== "SUBSCRIPTION" || !s) return [];
    const life = lifecycle.find((l) => l.quote_id === q.id);
    return [
      {
        quoteId: q.id,
        label: v.displayNumber + " · suscripción mensual",
        amount: s.amount || q.total,
        nextDate: s.nextInvoiceDate || null,
        activatedAt: s.activatedAt || null,
        state: life?.state || s.status || "PENDING",
        paidThrough: life?.paid_through?.toISOString() || s.paidThrough || null,
      },
    ];
  });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  return (
    <PaymentCalendar
      subscriptions={subscriptions}
      payments={payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        date: p.receivedAt.toLocaleDateString("en-CA", { timeZone: "America/Santiago" }),
        receipt: p.provider === "FLOW",
      }))}
      currentYear={Number(today.slice(0, 4))}
      currentMonth={Number(today.slice(5, 7))}
    />
  );
}

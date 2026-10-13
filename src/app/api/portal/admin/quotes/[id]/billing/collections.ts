import "server-only";
import { prisma } from "@/lib/prisma";
import { legacyViewId } from "@/lib/full-control/legacy-id";
export async function websiteQuoteCollections(viewId: string) {
  const quote = (await prisma.quote.findMany({ select: { id: true } })).find(
    (q) => legacyViewId("quote", q.id) === viewId,
  );
  if (!quote) {
    const [canonical] = await prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM quotes WHERE id=${viewId}::uuid`;
    if (!canonical) return null;
    return prisma.$queryRaw<
      Array<{
        id: string;
        description: string;
        amount: number;
        currency: string;
        dueDate: string | null;
        paid: number;
        payments: { amount: number; receivedAt: string }[];
      }>
    >`
      SELECT i.id,COALESCE(i.description,i.invoice_number) AS description,i.total_amount::float8 AS amount,i.currency,
        i.due_date::text AS "dueDate",COALESCE(sum(a.amount),0)::float8 AS paid,
        COALESCE(jsonb_agg(jsonb_build_object('amount',a.amount,'receivedAt',p.received_at)) FILTER(WHERE a.id IS NOT NULL),'[]'::jsonb) AS payments
      FROM invoices i LEFT JOIN sales s ON s.id=i.sale_id LEFT JOIN projects pr ON pr.id=i.project_id
      LEFT JOIN payment_allocations a ON a.invoice_id=i.id AND a.reversed_at IS NULL AND EXISTS(SELECT 1 FROM payments pay WHERE pay.id=a.payment_id AND pay.status='CONFIRMED' AND pay.currency=i.currency)
      LEFT JOIN payments p ON p.id=a.payment_id
      WHERE COALESCE(s.quote_id,pr.quote_id)=${viewId}::uuid AND i.status NOT IN ('CANCELLED','VOID') GROUP BY i.id ORDER BY i.created_at DESC`;
  }
  const rows = await prisma.receivable.findMany({
    where: { quoteId: quote.id, status: { notIn: ["CANCELLED", "VOID"] } },
    orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      description: true,
      totalAmount: true,
      currency: true,
      dueAt: true,
      allocations: {
        where: { payment: { status: "CONFIRMED" } },
        select: { amount: true, payment: { select: { receivedAt: true } } },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.totalAmount,
    currency: r.currency,
    dueDate: r.dueAt?.toISOString() || null,
    paid: r.allocations.reduce((s, a) => s + a.amount, 0),
    payments: r.allocations.map((a) => ({
      amount: a.amount,
      receivedAt: a.payment.receivedAt.toISOString(),
    })),
  }));
}

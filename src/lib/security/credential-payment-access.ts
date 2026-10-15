import type { Prisma } from "@prisma/client";
import { decideCredentialPaymentAccess } from "./credential-payment-policy";
export async function credentialPaymentStates(
  db: Prisma.TransactionClient,
  userId: string,
  projectIds: Array<string | null>,
) {
  const [projects, debts, canonical] = await Promise.all([
    db.project.findMany({
      where: { id: { in: projectIds.filter((id): id is string => Boolean(id)) }, clientId: userId },
      select: {
        id: true,
        clientId: true,
        quoteId: true,
        saleId: true,
        totalCharge: true,
        quote: { select: { total: true } },
        sale: { select: { total: true } },
      },
    }),
    db.receivable.findMany({
      where: { clientId: userId, status: { notIn: ["VOID", "VOIDED", "CANCELLED", "CANCELED"] } },
      select: {
        clientId: true,
        projectId: true,
        quoteId: true,
        saleId: true,
        currency: true,
        totalAmount: true,
        allocations: {
          where: { payment: { status: "CONFIRMED", currency: "CLP", clientId: userId } },
          select: { amount: true },
        },
      },
    }),
    db.$queryRaw<Array<{ pending: boolean }>>`SELECT EXISTS(SELECT 1 FROM public.invoices i
      JOIN public.zyteron_legacy_client_link l ON l.client_id=i.client_id
      WHERE l.user_id=${userId} AND i.status::text IN ('ISSUED','PARTIALLY_PAID','OVERDUE') AND i.balance_due>0) AS pending`,
  ]);
  return new Map(
    projectIds.map((id) => [
      id,
      decideCredentialPaymentAccess({
        userId,
        project: projects.find((p) => p.id === id) || null,
        debts,
        canonicalPending: canonical[0]?.pending !== false,
      }),
    ]),
  );
}

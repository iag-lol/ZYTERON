import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { legacyViewId } from "@/lib/full-control/legacy-id";
export async function assertQuoteCollectionsOpen(
  quoteId: string,
  db: Prisma.TransactionClient = prisma,
) {
  const rows = await db.$queryRaw<
    Array<{ state: string }>
  >`SELECT state FROM zyteron_archived_quotes WHERE quote_id=${legacyViewId("quote", quoteId)}::uuid`;
  if (rows.length)
    throw Error(
      "Esta cotización fue retirada de cobro. Actualiza tu cuenta para consultar los cobros vigentes.",
    );
}

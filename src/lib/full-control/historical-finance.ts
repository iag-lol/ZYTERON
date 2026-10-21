import "server-only";
import { prisma } from "@/lib/prisma";
import { projectHistoricalReceivable } from "./historical-receivable";

export const historicalReceivableInclude = {
  client: { select: { company: true, name: true } },
  allocations: { include: { payment: { select: { status: true, currency: true } } } },
} as const;

export async function historicalReceivableDetail(viewId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(viewId)) return null;
  const matches = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM (SELECT id,encode(sha256(convert_to('zyteron:legacy-view:receivable:'||id,'UTF8')),'hex') h FROM "Receivable") r
    WHERE lower(CASE WHEN id ~* '^[0-9a-f-]{36}$' THEN id ELSE substr(h,1,8)||'-'||substr(h,9,4)||'-4'||substr(h,14,3)||'-a'||substr(h,18,3)||'-'||substr(h,21,12) END) = ${viewId.toLowerCase()} LIMIT 2`;
  if (matches.length !== 1) return null;
  const source = await prisma.receivable.findUnique({ where: { id: matches[0]!.id }, include: historicalReceivableInclude });
  if (!source) return null;
  const links = await prisma.$queryRaw<Array<{ client_id: string }>>`SELECT client_id FROM zyteron_legacy_client_link WHERE user_id=${source.clientId}`;
  return projectHistoricalReceivable(source, links[0]?.client_id || null, new Date());
}

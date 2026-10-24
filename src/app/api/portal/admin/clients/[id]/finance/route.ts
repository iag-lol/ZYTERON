import { NextResponse } from "next/server";
import { z } from "zod";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { prisma } from "@/lib/prisma";
import { getClientFinanceSummary } from "@/lib/admin/client-finance";
import { legacyViewId } from "@/lib/full-control/legacy-id";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
  try {
    const [link] = await prisma.$queryRaw<
      Array<{ user_id: string }>
    >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${parsed.data}::uuid`;
    const summary = link ? await getClientFinanceSummary(link.user_id) : null;
    return NextResponse.json(
      summary
        ? {
            userId: link.user_id,
            summary: {
              ...summary,
              receivables: summary.receivables.map((r) => ({
                ...r,
                quoteViewId: r.quoteId ? legacyViewId("quote", r.quoteId) : null,
              })),
            },
          }
        : { userId: null, summary: null },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No fue posible consultar los cobros del portal." },
      { status: 503 },
    );
  }
}

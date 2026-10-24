import { quoteArchiveWorkflow } from "@/lib/full-control/quote-archive-workflow";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { boundedJson } from "@/lib/security/public-intake";
import { archiveClientQuote } from "@/lib/full-control/quote-archive";
import {
  subscriptionControl,
  cancelAdminSubscription,
} from "@/lib/full-control/subscription-control";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const id = z.uuid().parse((await params).id),
      body = z
        .object({ clientId: z.uuid(), reason: z.string().trim().min(3).max(500) })
        .strict()
        .parse(await boundedJson(req, 2048));
    const result = await quoteArchiveWorkflow({
      control: () => subscriptionControl(id, body.clientId),
      requestCancellation: () =>
        cancelAdminSubscription(id, body.clientId, body.reason, auth.actorId ?? null, true),
      archiveState: async () => {
        const [row] = await prisma.$queryRaw<
          Array<{ state: string }>
        >`SELECT state FROM zyteron_archived_quotes WHERE quote_id=${id}::uuid`;
        return row?.state;
      },
      archive: () => archiveClientQuote(id, { ...body, actorId: auth.actorId ?? null }),
    });
    return NextResponse.json(result, {
      status: result.pending ? 202 : 200,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "No fue posible completar la eliminación. La solicitud conserva el historial; actualiza la ficha para revisar su estado.",
      },
      { status: 409 },
    );
  }
}

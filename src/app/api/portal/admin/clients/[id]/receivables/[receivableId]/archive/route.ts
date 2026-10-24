import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { boundedJson } from "@/lib/security/public-intake";
import { receivableArchiveChange } from "@/lib/full-control/receivable-archive";
import { legacyViewId } from "@/lib/full-control/legacy-id";
import { quoteArchiveWorkflow } from "@/lib/full-control/quote-archive-workflow";
import { archiveClientQuote } from "@/lib/full-control/quote-archive";
import {
  cancelAdminSubscription,
  subscriptionControl,
} from "@/lib/full-control/subscription-control";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; receivableId: string }> },
) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const { id, receivableId } = await params;
    z.uuid().parse(id);
    z.string().min(1).max(100).parse(receivableId);
    const body = z
      .object({
        operation: z.enum(["archive", "restore"]),
        reason: z.string().trim().min(5).max(500),
        expectedBalance: z.number().int().nonnegative(),
        stopRenewal: z.boolean().default(false),
      })
      .strict()
      .parse(await boundedJson(req, 2048));
    if (body.operation === "restore" && body.stopRenewal) throw Error("INVALID_OPERATION");
    const result = await prisma.$transaction(
      async (db) => {
        const [link] = await db.$queryRaw<
          Array<{ user_id: string }>
        >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${id}::uuid`;
        if (!link) throw Error("RECEIVABLE_NOT_FOUND");
        await db.$queryRaw`SELECT id FROM "Receivable" WHERE id=${receivableId} AND "clientId"=${link.user_id} FOR UPDATE`;
        const row = await db.receivable.findUnique({
          where: { id: receivableId },
          include: {
            allocations: { where: { payment: { status: "CONFIRMED" } }, select: { amount: true } },
          },
        });
        const change = receivableArchiveChange(row, link.user_id, body, auth.actorId ?? null);
        if (change) {
          await db.receivable.update({
            where: { id: receivableId },
            data: { ...change, metadata: change.metadata as Prisma.InputJsonValue },
          });
          if (body.operation === "archive")
            await db.$executeRaw`UPDATE zyteron_billing_notices SET state='SUPPRESSED' WHERE receivable_id=${receivableId} AND state='PENDING'`;
          await db.clientAuditLog.create({
            data: {
              actorId: auth.actorId ?? null,
              targetUserId: link.user_id,
              action:
                body.operation === "archive"
                  ? "CLIENT_RECEIVABLE_ARCHIVED"
                  : "CLIENT_RECEIVABLE_RESTORED",
              entityType: "Receivable",
              entityId: receivableId,
              details: {
                clientId: id,
                quoteId: row?.quoteId,
                reason: body.reason,
                previousStatus: row?.status,
                status: change.status,
                totalAmount: row?.totalAmount,
                paymentsPreserved: true,
                taxDocumentPreserved: true,
                stopRenewalRequested: body.stopRenewal,
              },
            },
          });
        }
        return { quoteId: row?.quoteId, changed: Boolean(change) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    let renewal: "unchanged" | "stopped" | "pending" | "failed" = "unchanged";
    if (body.stopRenewal && result.quoteId) {
      try {
        const quoteId = legacyViewId("quote", result.quoteId);
        const stopped = await quoteArchiveWorkflow({
          control: () => subscriptionControl(quoteId, id),
          requestCancellation: () =>
            cancelAdminSubscription(quoteId, id, body.reason, auth.actorId ?? null, true),
          archiveState: async () => {
            const [row] = await prisma.$queryRaw<
              Array<{ state: string }>
            >`SELECT state FROM zyteron_archived_quotes WHERE quote_id=${quoteId}::uuid`;
            return row?.state;
          },
          archive: () =>
            archiveClientQuote(quoteId, {
              clientId: id,
              reason: body.reason,
              actorId: auth.actorId ?? null,
            }),
        });
        renewal = stopped.pending ? "pending" : "stopped";
      } catch {
        renewal = "failed";
      }
    }
    return NextResponse.json(
      { ok: true, changed: result.changed, renewal },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error:
          code === "RECEIVABLE_CLOSED"
            ? "Este cobro ya está pagado o anulado. Actualiza la ficha para revisar su estado."
            : code === "RECEIVABLE_NOT_RESTORABLE"
              ? "Este cobro no corresponde a una eliminación recuperable desde esta ficha."
              : "El cobro cambió o no pertenece al cliente. Actualiza la ficha y vuelve a intentarlo.",
      },
      { status: 409 },
    );
  }
}

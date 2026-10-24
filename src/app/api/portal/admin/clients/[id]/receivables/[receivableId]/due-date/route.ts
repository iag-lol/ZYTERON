import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { boundedJson } from "@/lib/security/public-intake";
import { receivableDateChange } from "@/lib/full-control/receivable-date";

export async function PATCH(
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
        dueDate: z.iso.date().min(10).max(10),
        expectedDueAt: z.iso.datetime().nullable(),
        reason: z.string().trim().min(3).max(500),
      })
      .strict()
      .parse(await boundedJson(req, 2048));
    if (body.dueDate < "2000-01-01" || body.dueDate > "2100-01-01") throw Error("INVALID_DATE");
    await prisma.$transaction(async (db) => {
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
      const change = receivableDateChange(row, link.user_id, body);
      if (!change.changed) return;
      await db.receivable.update({ where: { id: receivableId }, data: { dueAt: change.date } });
      await db.$executeRaw`UPDATE zyteron_billing_notices SET state='SUPPRESSED' WHERE receivable_id=${receivableId} AND state='PENDING'`;
      await db.clientAuditLog.create({
        data: {
          actorId: auth.actorId ?? null,
          targetUserId: link.user_id,
          action: "RECEIVABLE_DUE_DATE_CHANGED",
          entityType: "Receivable",
          entityId: receivableId,
          details: {
            clientId: id,
            previousDueAt: row?.dueAt?.toISOString() ?? null,
            dueDate: body.dueDate,
            reason: body.reason,
          },
        },
      });
    });
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error: message.includes("CLOSED")
          ? "La cuenta está pagada o anulada; su vencimiento no se modifica."
          : "La cuenta cambió o no pertenece al cliente. Actualiza la ficha antes de reprogramar.",
      },
      { status: 409 },
    );
  }
}

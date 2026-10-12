import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { boundedJson, intakeFailure } from "@/lib/security/public-intake";
import { notifyQuotePaymentIfReady } from "@/lib/payments/quote-payment-workflow";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    entityType: z.enum(["QUOTE", "PROJECT", "SALE", "TAX_DOCUMENT", "CLIENT_REQUEST"]),
    entityId: z.string().trim().min(1),
  })
  .strict();

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: Context) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await boundedJson(req, 4096);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const client = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!client || client.role !== "CLIENT")
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

    await prisma.$transaction(async (db) => {
      const type = parsed.data.entityType;
      const table = {
        QUOTE: "Quote",
        PROJECT: "Project",
        SALE: "Sale",
        TAX_DOCUMENT: "TaxDocument",
        CLIENT_REQUEST: "ClientRequest",
      }[type];
      const column = type === "QUOTE" ? "userId" : "clientId";
      // Table/column come from the fixed enum above, never request text.
      const rows = await db.$queryRawUnsafe<Array<{ owner: string | null }>>(
        `SELECT "${column}" AS owner FROM "${table}" WHERE id=$1 FOR UPDATE`,
        parsed.data.entityId,
      );
      if (!rows[0]) throw new Error("ASSIGN_NOT_FOUND");
      if (rows[0].owner && rows[0].owner !== id) throw new Error("ASSIGN_ALREADY_OWNED");
      switch (type) {
        case "QUOTE":
          await db.quote.update({
            where: { id: parsed.data.entityId },
            data: { userId: id, email: client.email },
          });
          break;
        case "PROJECT":
          await db.project.update({ where: { id: parsed.data.entityId }, data: { clientId: id } });
          break;
        case "SALE":
          await db.sale.update({ where: { id: parsed.data.entityId }, data: { clientId: id } });
          break;
        case "TAX_DOCUMENT":
          await db.taxDocument.update({
            where: { id: parsed.data.entityId },
            data: { clientId: id },
          });
          break;
        case "CLIENT_REQUEST":
          await db.clientRequest.update({
            where: { id: parsed.data.entityId },
            data: { clientId: id },
          });
          break;
      }
      await db.clientAuditLog.create({
        data: {
          actorId: auth.legacy ? null : auth.session.user.id,
          targetUserId: id,
          action: "ADMIN_CLIENT_ASSIGN_ENTITY",
          entityType: type,
          entityId: parsed.data.entityId,
        },
      });
    });
    if (parsed.data.entityType === "QUOTE") await notifyQuotePaymentIfReady(parsed.data.entityId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ASSIGN_ALREADY_OWNED")
      return NextResponse.json(
        {
          error:
            "El registro ya pertenece a otro cliente. Requiere revisión antes de transferir su historial.",
        },
        { status: 409 },
      );
    if (error instanceof Error && error.message === "ASSIGN_NOT_FOUND")
      return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
    return intakeFailure(error);
  }
}

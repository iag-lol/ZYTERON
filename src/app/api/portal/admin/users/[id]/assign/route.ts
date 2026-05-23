import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  entityType: z.enum(["QUOTE", "PROJECT", "SALE", "TAX_DOCUMENT", "CLIENT_REQUEST"]),
  entityId: z.string().trim().min(1),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: Context) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
    }

    const client = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!client) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

    switch (parsed.data.entityType) {
      case "QUOTE":
        await prisma.quote.update({
          where: { id: parsed.data.entityId },
          data: { userId: id, email: client.email },
        });
        break;
      case "PROJECT":
        await prisma.project.update({
          where: { id: parsed.data.entityId },
          data: { clientId: id },
        });
        break;
      case "SALE":
        await prisma.sale.update({
          where: { id: parsed.data.entityId },
          data: { clientId: id },
        });
        break;
      case "TAX_DOCUMENT":
        await prisma.taxDocument.update({
          where: { id: parsed.data.entityId },
          data: { clientId: id },
        });
        break;
      case "CLIENT_REQUEST":
        await prisma.clientRequest.update({
          where: { id: parsed.data.entityId },
          data: { clientId: id },
        });
        break;
      default:
        break;
    }

    const actorId = auth.legacy ? null : auth.session.user.id;
    await logPortalAdminAction({
      actorId,
      targetUserId: id,
      action: "ADMIN_CLIENT_ASSIGN_ENTITY",
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo vincular el registro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

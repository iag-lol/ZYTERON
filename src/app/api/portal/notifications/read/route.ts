import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { getScopedPortalDatabase } from "@/lib/portal/scoped-db";
import { boundedJson } from "@/lib/security/public-intake";

const schema = z
  .object({
    ids: z.array(z.string().trim().min(1)).max(100).optional(),
    all: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const prisma = getScopedPortalDatabase(session.user.id);
  try {
    const body = await boundedJson(req, 16384).catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const where = parsed.data.all
      ? { userId: session.user.id, isRead: false }
      : { userId: session.user.id, id: { in: parsed.data.ids || [] } };

    const result = await prisma.clientNotification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    void error;
    const message = "No se pudieron actualizar notificaciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

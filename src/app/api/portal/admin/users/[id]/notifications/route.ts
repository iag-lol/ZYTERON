import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().min(2).max(3000),
  type: z.string().trim().max(40).optional().or(z.literal("")),
  link: z.string().trim().url().optional().or(z.literal("")),
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

    const client = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!client) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

    const notification = await prisma.clientNotification.create({
      data: {
        userId: id,
        title: parsed.data.title,
        body: parsed.data.body,
        type: parsed.data.type || "INFO",
        link: parsed.data.link || null,
      },
      select: { id: true },
    });

    const actorId = auth.legacy ? null : auth.session.user.id;
    await logPortalAdminAction({
      actorId,
      targetUserId: id,
      action: "ADMIN_CLIENT_NOTIFICATION_CREATE",
      entityType: "ClientNotification",
      entityId: notification.id,
    });

    return NextResponse.json({ ok: true, id: notification.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la notificación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { prisma } from "@/lib/prisma";
import { logPortalAdminAction } from "@/lib/portal/audit";

const sendNotificationSchema = z.object({
  userId: z.string().trim().min(1, "ID de cliente requerido."),
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres.")
    .max(140, "El título no puede superar 140 caracteres."),
  body: z
    .string()
    .trim()
    .min(5, "El contenido debe tener al menos 5 caracteres.")
    .max(2000, "El contenido no puede superar 2000 caracteres."),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ALERT"]).optional(),
  link: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = sendNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    // Verify the target user exists and is a client account.
    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, role: true },
    });
    if (!targetUser || targetUser.role !== Role.CLIENT) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    const notification = await prisma.clientNotification.create({
      data: {
        userId: parsed.data.userId,
        title: parsed.data.title,
        body: parsed.data.body,
        type: parsed.data.type || "INFO",
        link: parsed.data.link || null,
      },
    });

    // Audit log
    await logPortalAdminAction({
      actorId: auth.legacy ? null : auth.session.user.id,
      targetUserId: parsed.data.userId,
      action: "ADMIN_NOTIFICATION_SENT",
      entityType: "ClientNotification",
      entityId: notification.id,
      details: {
        title: parsed.data.title,
        type: parsed.data.type || "INFO",
      },
    });

    return NextResponse.json({
      ok: true,
      id: notification.id,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar la notificación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logPortalAdminAction } from "@/lib/portal/audit";

const ADMIN_COOKIE = "zyteron_admin_token";

function isAdminRequest(req: Request): boolean {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...rest] = c.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  return Boolean(cookies[ADMIN_COOKIE]);
}

const sendCommunicationSchema = z.object({
  userId: z.string().trim().min(1, "ID de cliente requerido."),
  subject: z
    .string()
    .trim()
    .min(3, "El asunto debe tener al menos 3 caracteres.")
    .max(140, "El asunto no puede superar 140 caracteres."),
  message: z
    .string()
    .trim()
    .min(5, "El mensaje debe tener al menos 5 caracteres.")
    .max(5000, "El mensaje no puede superar 5000 caracteres."),
  channel: z.enum(["PORTAL", "EMAIL", "WHATSAPP", "PHONE"]).optional(),
});

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = sendCommunicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    // Verify the target user exists and is a CLIENT
    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    const communication = await prisma.clientCommunication.create({
      data: {
        userId: parsed.data.userId,
        subject: parsed.data.subject,
        message: parsed.data.message,
        direction: "OUTBOUND",
        channel: parsed.data.channel || "PORTAL",
      },
    });

    // Auto-create notification for the client
    await prisma.clientNotification.create({
      data: {
        userId: parsed.data.userId,
        title: `Nuevo mensaje: ${parsed.data.subject}`,
        body: parsed.data.message.slice(0, 200),
        type: "INFO",
        link: "/portal-clientes/panel/comunicacion",
      },
    });

    // Audit log
    await logPortalAdminAction({
      actorId: null,
      targetUserId: parsed.data.userId,
      action: "ADMIN_COMMUNICATION_SENT",
      entityType: "ClientCommunication",
      entityId: communication.id,
      details: {
        subject: parsed.data.subject,
        channel: parsed.data.channel || "PORTAL",
      },
    });

    return NextResponse.json({
      ok: true,
      id: communication.id,
      createdAt: communication.createdAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar la comunicación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

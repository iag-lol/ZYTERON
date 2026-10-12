import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { sendAdminWhatsappNotification } from "@/lib/notifications/admin-whatsapp";
import { getScopedPortalDatabase } from "@/lib/portal/scoped-db";
import { boundedJson } from "@/lib/security/public-intake";

const createCommunicationSchema = z.object({
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
});

export async function GET() {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const prisma = getScopedPortalDatabase(session.user.id);
  try {
    const communications = await prisma.clientCommunication.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ communications });
  } catch (error) {
    void error;
    const message = "No se pudieron obtener las comunicaciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const prisma = getScopedPortalDatabase(session.user.id);
  try {
    const body = await boundedJson(req, 16384);
    const parsed = createCommunicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const communication = await prisma.$transaction(async (db) => {
      const communication = await db.clientCommunication.create({
        data: {
          userId: session.user.id,
          subject: parsed.data.subject,
          message: parsed.data.message,
          direction: "INBOUND",
          channel: "PORTAL",
        },
      });

      // Create audit log
      await db.clientAuditLog.create({
        select: { id: true },
        data: {
          actorId: session.user.id,
          targetUserId: session.user.id,
          action: "COMMUNICATION_SENT",
          entityType: "ClientCommunication",
          entityId: communication.id,
        },
      });

      return communication;
    });

    sendAdminWhatsappNotification(
      `📩 *Nuevo Mensaje de Cliente*\n\n👤 Cliente: ${session.user.name || session.user.email}\n📝 Asunto: ${parsed.data.subject}\n\nIngresa al panel admin para responder.`,
    ).catch((err) => console.error("Error sending admin WhatsApp on communication:", err));

    return NextResponse.json({
      ok: true,
      id: communication.id,
      createdAt: communication.createdAt.toISOString(),
    });
  } catch (error) {
    void error;
    const message = "No se pudo enviar el mensaje.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

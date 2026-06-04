import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { prisma } from "@/lib/prisma";

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

  try {
    const communications = await prisma.clientCommunication.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ communications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener las comunicaciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createCommunicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const communication = await prisma.clientCommunication.create({
      data: {
        userId: session.user.id,
        subject: parsed.data.subject,
        message: parsed.data.message,
        direction: "INBOUND",
        channel: "PORTAL",
      },
    });

    // Create audit log
    await prisma.clientAuditLog.create({
      data: {
        actorId: session.user.id,
        targetUserId: session.user.id,
        action: "COMMUNICATION_SENT",
        entityType: "ClientCommunication",
        entityId: communication.id,
      },
    });

    return NextResponse.json({
      ok: true,
      id: communication.id,
      createdAt: communication.createdAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { prisma } from "@/lib/prisma";

const messageSchema = z.object({
  message: z.string().trim().min(2).max(4000),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: Context) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
    }
    if (ticket.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const message = await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: session.user.id,
        authorRole: Role.CLIENT,
        message: parsed.data.message,
      },
      select: { id: true, createdAt: true },
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "WAITING_ADMIN", updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, id: message.id, createdAt: message.createdAt.toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el mensaje.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


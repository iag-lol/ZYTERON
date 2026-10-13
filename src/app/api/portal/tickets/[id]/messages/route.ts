import { replyToCanonicalTicket } from "@/lib/portal/canonical-publications";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { getScopedPortalDatabase } from "@/lib/portal/scoped-db";
import { boundedJson } from "@/lib/security/public-intake";

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

  const prisma = getScopedPortalDatabase(session.user.id);
  try {
    const { id } = await params;
    const body = await boundedJson(req, 16384);
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
      if (await replyToCanonicalTicket(session.user.id, id, parsed.data.message))
        return NextResponse.json({ ok: true });
      return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
    }
    if (ticket.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (["CLOSED", "RESOLVED"].includes(ticket.status)) {
      return NextResponse.json(
        { error: "Este ticket está cerrado. Abre una nueva solicitud." },
        { status: 409 },
      );
    }
    const message = await prisma.$transaction(async (db) => {
      const locked = await db.$queryRaw<
        Array<{ status: string }>
      >`SELECT status FROM "SupportTicket" WHERE id=${ticket.id} FOR UPDATE`;
      if (!locked[0] || ["CLOSED", "RESOLVED"].includes(locked[0].status))
        throw new Error("TICKET_CLOSED");
      const message = await db.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          userId: session.user.id,
          authorRole: Role.CLIENT,
          message: parsed.data.message,
        },
        select: { id: true, createdAt: true },
      });

      await db.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "WAITING_ADMIN", updatedAt: new Date() },
      });

      return message;
    });

    return NextResponse.json({
      ok: true,
      id: message.id,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TICKET_CLOSED")
      return NextResponse.json({ error: "Este ticket está cerrado." }, { status: 409 });
    const message = "No se pudo registrar el mensaje.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

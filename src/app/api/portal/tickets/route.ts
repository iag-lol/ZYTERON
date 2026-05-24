import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { prisma } from "@/lib/prisma";

const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, "El título debe tener al menos 4 caracteres.")
    .max(140, "El título no puede superar 140 caracteres."),
  description: z
    .string()
    .trim()
    .min(10, "El detalle debe tener al menos 10 caracteres.")
    .max(5000, "El detalle no puede superar 5000 caracteres."),
  category: z
    .string()
    .trim()
    .max(80, "La categoría no puede superar 80 caracteres.")
    .optional()
    .or(z.literal("")),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  projectId: z
    .string()
    .trim()
    .min(1, "El proyecto seleccionado no es válido.")
    .optional()
    .or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    if (parsed.data.projectId) {
      const ownsProject = await prisma.project.findFirst({
        where: { id: parsed.data.projectId, clientId: session.user.id },
        select: { id: true },
      });
      if (!ownsProject) {
        return NextResponse.json({ error: "Proyecto no válido para tu cuenta." }, { status: 403 });
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category || null,
        priority: parsed.data.priority || "NORMAL",
        projectId: parsed.data.projectId || null,
      },
      select: { id: true, createdAt: true },
    });

    await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: session.user.id,
        authorRole: Role.CLIENT,
        message: parsed.data.description,
      },
    });

    await prisma.clientAuditLog.create({
      data: {
        actorId: session.user.id,
        targetUserId: session.user.id,
        action: "SUPPORT_TICKET_CREATED",
        entityType: "SupportTicket",
        entityId: ticket.id,
      },
    });

    return NextResponse.json({ ok: true, id: ticket.id, createdAt: ticket.createdAt.toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el ticket.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

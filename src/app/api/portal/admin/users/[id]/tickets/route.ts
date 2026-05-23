import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().min(4).max(5000),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.string().trim().max(40).optional().or(z.literal("")),
  priority: z.string().trim().max(40).optional().or(z.literal("")),
  projectId: z.string().trim().optional().or(z.literal("")),
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
    const actorId = auth.legacy ? null : auth.session.user.id;

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: id,
        projectId: parsed.data.projectId || null,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category || null,
        status: parsed.data.status || "OPEN",
        priority: parsed.data.priority || "NORMAL",
        assignedToId: actorId,
      },
      select: { id: true },
    });

    await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: actorId,
        authorRole: Role.ADMIN,
        message: parsed.data.description,
        isInternal: false,
      },
    });

    await logPortalAdminAction({
      actorId,
      targetUserId: id,
      action: "ADMIN_CLIENT_TICKET_CREATE",
      entityType: "SupportTicket",
      entityId: ticket.id,
    });

    return NextResponse.json({ ok: true, id: ticket.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el ticket.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

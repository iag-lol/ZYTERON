import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(4).max(5000),
  direction: z.enum(["OUTBOUND", "INBOUND"]).optional(),
  channel: z.string().trim().max(40).optional().or(z.literal("")),
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

    const comm = await prisma.clientCommunication.create({
      data: {
        userId: id,
        subject: parsed.data.subject,
        message: parsed.data.message,
        direction: parsed.data.direction || "OUTBOUND",
        channel: parsed.data.channel || "PORTAL",
      },
      select: { id: true },
    });

    const actorId = auth.legacy ? null : auth.session.user.id;
    await logPortalAdminAction({
      actorId,
      targetUserId: id,
      action: "ADMIN_CLIENT_COMMUNICATION_CREATE",
      entityType: "ClientCommunication",
      entityId: comm.id,
    });

    return NextResponse.json({ ok: true, id: comm.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la comunicación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

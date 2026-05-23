import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { prisma } from "@/lib/prisma";

const createRequestSchema = z.object({
  type: z.enum(["NUEVA_WEB", "REDISENO", "SOPORTE", "INTEGRACION", "CAMBIOS", "COTIZACION"]),
  title: z.string().trim().min(4).max(140),
  details: z.string().trim().min(10).max(5000),
  attachmentUrl: z.string().trim().url().optional().or(z.literal("")),
  attachmentName: z.string().trim().max(140).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const item = await prisma.portalRequest.create({
      data: {
        userId: session.user.id,
        type: parsed.data.type,
        title: parsed.data.title,
        details: parsed.data.details,
        attachmentUrl: parsed.data.attachmentUrl || null,
        attachmentName: parsed.data.attachmentName || null,
        status: "PENDING",
      },
      select: { id: true, createdAt: true },
    });

    await prisma.clientAuditLog.create({
      data: {
        actorId: session.user.id,
        targetUserId: session.user.id,
        action: "PORTAL_REQUEST_CREATED",
        entityType: "PortalRequest",
        entityId: item.id,
      },
    });

    return NextResponse.json({ ok: true, id: item.id, createdAt: item.createdAt.toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la solicitud.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


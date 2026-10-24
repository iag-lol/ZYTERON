import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { portalRequestSchema, meetingRequestDetails } from "@/lib/portal/meeting-request";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { getScopedPortalDatabase } from "@/lib/portal/scoped-db";
import { boundedJson } from "@/lib/security/public-intake";

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const prisma = getScopedPortalDatabase(session.user.id);
  try {
    const body = await boundedJson(req, 16384);
    const parsed = portalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    let details: string;
    try {
      details = meetingRequestDetails(parsed.data);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Revisa la fecha." },
        { status: 400 },
      );
    }
    const item = await prisma.$transaction(async (db) => {
      if (parsed.data.requestId) {
        const existing = await db.portalRequest.findUnique({
          where: { id: parsed.data.requestId },
          select: {
            id: true,
            createdAt: true,
            userId: true,
            title: true,
            details: true,
            type: true,
          },
        });
        if (existing) {
          if (
            existing.userId !== session.user.id ||
            existing.title !== parsed.data.title ||
            existing.details !== details ||
            existing.type !== parsed.data.type
          )
            throw new Error("REQUEST_CONFLICT");
          return existing;
        }
      }
      const item = await db.portalRequest.create({
        data: {
          ...(parsed.data.requestId ? { id: parsed.data.requestId } : {}),
          userId: session.user.id,
          type: parsed.data.type,
          title: parsed.data.title,
          details,
          attachmentUrl: parsed.data.attachmentUrl || null,
          attachmentName: parsed.data.attachmentName || null,
          status: "PENDING",
        },
        select: { id: true, createdAt: true },
      });

      await db.clientAuditLog.create({
        select: { id: true },
        data: {
          actorId: session.user.id,
          targetUserId: session.user.id,
          action: "PORTAL_REQUEST_CREATED",
          entityType: "PortalRequest",
          entityId: item.id,
        },
      });

      return item;
    });

    return NextResponse.json({ ok: true, id: item.id, createdAt: item.createdAt.toISOString() });
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_CONFLICT")
      return NextResponse.json(
        { error: "La referencia de la solicitud ya se utilizó. Vuelve a abrir el formulario." },
        { status: 409 },
      );
    const message = "No se pudo crear la solicitud.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

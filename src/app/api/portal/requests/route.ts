import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { getScopedPortalDatabase } from "@/lib/portal/scoped-db";
import { boundedJson } from "@/lib/security/public-intake";

const createRequestSchema = z.object({
  type: z.enum(["NUEVA_WEB", "REDISENO", "SOPORTE", "INTEGRACION", "CAMBIOS", "COTIZACION"]),
  title: z.string().trim().min(4).max(140),
  details: z.string().trim().min(10).max(5000),
  attachmentUrl: z
    .string()
    .trim()
    .url()
    .refine((v) => {
      try {
        const u = new URL(v);
        return u.protocol === "https:" && !u.username && !u.password;
      } catch {
        return false;
      }
    }, "Usa un enlace HTTPS válido.")
    .optional()
    .or(z.literal("")),
  attachmentName: z.string().trim().max(140).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const prisma = getScopedPortalDatabase(session.user.id);
  try {
    const body = await boundedJson(req, 16384);
    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const item = await prisma.$transaction(async (db) => {
      const item = await db.portalRequest.create({
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
    void error;
    const message = "No se pudo crear la solicitud.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

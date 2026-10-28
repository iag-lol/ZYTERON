import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { randomUUID } from "node:crypto";
import { boundedJson, intakeFailure, withPublicSubmission } from "@/lib/security/public-intake";
const schema = z
  .object({
    requestId: z.string().uuid().optional(),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]),
    reply: z.string().trim().max(3000).default(""),
  })
  .strict();
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    if (id.length > 100)
      return NextResponse.json({ error: "Referencia inválida." }, { status: 400 });
    const parsed = schema.safeParse(await boundedJson(req, 16384));
    if (!parsed.success)
      return NextResponse.json({ error: "Revisa la actualización." }, { status: 400 });
    await withPublicSubmission(
      "admin-request/" + id,
      parsed.data.requestId || randomUUID(),
      parsed.data,
      async (db) => {
        const item = await db.portalRequest.findUnique({
          where: { id },
          select: { userId: true, title: true, status: true, type: true },
        });
        if (!item) throw new Error("REQUEST_NOT_FOUND");
        await db.portalRequest.update({ where: { id }, data: { status: parsed.data.status } });
        const communication = parsed.data.reply
          ? await db.clientCommunication.create({
              data: {
                userId: item.userId,
                subject: "Respuesta a tu solicitud: " + item.title,
                message: parsed.data.reply,
                direction: "OUTBOUND",
                channel: "PORTAL",
              },
            })
          : null;
        await db.clientNotification.create({
          data: {
            userId: item.userId,
            title: "Tu solicitud tiene una actualización",
            body: parsed.data.reply || item.title + " · " + parsed.data.status,
            link:
              item.type === "MEETING" ? "/clientes/panel/agenda" : "/clientes/panel/solicitudes",
          },
        });
        await db.clientAuditLog.create({
          data: {
            actorId: auth.legacy ? null : auth.session.user.id,
            targetUserId: item.userId,
            action: "ADMIN_REQUEST_UPDATED",
            entityType: "PortalRequest",
            entityId: id,
            details: communication ? { communicationId: communication.id } : undefined,
          },
        });
        return { ok: true };
      },
    );
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return intakeFailure(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { boundedJson } from "@/lib/security/public-intake";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
const inputSchema = z
  .object({
    projectId: z.string().trim().min(1).max(100),
    enabled: z.boolean(),
    reason: z.string().trim().min(20).max(1000),
    expectedEnabled: z.boolean(),
  })
  .strict();

export async function GET(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  const projects = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      enabled: boolean;
      reason: string | null;
    }>
  >`SELECT p.id,p.title,(a.id IS NOT NULL AND a.revoked_at IS NULL) AS enabled,a.reason
    FROM public."Project" p JOIN public."User" u ON u.id=p."clientId"
    LEFT JOIN public.zyteron_credential_delivery_authorizations a ON a.project_id=p.id AND a.user_id=u.id
    WHERE u.id=${id} AND u.role='CLIENT' ORDER BY p.title`;
  return NextResponse.json({ projects }, { headers: { "Cache-Control": "private,no-store" } });
}

export async function PUT(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  const parsed = inputSchema.safeParse(await boundedJson(req, 4096));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Indica el proyecto y un motivo de al menos 20 caracteres." },
      { status: 400 },
    );
  const { id: userId } = await params;
  const { projectId, enabled, reason, expectedEnabled } = parsed.data;
  try {
    await prisma.$transaction(async (db) => {
      const projects = await db.$queryRaw<Array<{ id: string }>>`
        SELECT p.id FROM public."Project" p JOIN public."User" u ON u.id=p."clientId"
        WHERE p.id=${projectId} AND u.id=${userId} AND u.role='CLIENT' FOR UPDATE OF p`;
      if (!projects.length) throw Error("NOT_FOUND");
      const existing = await db.$queryRaw<Array<{ revoked_at: Date | null }>>`
        SELECT revoked_at FROM public.zyteron_credential_delivery_authorizations
        WHERE user_id=${userId} AND project_id=${projectId} FOR UPDATE`;
      if (Boolean(existing[0] && existing[0].revoked_at === null) !== expectedEnabled)
        throw Error("STALE");
      if (enabled) {
        await db.$executeRaw`INSERT INTO public.zyteron_credential_delivery_authorizations(user_id,project_id,reason,authorized_by)
          VALUES(${userId},${projectId},${reason},${auth.actorId || "Administración Zyteron"})
          ON CONFLICT(user_id,project_id) DO UPDATE SET reason=excluded.reason,authorized_by=excluded.authorized_by,
          authorized_at=now(),revoked_at=NULL`;
      } else {
        await db.$executeRaw`UPDATE public.zyteron_credential_delivery_authorizations SET revoked_at=now()
          WHERE user_id=${userId} AND project_id=${projectId} AND revoked_at IS NULL`;
      }
      await db.clientAuditLog.create({
        data: {
          actorId: auth.actorId,
          targetUserId: userId,
          action: enabled ? "CREDENTIAL_DELIVERY_AUTHORIZED" : "CREDENTIAL_DELIVERY_REVOKED",
          entityType: "Project",
          entityId: projectId,
          details: { reason, financialSettlement: false, identityVerificationRequired: true },
        },
      });
    });
    return NextResponse.json({ ok: true, enabled });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error:
          code === "NOT_FOUND"
            ? "El proyecto no pertenece a esta cuenta."
            : code === "STALE"
              ? "La autorización cambió. Actualiza el panel antes de guardar."
              : "No se pudo guardar la autorización.",
      },
      { status: code === "NOT_FOUND" ? 404 : code === "STALE" ? 409 : 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { boundedJson } from "@/lib/security/public-intake";
type Context = { params: Promise<{ id: string }> };
async function authority(context: Context) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return { error: auth.error };
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success)
    return { error: NextResponse.json({ error: "Contrato inválido." }, { status: 400 }) };
  return { id, actorId: auth.legacy ? null : auth.session.user.id };
}
export async function GET(_req: Request, context: Context) {
  const a = await authority(context);
  if (a.error) return a.error;
  const rows = await prisma.$queryRaw<
    Array<{
      portal_visible: boolean;
      portal_review_visible: boolean;
      approval_status: string;
      frozen_at: Date | null;
      status: string;
    }>
  >`SELECT portal_visible,portal_review_visible,approval_status,frozen_at,status FROM public.client_contracts WHERE id=${a.id}::uuid AND archived_at IS NULL`;
  if (!rows[0]) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  return NextResponse.json(rows[0], { headers: { "cache-control": "no-store" } });
}
export async function PATCH(req: Request, context: Context) {
  const a = await authority(context);
  if (a.error) return a.error;
  try {
    const p = z
      .union([
        z.object({ published: z.boolean() }).strict(),
        z.object({ reviewPublished: z.boolean() }).strict(),
      ])
      .safeParse(await boundedJson(req, 4096));
    if (!p.success) return NextResponse.json({ error: "Publicación inválida." }, { status: 400 });
    const result = await prisma.$transaction(async (db) => {
      const rows =
        "reviewPublished" in p.data
          ? await db.$queryRaw<Array<{ portal_review_visible: boolean }>>`
          UPDATE public.client_contracts SET portal_review_visible=${p.data.reviewPublished},updated_at=now()
          WHERE id=${a.id}::uuid AND archived_at IS NULL AND
          (NOT ${p.data.reviewPublished} OR (status IN ('DRAFT','IN_REVIEW') AND frozen_at IS NULL)) RETURNING portal_review_visible`
          : await db.$queryRaw<Array<{ portal_visible: boolean }>>`
          UPDATE public.client_contracts SET portal_visible=${p.data.published},updated_at=now()
          WHERE id=${a.id}::uuid AND archived_at IS NULL AND
          (NOT ${p.data.published} OR (approval_status='APPROVED' AND frozen_at IS NOT NULL)) RETURNING portal_visible`;
      if (!rows[0]) return null;
      await db.clientAuditLog.create({
        data: {
          actorId: a.actorId,
          action: "CONTRACT_PORTAL_PUBLICATION_CHANGED",
          entityType: "ClientContract",
          entityId: a.id,
          details: p.data,
        },
      });
      return rows[0];
    });
    if (!result)
      return NextResponse.json(
        { error: "El contrato cambió de estado. Actualiza la ficha antes de publicar." },
        { status: 409 },
      );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la publicación." }, { status: 500 });
  }
}

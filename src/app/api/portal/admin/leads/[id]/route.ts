import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return NextResponse.json({ error: "Lead inválido." }, { status: 400 });
  try {
    const found = await prisma.$transaction(async (db) => {
      const rows = await db.$queryRaw<
        Array<{ id: string }>
      >`UPDATE public.leads SET archived_at=coalesce(archived_at,now()),updated_at=now() WHERE id=${parsed.data}::uuid RETURNING id`;
      if (!rows.length) return false;
      await db.clientAuditLog.create({
        data: {
          actorId: auth.actorId ?? null,
          action: "LEAD_ARCHIVED",
          entityType: "Lead",
          entityId: parsed.data,
        },
      });
      return true;
    });
    return NextResponse.json(found ? { ok: true } : { error: "Lead no encontrado." }, {
      status: found ? 200 : 404,
    });
  } catch {
    return NextResponse.json({ error: "No fue posible eliminar el lead." }, { status: 503 });
  }
}

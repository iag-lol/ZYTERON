import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().trim().min(2).max(80),
  fileUrl: z.string().trim().url(),
  fileName: z.string().trim().max(180).optional().or(z.literal("")),
  mimeType: z.string().trim().max(120).optional().or(z.literal("")),
  fileSize: z.number().int().nonnegative().optional(),
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

    const doc = await prisma.clientDocument.create({
      data: {
        userId: id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category,
        fileUrl: parsed.data.fileUrl,
        fileName: parsed.data.fileName || null,
        mimeType: parsed.data.mimeType || null,
        fileSize: parsed.data.fileSize,
        uploadedById: actorId,
      },
      select: { id: true },
    });

    await logPortalAdminAction({
      actorId,
      targetUserId: id,
      action: "ADMIN_CLIENT_DOCUMENT_CREATE",
      entityType: "ClientDocument",
      entityId: doc.id,
      details: { title: parsed.data.title, category: parsed.data.category },
    });

    return NextResponse.json({ ok: true, id: doc.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

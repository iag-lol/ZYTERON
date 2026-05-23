import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/secret-crypto";

const schema = z.object({
  serviceName: z.string().trim().min(2).max(140),
  username: z.string().trim().max(140).optional().or(z.literal("")),
  secret: z.string().trim().max(4000).optional().or(z.literal("")),
  url: z.string().trim().url().optional().or(z.literal("")),
  notes: z.string().trim().max(3000).optional().or(z.literal("")),
  projectId: z.string().trim().optional().or(z.literal("")),
  isSensitive: z.boolean().optional(),
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

    let encryption: ReturnType<typeof encryptSecret> | null = null;
    if (parsed.data.secret) {
      encryption = encryptSecret(parsed.data.secret);
    }

    const credential = await prisma.clientCredential.create({
      data: {
        userId: id,
        projectId: parsed.data.projectId || null,
        serviceName: parsed.data.serviceName,
        username: parsed.data.username || null,
        secretCiphertext: encryption?.ciphertext || null,
        secretIv: encryption?.iv || null,
        secretTag: encryption?.tag || null,
        url: parsed.data.url || null,
        notes: parsed.data.notes || null,
        isSensitive: parsed.data.isSensitive ?? true,
        createdById: actorId,
        updatedById: actorId,
      },
      select: { id: true },
    });

    await logPortalAdminAction({
      actorId,
      targetUserId: id,
      action: "ADMIN_CLIENT_CREDENTIAL_CREATE",
      entityType: "ClientCredential",
      entityId: credential.id,
      details: { serviceName: parsed.data.serviceName, projectId: parsed.data.projectId || null },
    });

    return NextResponse.json({ ok: true, id: credential.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la credencial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-crypto";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Context) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const credential = await prisma.clientCredential.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        secretCiphertext: true,
        secretIv: true,
        secretTag: true,
      },
    });
    if (!credential) {
      return NextResponse.json({ error: "Credencial no encontrada." }, { status: 404 });
    }

    const isAdmin = session.user.role === Role.ADMIN || session.user.role === Role.SUPERADMIN;
    if (!isAdmin && credential.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const secret = decryptSecret({
      ciphertext: credential.secretCiphertext,
      iv: credential.secretIv,
      tag: credential.secretTag,
    });
    if (!secret) {
      return NextResponse.json({ error: "No hay secreto guardado." }, { status: 404 });
    }

    await logPortalAdminAction({
      actorId: session.user.id,
      targetUserId: credential.userId,
      action: "CREDENTIAL_REVEAL",
      entityType: "ClientCredential",
      entityId: credential.id,
    });

    return NextResponse.json({ ok: true, secret });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo mostrar la credencial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


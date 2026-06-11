import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { compare } from "bcrypt";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-crypto";

type Context = {
  params: Promise<{ id: string }>;
};

const schema = z.object({
  password: z.string().min(1, "La contraseña es requerida."),
  code: z.string().length(6, "El código debe tener 6 dígitos."),
});

export async function POST(req: Request, { params }: Context) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 }
      );
    }

    const { password, code } = parsed.data;

    // Obtener la credencial
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
    
    // Si no es admin, solo puede revelar sus propias credenciales
    if (!isAdmin && credential.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    // Verificar contraseña del usuario actual
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, authProvider: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (user.authProvider !== "CREDENTIALS" || !user.passwordHash) {
      return NextResponse.json(
        { error: "No puedes usar esta función con autenticación de Google u otro proveedor por ahora." },
        { status: 400 }
      );
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }

    // Verificar Código 2FA
    const unconsumedCodes = await prisma.credentialRevealCode.findMany({
      where: {
        userId: session.user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    let matchedCodeId: string | null = null;
    let anyAttemptIncremented = false;

    for (const record of unconsumedCodes) {
      if (record.attempts >= 5) continue;
      
      const isValid = await compare(code, record.codeHash);
      if (isValid) {
        matchedCodeId = record.id;
        break;
      } else {
        await prisma.credentialRevealCode.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        });
        anyAttemptIncremented = true;
      }
    }

    if (!matchedCodeId) {
      return NextResponse.json(
        { error: "Código de verificación incorrecto o expirado." },
        { status: 401 }
      );
    }

    // Marcar código como consumido
    await prisma.credentialRevealCode.update({
      where: { id: matchedCodeId },
      data: { consumedAt: new Date() },
    });

    // Desencriptar el secreto
    const secret = decryptSecret({
      ciphertext: credential.secretCiphertext,
      iv: credential.secretIv,
      tag: credential.secretTag,
    });

    if (!secret) {
      return NextResponse.json({ error: "No hay secreto guardado o no se pudo desencriptar." }, { status: 404 });
    }

    // Auditoría
    await logPortalAdminAction({
      actorId: session.user.id,
      targetUserId: credential.userId,
      action: "CREDENTIAL_REVEAL",
      entityType: "ClientCredential",
      entityId: credential.id,
    });

    return NextResponse.json({ ok: true, secret });
  } catch (error) {
    console.error("[reveal-error]", error);
    const message = error instanceof Error ? error.message : "No se pudo mostrar la credencial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

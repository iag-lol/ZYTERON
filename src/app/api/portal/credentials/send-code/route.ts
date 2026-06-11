import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcrypt";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { prisma } from "@/lib/prisma";
import { sendPortalCredentialRevealCodeEmail } from "@/lib/notifications/portal-email";
import crypto from "crypto";

const schema = z.object({
  credentialId: z.string().min(1, "ID de credencial requerido"),
});

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { credentialId } = parsed.data;

    // Verificar que la credencial pertenezca al usuario
    const credential = await prisma.clientCredential.findUnique({
      where: { id: credentialId },
      select: { userId: true, serviceName: true },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credencial no encontrada." }, { status: 404 });
    }
    if (credential.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    // Verificar si el usuario tiene correo (algunos OAuth podrían no tener si falló algo)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, fullName: true },
    });

    if (!user?.email) {
      return NextResponse.json({ error: "Usuario sin correo registrado." }, { status: 400 });
    }

    // Rate Limiting preventivo (ej. máximo 5 envíos en los últimos 15 min)
    const recentCodes = await prisma.credentialRevealCode.count({
      where: {
        userId: session.user.id,
        lastSentAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    if (recentCodes >= 5) {
      return NextResponse.json(
        { error: "Has solicitado demasiados códigos. Intenta más tarde." },
        { status: 429 }
      );
    }

    // Generate 6 digit code
    const rawCode = crypto.randomInt(100000, 999999).toString();
    const codeHash = await hash(rawCode, 10);
    const expiresMinutes = 10;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    // Save to DB
    await prisma.credentialRevealCode.create({
      data: {
        userId: session.user.id,
        codeHash,
        expiresAt,
      },
    });

    // Send email
    const emailResult = await sendPortalCredentialRevealCodeEmail({
      to: user.email,
      fullName: user.fullName,
      code: rawCode,
      serviceName: credential.serviceName,
      expiresMinutes,
    });

    if (!emailResult.sent) {
      return NextResponse.json(
        { error: "No se pudo enviar el correo con el código." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Código enviado correctamente." });
  } catch (error) {
    console.error("[send-code error]", error);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}

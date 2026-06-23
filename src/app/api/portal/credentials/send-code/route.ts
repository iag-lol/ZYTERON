import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { prisma } from "@/lib/prisma";
import { sendPortalCredentialRevealCodeEmail } from "@/lib/notifications/portal-email";
import { createEmailVerificationCode } from "@/lib/auth/portal-codes";

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

    // Verificar si el usuario tiene correo
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      return NextResponse.json({ error: "Usuario sin correo registrado." }, { status: 400 });
    }

    // Generar código usando el mismo sistema del login (EmailVerificationCode)
    // Esto ya incluye rate limiting preventivo y creación en DB.
    let code: string;
    let expiresMinutes: number;
    try {
      const result = await createEmailVerificationCode({
        userId: session.user.id,
        email: user.email,
      });
      code = result.code;
      expiresMinutes = result.expiresMinutes;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "No se pudo generar el código.";
      return NextResponse.json({ error: errorMessage }, { status: 429 });
    }

    // Send email
    const emailResult = await sendPortalCredentialRevealCodeEmail({
      to: user.email,
      fullName: user.name,
      code: code,
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

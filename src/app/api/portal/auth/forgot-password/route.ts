import { NextResponse } from "next/server";
import { createPasswordResetCode } from "@/lib/auth/portal-codes";
import { forgotPasswordSchema, normalizeEmail } from "@/lib/auth/portal-validators";
import { sendPortalPasswordResetCodeEmail } from "@/lib/notifications/portal-email";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, accountStatus: true },
    });
    if (!user) {
      return NextResponse.json({
        ok: true,
        message: "Si el correo existe, enviaremos instrucciones de recuperación.",
      });
    }

    const { code, expiresMinutes } = await createPasswordResetCode({
      userId: user.id,
      email: user.email,
    });
    await sendPortalPasswordResetCodeEmail({
      to: user.email,
      fullName: user.name,
      code,
      expiresMinutes,
    });

    return NextResponse.json({
      ok: true,
      message: "Si el correo existe, enviaremos instrucciones de recuperación.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la solicitud.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


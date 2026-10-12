import { boundedJson, publicRateLimit, portalAuthFailure } from "@/lib/security/public-intake";
import { NextResponse } from "next/server";
import { createPasswordResetCode } from "@/lib/auth/portal-codes";
import { forgotPasswordSchema, normalizeEmail } from "@/lib/auth/portal-validators";
import { sendPortalPasswordResetCodeEmail } from "@/lib/notifications/portal-email";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rate = await publicRateLimit(req, "auth-forgot-password", 6);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de volver a intentar." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const body = await boundedJson(req, 4096);
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
    const mail = await sendPortalPasswordResetCodeEmail({
      to: user.email,
      fullName: user.name,
      code,
      expiresMinutes,
    });
    if (!mail.sent) throw new Error("RECOVERY_EMAIL_UNAVAILABLE");

    return NextResponse.json({
      ok: true,
      message: "Si el correo existe, enviaremos instrucciones de recuperación.",
    });
  } catch (error) {
    return portalAuthFailure(error);
  }
}

import { boundedJson, publicRateLimit, portalAuthFailure } from "@/lib/security/public-intake";
import { NextResponse } from "next/server";
import { createEmailVerificationCode } from "@/lib/auth/portal-codes";
import { normalizeEmail, resendCodeSchema } from "@/lib/auth/portal-validators";
import { sendPortalVerificationCodeEmail } from "@/lib/notifications/portal-email";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rate = await publicRateLimit(req, "auth-resend-code", 6);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de volver a intentar." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const body = await boundedJson(req, 4096);
    const parsed = resendCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, emailVerifiedAt: true },
    });
    if (!user) {
      return NextResponse.json({ error: "No existe una cuenta con ese correo." }, { status: 404 });
    }
    if (user.emailVerifiedAt) {
      return NextResponse.json({ error: "El correo ya está verificado." }, { status: 400 });
    }

    const { code, expiresMinutes } = await createEmailVerificationCode({
      userId: user.id,
      email: user.email,
    });

    const mail = await sendPortalVerificationCodeEmail({
      to: user.email,
      fullName: user.name,
      code,
      expiresMinutes,
    });
    if (!mail.sent) {
      return NextResponse.json(
        { error: "No se pudo reenviar el código en este momento." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, message: "Código reenviado correctamente." });
  } catch (error) {
    return portalAuthFailure(error);
  }
}

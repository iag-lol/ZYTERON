import { boundedJson, publicRateLimit, portalAuthFailure } from "@/lib/security/public-intake";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { AccountStatus, AuthProvider, Role } from "@prisma/client";
import { createEmailVerificationCode } from "@/lib/auth/portal-codes";
import { normalizeEmail, registerSchema } from "@/lib/auth/portal-validators";
import { sendPortalVerificationCodeEmail } from "@/lib/notifications/portal-email";
import { sendAdminWhatsappNotification } from "@/lib/notifications/admin-whatsapp";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rate = await publicRateLimit(req, "auth-register", 6);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de volver a intentar." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const body = await boundedJson(req, 4096);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true, accountStatus: true, role: true },
    });

    if (existing?.emailVerifiedAt) {
      return NextResponse.json(
        {
          error: "Este correo ya está registrado. Inicia sesión o usa recuperación de contraseña.",
        },
        { status: 409 },
      );
    }

    const publicSignup = process.env.PORTAL_PUBLIC_SIGNUP_ENABLED === "true";
    if (
      (!existing && !publicSignup) ||
      (existing &&
        (existing.role !== Role.CLIENT || existing.accountStatus === AccountStatus.DISABLED))
    )
      return NextResponse.json(
        { error: "Solicita a Zyteron la habilitación de tu cuenta antes de activarla." },
        { status: 403 },
      );
    const passwordHash = await hash(parsed.data.password, 12);
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            email,
            name: fullName,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            company: parsed.data.company,
            passwordHash,
            sessionVersion: { increment: 1 },
            role: Role.CLIENT,
            authProvider: AuthProvider.LOCAL,
            accountStatus: AccountStatus.PENDING,
          },
          select: { id: true, email: true, name: true },
        })
      : await prisma.user.create({
          data: {
            email,
            name: fullName,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            company: parsed.data.company,
            passwordHash,
            role: Role.CLIENT,
            authProvider: AuthProvider.LOCAL,
            accountStatus: AccountStatus.PENDING,
          },
          select: { id: true, email: true, name: true },
        });

    const { code, expiresMinutes } = await createEmailVerificationCode({
      userId: user.id,
      email: user.email,
    });

    const emailResult = await sendPortalVerificationCodeEmail({
      to: user.email,
      fullName: user.name,
      code,
      expiresMinutes,
    });
    if (!emailResult.sent) {
      return NextResponse.json(
        {
          ok: true,
          email: user.email,
          warning:
            "La cuenta fue creada, pero no se pudo enviar el código de verificación. Usa 'Reenviar código' en la pantalla de verificación.",
        },
        { status: 200 },
      );
    }

    sendAdminWhatsappNotification(
      `🔔 *Nuevo Registro en Zyteron*\n\n👤 Cliente: ${user.name}\n🏢 Empresa: ${parsed.data.company || "No especificada"}\n📧 Correo: ${user.email}`,
    ).catch((err) => console.error("Error sending admin WhatsApp on register:", err));

    return NextResponse.json({
      ok: true,
      message: "Cuenta creada. Revisa tu correo e ingresa el código de verificación.",
      email: user.email,
    });
  } catch (error) {
    return portalAuthFailure(error);
  }
}

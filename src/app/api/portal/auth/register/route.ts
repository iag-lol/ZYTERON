import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { AccountStatus, AuthProvider, Role } from "@prisma/client";
import { createEmailVerificationCode } from "@/lib/auth/portal-codes";
import { normalizeEmail, registerSchema } from "@/lib/auth/portal-validators";
import { sendPortalVerificationCodeEmail } from "@/lib/notifications/portal-email";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
    const passwordHash = await hash(parsed.data.password, 12);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true, accountStatus: true },
    });

    if (existing?.emailVerifiedAt) {
      return NextResponse.json(
        {
          error:
            "Este correo ya está registrado. Inicia sesión o usa recuperación de contraseña.",
        },
        { status: 409 },
      );
    }

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
          error:
            "La cuenta fue creada, pero no se pudo enviar el código de verificación. Intenta reenviar el código.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Cuenta creada. Revisa tu correo e ingresa el código de verificación.",
      email: user.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar el registro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


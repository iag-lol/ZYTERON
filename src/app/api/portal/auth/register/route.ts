import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { AccountStatus, AuthProvider, Role } from "@prisma/client";
import { createEmailVerificationCode } from "@/lib/auth/portal-codes";
import { normalizeEmail, registerSchema } from "@/lib/auth/portal-validators";
import { sendPortalVerificationCodeEmail } from "@/lib/notifications/portal-email";
import { sendAdminWhatsappNotification } from "@/lib/notifications/admin-whatsapp";
import { prisma } from "@/lib/prisma";

function getPrismaErrorCode(error: unknown) {
  if (typeof error !== "object" || !error || !("code" in error)) return "";
  return String((error as { code?: string }).code || "");
}

function isSchemaOutOfSyncPrismaError(error: unknown) {
  const code = getPrismaErrorCode(error);
  if (code === "P2021" || code === "P2022") return true;
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("Invalid `prisma.") &&
    (message.includes("does not exist in the current database") || message.includes("column"))
  );
}

function isDbConnectionPrismaError(error: unknown) {
  const code = getPrismaErrorCode(error);
  if (code === "P1000" || code === "P1001" || code === "P1002") return true;
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("DATABASE_URL") ||
    message.includes("Can't reach database server") ||
    message.includes("connect ECONNREFUSED") ||
    message.includes("timeout") ||
    message.includes("Falta DATABASE_URL")
  );
}

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
          ok: true,
          email: user.email,
          warning:
            "La cuenta fue creada, pero no se pudo enviar el código de verificación. Usa 'Reenviar código' en la pantalla de verificación.",
        },
        { status: 200 },
      );
    }

    sendAdminWhatsappNotification(
      `🔔 *Nuevo Registro en Zyteron*\n\n👤 Cliente: ${user.name}\n🏢 Empresa: ${parsed.data.company || "No especificada"}\n📧 Correo: ${user.email}`
    ).catch(err => console.error("Error sending admin WhatsApp on register:", err));

    return NextResponse.json({
      ok: true,
      message: "Cuenta creada. Revisa tu correo e ingresa el código de verificación.",
      email: user.email,
    });
  } catch (error) {
    if (isDbConnectionPrismaError(error)) {
      console.error(
        "[portal/register] Conexión a base de datos fallida. Verifica DATABASE_URL en Render.",
        error,
      );
      return NextResponse.json(
        {
          error:
            "No se pudo conectar con la base de datos del portal. Verifica DATABASE_URL del entorno de producción.",
        },
        { status: 500 },
      );
    }
    if (isSchemaOutOfSyncPrismaError(error)) {
      console.error(
        "[portal/register] Esquema desalineado en base de datos. Ejecuta portal_setup_all_in_one.sql.",
        error,
      );
      return NextResponse.json(
        {
          error:
            "La base de datos del portal no está completamente actualizada. Ejecuta el SQL de portal y vuelve a intentar.",
        },
        { status: 500 },
      );
    }
    console.error("[portal/register] Error no controlado en registro.", error);
    return NextResponse.json({ error: "No se pudo completar el registro." }, { status: 500 });
  }
}

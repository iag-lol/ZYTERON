import { portalLoginEmail } from "@/lib/auth/portal-login-identity";
import { compare } from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boundedJson, publicRateLimit } from "@/lib/security/public-intake";

function normalizeEmail(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

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
    const rate = await publicRateLimit(req, "portal-prelogin", 15);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de volver a intentar." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const body = (await boundedJson(req, 4096).catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;
    const identifier = normalizeEmail(body?.email);
    const email = identifier ? await portalLoginEmail(identifier) : null;
    const password = String(body?.password || "");
    if (!identifier || !password || password.length > 1024) {
      return NextResponse.json({ error: "Ingresa correo o RUT y contraseña." }, { status: 400 });
    }

    const user = email ? await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerifiedAt: true,
        accountStatus: true,
      },
    }) : null;

    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }
    if (!user.passwordHash || user.passwordHash.length < 20) {
      return NextResponse.json(
        {
          error:
            "Esta cuenta no tiene una contraseña local válida. Ingresa con Google o recupera contraseña.",
        },
        { status: 401 },
      );
    }

    let validPassword = false;
    try {
      validPassword = await compare(password, user.passwordHash);
    } catch (error) {
      console.error("[portal/prelogin] Error al comparar password hash.", error);
      validPassword = false;
    }
    if (!validPassword) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    if (user.accountStatus === "DISABLED") return NextResponse.json({ error: "Tu cuenta está desactivada. Contacta a soporte." }, { status: 403 });
    if (!user.emailVerifiedAt) return NextResponse.json({ error: "Verifica tu correo para habilitar el acceso.", verificationRequired: true, email: user.email }, { status: 403 });
    if (user.accountStatus !== "ACTIVE") return NextResponse.json({ error: "Tu cuenta está pendiente de activación." }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isDbConnectionPrismaError(error)) {
      console.error(
        "[portal/prelogin] Conexión a base de datos fallida. Verifica DATABASE_URL en Render.",
        error,
      );
      return NextResponse.json(
        {
          error: "No se pudo validar el acceso en este momento. Intenta nuevamente.",
        },
        { status: 500 },
      );
    }
    if (isSchemaOutOfSyncPrismaError(error)) {
      console.error(
        "[portal/prelogin] Esquema desalineado en base de datos. Ejecuta portal_setup_all_in_one.sql.",
        error,
      );
      return NextResponse.json(
        {
          error: "No se pudo validar el acceso en este momento. Intenta nuevamente.",
        },
        { status: 500 },
      );
    }
    console.error("[portal/prelogin] Error no controlado.", error);
    return NextResponse.json({ error: "No se pudo validar el acceso." }, { status: 500 });
  }
}

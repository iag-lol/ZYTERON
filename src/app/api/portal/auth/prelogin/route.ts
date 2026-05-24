import { compare } from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeEmail(value?: string) {
  return String(value || "").trim().toLowerCase();
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

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string; password?: string }
      | null;
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Ingresa correo y contraseña." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        emailVerifiedAt: true,
        accountStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }
    if (user.accountStatus !== "ACTIVE") {
      return NextResponse.json(
        { error: "Tu cuenta está desactivada. Contacta a soporte para habilitarla." },
        { status: 403 },
      );
    }
    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Debes verificar tu correo antes de ingresar." },
        { status: 403 },
      );
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isSchemaOutOfSyncPrismaError(error)) {
      console.error(
        "[portal/prelogin] Esquema desalineado en base de datos. Ejecuta portal_setup_all_in_one.sql.",
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
    console.error("[portal/prelogin] Error no controlado.", error);
    return NextResponse.json({ error: "No se pudo validar el acceso." }, { status: 500 });
  }
}

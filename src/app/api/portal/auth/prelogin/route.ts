import { compare } from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeEmail(value?: string) {
  return String(value || "").trim().toLowerCase();
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

    const validPassword = await compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo validar el acceso." }, { status: 500 });
  }
}


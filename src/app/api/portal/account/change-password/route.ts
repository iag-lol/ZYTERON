import { compare, hash } from "bcrypt";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { changePasswordSchema } from "@/lib/auth/portal-validators";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const currentOk = await compare(parsed.data.currentPassword, user.passwordHash);
    if (!currentOk) {
      return NextResponse.json({ error: "La contraseña actual no coincide." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: await hash(parsed.data.newPassword, 12) },
    });

    return NextResponse.json({ ok: true, message: "Contraseña actualizada correctamente." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la contraseña.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


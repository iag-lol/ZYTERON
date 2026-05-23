import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { verifyPasswordResetCode } from "@/lib/auth/portal-codes";
import { normalizeEmail, resetPasswordSchema } from "@/lib/auth/portal-validators";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "No existe una cuenta con ese correo." }, { status: 404 });
    }

    await verifyPasswordResetCode({
      userId: user.id,
      email: user.email,
      code: parsed.data.code,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(parsed.data.password, 12) },
    });

    return NextResponse.json({ ok: true, message: "Contraseña actualizada correctamente." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo restablecer la contraseña.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


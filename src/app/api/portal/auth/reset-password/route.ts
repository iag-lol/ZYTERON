import { boundedJson, publicRateLimit, portalAuthFailure } from "@/lib/security/public-intake";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { verifyPasswordResetCode } from "@/lib/auth/portal-codes";
import { normalizeEmail, resetPasswordSchema } from "@/lib/auth/portal-validators";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rate = await publicRateLimit(req, "auth-reset-password", 10);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de volver a intentar." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const body = await boundedJson(req, 4096);
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
      passwordHash: await hash(parsed.data.password, 12),
    });

    return NextResponse.json({ ok: true, message: "Contraseña actualizada correctamente." });
  } catch (error) {
    return portalAuthFailure(error);
  }
}

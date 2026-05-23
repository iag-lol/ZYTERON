import { NextResponse } from "next/server";
import { verifyEmailCode } from "@/lib/auth/portal-codes";
import { normalizeEmail, verifyCodeSchema } from "@/lib/auth/portal-validators";
import { sendPortalWelcomeEmail } from "@/lib/notifications/portal-email";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifyCodeSchema.safeParse(body);
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
      return NextResponse.json({ ok: true, message: "El correo ya estaba verificado." });
    }

    await verifyEmailCode({ userId: user.id, email: user.email, code: parsed.data.code });
    await sendPortalWelcomeEmail({ to: user.email, fullName: user.name });

    return NextResponse.json({ ok: true, message: "Correo verificado correctamente." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo validar el código.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


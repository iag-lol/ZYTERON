import { boundedJson, publicRateLimit, portalAuthFailure } from "@/lib/security/public-intake";
import { NextResponse } from "next/server";
import { verifyEmailCode } from "@/lib/auth/portal-codes";
import { normalizeEmail, verifyCodeSchema } from "@/lib/auth/portal-validators";
import { sendPortalWelcomeEmail } from "@/lib/notifications/portal-email";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rate = await publicRateLimit(req, "auth-verify-code", 12);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de volver a intentar." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const body = await boundedJson(req, 4096);
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
    try {
      await sendPortalWelcomeEmail({ to: user.email, fullName: user.name });
    } catch {
      /* Verified account remains valid if the courtesy email is unavailable. */
    }

    return NextResponse.json({ ok: true, message: "Correo verificado correctamente." });
  } catch (error) {
    return portalAuthFailure(error);
  }
}

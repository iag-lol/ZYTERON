import { z } from "zod";
import { hash } from "bcrypt";
import { registerSchema } from "@/lib/auth/portal-validators";
import { createEmailVerificationCode } from "@/lib/auth/portal-codes";
import { sendPortalVerificationCodeEmail } from "@/lib/notifications/portal-email";
import { prisma } from "@/lib/prisma";
import {
  manualInput,
  manualJson,
  manualFailure,
  manualOrder,
  ManualError,
} from "@/lib/manual-quote/server";

export async function POST(req: Request) {
  try {
    const { order, meta } = await manualOrder();
    if (meta.type !== "MANUAL_QUOTE")
      throw new ManualError("Inicia sesión con la cuenta de este pedido.", 409);
    const input = await manualInput(req, "manual-account", 5);
    const reference = z.object({ quoteId: z.uuid() }).safeParse(input);
    if (!reference.success || reference.data.quoteId !== order.id)
      throw new ManualError("La cotización activa cambió. Recarga antes de crear la cuenta.", 409);
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success)
      throw new ManualError(parsed.error.issues[0]?.message || "Revisa los datos de la cuenta.");
    const data = parsed.data,
      email = data.email.trim().toLowerCase();
    if (email !== order.email.toLowerCase())
      throw new ManualError("Usa el correo con el que iniciaste esta cotización.", 403);
    // Existing identities are never rewritten by a public purchase request.
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } }))
      return manualJson(
        {
          error:
            "Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña; si falta verificarlo, solicita un nuevo código.",
          existing: true,
        },
        409,
      );
    const user = await prisma.user.create({
      data: {
        email,
        name: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        passwordHash: await hash(data.password, 12),
        role: "CLIENT",
        authProvider: "LOCAL",
        accountStatus: "PENDING",
      },
    });
    const { code, expiresMinutes } = await createEmailVerificationCode({ userId: user.id, email });
    const mail = await sendPortalVerificationCodeEmail({
      to: email,
      fullName: user.name,
      code,
      expiresMinutes,
    });
    return manualJson({
      ok: true,
      email,
      mailSent: mail.sent,
      message: mail.sent
        ? "Enviamos un código de 6 dígitos a tu correo. Vence en 15 minutos."
        : "La cuenta quedó creada. No se pudo enviar el correo; usa Reenviar código.",
    });
  } catch (error) {
    return manualFailure(error);
  }
}

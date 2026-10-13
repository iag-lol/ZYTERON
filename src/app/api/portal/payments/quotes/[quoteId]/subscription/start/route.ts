import { portalModuleEnabled } from "@/lib/portal/module-access";
import { prisma } from "@/lib/prisma";
import { consumeFinancialCode } from "@/lib/payments/financial-challenge";
import { limitedJson } from "@/lib/payments/request-body";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { createQuoteFlowSubscriptionStart } from "@/lib/payments/quote-payment-workflow";

type Context = {
  params: Promise<{ quoteId: string }>;
};

const payloadSchema = z.object({
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request, { params }: Context) {
  const session = await getServerSession(portalAuthOptions);
  if (
    !session?.user?.id ||
    !session.user.email ||
    session.user.accountStatus !== "ACTIVE" ||
    !session.user.emailVerifiedAt
  ) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    if (!(await portalModuleEnabled(session.user.id,"invoices"))) return NextResponse.json({error:"Los pagos no están habilitados para esta cuenta."},{status:403});
    const body = await limitedJson(req).catch(() => null);
    const parsedBody = payloadSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error:
            "Debes aceptar los términos y condiciones y la política de privacidad para continuar.",
        },
        { status: 400 },
      );
    }

    const { quoteId } = await params;
    const authorized = await prisma.$transaction((tx) =>
      consumeFinancialCode(tx, {
        id: parsedBody.data.challengeId,
        userId: session.user.id,
        quoteId,
        purpose: "START_SUBSCRIPTION",
        code: parsedBody.data.code,
      }),
    );
    if (!authorized)
      return NextResponse.json({ error: "Código inválido o expirado." }, { status: 403 });
    const result = await createQuoteFlowSubscriptionStart({
      quoteId,
      userId: session.user.id,
      email: session.user.email,
      req,
      legalAcceptance: parsedBody.data,
    });

    return NextResponse.json({
      ok: true,
      redirectUrl: result.redirectUrl,
    });
  } catch {
    return NextResponse.json(
      {
        error: "No se pudo iniciar la suscripción. Revisa el estado antes de volver a intentarlo.",
      },
      { status: 409 },
    );
  }
}

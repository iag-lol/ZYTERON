import { limitedJson } from "@/lib/payments/request-body";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { createQuoteFlowCheckout } from "@/lib/payments/quote-payment-workflow";

type Context = {
  params: Promise<{ quoteId: string }>;
};

const payloadSchema = z.object({
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
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
    const body = await limitedJson(req);
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
    const result = await createQuoteFlowCheckout({
      quoteId,
      userId: session.user.id,
      email: session.user.email,
      req,
      legalAcceptance: parsedBody.data,
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: result.checkoutUrl,
      amount: result.amount,
      stageKey: result.stageKey,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Revisa el estado antes de volver a intentarlo." },
      { status: 400 },
    );
  }
}

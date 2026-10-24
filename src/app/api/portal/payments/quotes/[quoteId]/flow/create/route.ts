import { portalModuleEnabled } from "@/lib/portal/module-access";
import { limitedJson } from "@/lib/payments/request-body";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { createQuoteFlowCheckout } from "@/lib/payments/quote-payment-workflow";
import { PaymentTargetError } from "@/lib/payments/invoice-payment-option";

type Context = {
  params: Promise<{ quoteId: string }>;
};

const payloadSchema = z.object({
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
  expectedAmount: z.number().int().positive().max(2147483647),
  receivableId: z.string().trim().min(1).max(100).optional(),
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
    if (!(await portalModuleEnabled(session.user.id, "invoices")))
      return NextResponse.json(
        { error: "Los pagos no están habilitados para esta cuenta." },
        { status: 403 },
      );
    const body = await limitedJson(req);
    const parsedBody = payloadSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: parsedBody.error.issues.some((issue) =>
            ["expectedAmount", "receivableId"].includes(String(issue.path[0])),
          )
            ? "Actualiza tu cuenta y vuelve a revisar el importe del cobro antes de pagar."
            : "Debes aceptar los términos y condiciones y la política de privacidad para continuar.",
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
      expectedAmount: parsedBody.data.expectedAmount,
      receivableId: parsedBody.data.receivableId,
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: result.checkoutUrl,
      amount: result.amount,
      stageKey: result.stageKey,
    });
  } catch (error) {
    if (error instanceof PaymentTargetError)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Revisa el estado antes de volver a intentarlo." },
      { status: 400 },
    );
  }
}

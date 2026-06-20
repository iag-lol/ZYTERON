import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { createQuoteFlowCheckout } from "@/lib/payments/quote-payment-workflow";

type Context = {
  params: Promise<{ quoteId: string }>;
};

export async function POST(req: Request, { params }: Context) {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const { quoteId } = await params;
    const result = await createQuoteFlowCheckout({
      quoteId,
      userId: session.user.id,
      email: session.user.email,
      req,
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: result.checkoutUrl,
      amount: result.amount,
      stageKey: result.stageKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar el pago.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

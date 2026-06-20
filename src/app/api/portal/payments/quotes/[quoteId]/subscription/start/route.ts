import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { createQuoteFlowSubscriptionStart } from "@/lib/payments/quote-payment-workflow";

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
    const result = await createQuoteFlowSubscriptionStart({
      quoteId,
      userId: session.user.id,
      email: session.user.email,
      req,
    });

    return NextResponse.json({
      ok: true,
      redirectUrl: result.redirectUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar la suscripción mensual.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

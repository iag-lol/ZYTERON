import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { submitQuoteTransferProof } from "@/lib/payments/quote-payment-workflow";

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
    const formData = await req.formData();
    const stageKey = String(formData.get("stageKey") || "").trim().toUpperCase();
    const amount = Number(formData.get("amount") || 0);
    const transferDate = String(formData.get("transferDate") || "").trim();
    const reference = String(formData.get("reference") || "").trim();
    const note = String(formData.get("note") || "").trim();
    const file = formData.get("file");

    if (!stageKey) {
      return NextResponse.json({ error: "Debes indicar la etapa de pago." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido para el comprobante." }, { status: 400 });
    }

    const result = await submitQuoteTransferProof({
      quoteId,
      userId: session.user.id,
      email: session.user.email,
      stageKey: stageKey as "FULL" | "DELIVERY" | "INITIAL" | "FINAL",
      amount,
      transferDate: transferDate || undefined,
      reference: reference || undefined,
      note: note || undefined,
      file: file instanceof File ? file : null,
      req,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el comprobante.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";
import { historicalProofTarget } from "./payment-proof-target";

export async function historicalPaymentEvidence(payment: Parameters<typeof historicalProofTarget>[0], download: boolean) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const target = historicalProofTarget(payment);
  const review = () => NextResponse.json({ message: "El vínculo del comprobante histórico requiere revisión. No se modificó ni se solicitó reemplazar el archivo." }, { status: 409 });
  if (!target) return review();
  const quote = await prisma.quote.findUnique({ where: { id: target.quoteId } });
  if (!quote || (quote.userId && quote.userId !== payment.clientId)) return review();
  const proof = normalizeQuoteMetaPayment(enrichQuoteRecord({ ...quote, createdAt: quote.createdAt.toISOString() }).meta)
    .payment?.stages?.flatMap(stage => stage.transferProofs || []).find(proof => proof.id === target.proofId);
  if (!proof || proof.fileUrl !== payment.proofUrl) return review();
  const { data, error } = await createSupabaseServerClient().supabase.storage
    .from("zyteron-payment-proofs-private").download(`${target.quoteId}/${target.proofId}`);
  if (error || !data) return NextResponse.json({ message: "No fue posible acceder al objeto vinculado. Revisa disponibilidad y permisos del comprobante existente." }, { status: 503 });
  const mime = ["application/pdf", "image/png", "image/jpeg"].includes(data.type) ? data.type : "application/octet-stream";
  return new NextResponse(await data.arrayBuffer(), { headers: {
    "Content-Type": mime, "Content-Disposition": `${download || mime === "application/octet-stream" ? "attachment" : "inline"}; filename="comprobante-transferencia"`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  } });
}

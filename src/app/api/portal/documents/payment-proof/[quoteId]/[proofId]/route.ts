import { portalModuleEnabled } from "@/lib/portal/module-access";
import { cookies } from "next/headers";
import { getPortalSession } from "@/lib/auth/portal-session";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ quoteId: string; proofId: string }> },
) {
  void req;
  try {
    const { quoteId, proofId } = await params;
    if (quoteId.length > 100 || !/^[a-f0-9-]{36}$/i.test(proofId)) throw new Error("NOT_FOUND");
    const session = await getPortalSession(),
      admin = await verifyAdminSessionToken((await cookies()).get(ADMIN_COOKIE)?.value),
      q = await prisma.quote.findUnique({ where: { id: quoteId } });
    const verified = !admin && session?.user.accountStatus === "ACTIVE" && session.user.emailVerifiedAt && await portalModuleEnabled(session.user.id,"invoices");
    if (
      !q ||
      (!admin &&
        !(
          verified &&
          (q.userId === session.user.id ||
            (!q.userId && q.email.toLowerCase() === session.user.email?.toLowerCase()))
        ))
    )
      throw new Error("NOT_FOUND");
    const proof = normalizeQuoteMetaPayment(
      enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() }).meta,
    )
      .payment?.stages?.flatMap((s) => s.transferProofs || [])
      .find((p) => p.id === proofId);
    if (!proof?.fileUrl?.startsWith("/api/portal/documents/payment-proof/"))
      throw new Error("NOT_FOUND");
    const { data, error } = await createSupabaseServerClient()
      .supabase.storage.from("zyteron-payment-proofs-private")
      .download(quoteId + "/" + proofId);
    if (error || !data) throw new Error("NOT_FOUND");
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Content-Disposition": 'attachment; filename="comprobante-transferencia"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response("Documento no disponible", { status: 404 });
  }
}

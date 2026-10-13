import { portalModuleEnabled } from "@/lib/portal/module-access";
import { getPortalSession } from "@/lib/auth/portal-session";
import { clientPaymentReceipt } from "@/lib/payments/payment-receipt";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, context: { params: Promise<{ paymentId: string }> }) {
  const session = await getPortalSession();
  if (!session?.user.id || session.user.accountStatus !== "ACTIVE" || !session.user.emailVerifiedAt)
    return new Response("No autenticado", { status: 401 });
  try {
    if (!(await portalModuleEnabled(session.user.id,"invoices"))) return new Response("Acceso a comprobantes deshabilitado", { status: 403 });
    const { paymentId } = await context.params;
    const receipt = await clientPaymentReceipt(paymentId, session.user.id);
    return new Response(new Uint8Array(receipt.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="comprobante-zyteron.pdf"',
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response("Comprobante no disponible", { status: 404 });
  }
}

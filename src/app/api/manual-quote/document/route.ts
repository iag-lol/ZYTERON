import { generateManualQuoteDocument } from "@/lib/manual-quote/document";
import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";
import {
  manualOrder,
  manualFailure,
  ManualError,
  type ManualDraft,
} from "@/lib/manual-quote/server";
export async function GET(req: Request) {
  try {
    const requested = new URL(req.url).searchParams.get("order");
    let order, draft: ManualDraft;
    if (requested) {
      const session = await getPortalSession();
      if (
        !session?.user.id ||
        !session.user.emailVerifiedAt ||
        session.user.accountStatus !== "ACTIVE"
      )
        throw new ManualError("Inicia sesión para consultar tu documento.", 401);
      const found = await prisma.quote.findFirst({
        where: { id: requested, userId: session.user.id },
      });
      if (!found) throw new ManualError("Documento no disponible.", 404);
      order = found;
      const meta = JSON.parse(order.message || "{}");
      draft = meta.type === "MANUAL_QUOTE" ? meta : meta.manualQuote;
    } else ({ order, draft } = await manualOrder());
    const expected = new URL(req.url).searchParams.get("draft");
    if (expected && expected !== order.id)
      throw new ManualError("La cotización activa cambió. Recarga para descargar su alcance.", 409);
    if (!draft?.snapshot) throw new ManualError("Documento no disponible.", 404);
    const bytes = await generateManualQuoteDocument({
      id: order.id,
      name: order.name,
      email: order.email,
      createdAt: draft.createdAt,
      acceptedAt: draft.acceptedAt,
      snapshot: draft.snapshot,
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Zyteron-cotizacion-${order.id.slice(0, 8)}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return manualFailure(error);
  }
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canonicalProposalFile } from "@/lib/portal/commercial-publications";
import { nativeProposalVisible } from "@/lib/portal/commercial-publications";
import { parseQuoteMessage } from "@/lib/admin/quote";
import { portalModuleEnabled } from "@/lib/portal/module-access";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
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
    if (!(await portalModuleEnabled(session.user.id, "documents")))
      return NextResponse.json(
        { error: "Documentos deshabilitados para esta cuenta." },
        { status: 403 },
      );
  } catch {
    return NextResponse.json({ error: "No fue posible validar el acceso." }, { status: 503 });
  }
  const { id } = await params;
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    const file = await canonicalProposalFile(session.user.id, id);
    if (!file) return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    const { supabase } = createSupabaseServerClient();
    const signed = await supabase.storage
      .from("enterprise-documents")
      .createSignedUrl(file.storage_path, 90, { download: file.filename });
    if (signed.error || !signed.data.signedUrl)
      return NextResponse.json({ error: "No se pudo autorizar la descarga." }, { status: 502 });
    return NextResponse.redirect(signed.data.signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private,no-store" },
    });
  }
  if (!nativeProposalVisible(quote.status, parseQuoteMessage(quote.message)))
    return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });

  const ownsById = quote.userId === session.user.id;
  const ownsLegacyByVerifiedEmail =
    !quote.userId && quote.email.trim().toLowerCase() === session.user.email.trim().toLowerCase();
  if (!ownsById && !ownsLegacyByVerifiedEmail) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const enriched = enrichQuoteRecord({
    id: quote.id,
    userId: quote.userId,
    name: quote.name,
    email: quote.email,
    phone: quote.phone,
    company: quote.company,
    message: quote.message,
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total,
    status: quote.status,
    createdAt: quote.createdAt.toISOString(),
  });
  const bytes = await generateQuotePdf({
    quoteId: enriched.id,
    clientName: enriched.name || "Cliente",
    clientEmail: enriched.email || null,
    clientPhone: enriched.phone || null,
    clientCompany: enriched.company || null,
    status: enriched.status || "PENDING",
    createdAt: enriched.createdAt || null,
    meta: enriched.meta,
  });
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${enriched.displayNumber}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

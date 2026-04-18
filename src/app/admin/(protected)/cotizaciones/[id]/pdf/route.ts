import { NextResponse } from "next/server";
import { getQuoteById } from "@/lib/admin/repository";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const quote = await getQuoteById(id);

  if (!quote) {
    return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
  }

  const pdfBytes = await generateQuotePdf({
    quoteId: quote.id,
    clientName: quote.name || "Cliente",
    clientEmail: quote.email || null,
    clientPhone: quote.phone || null,
    clientCompany: quote.company || null,
    status: quote.status || "PENDING",
    createdAt: quote.createdAt || null,
    meta: quote.meta,
  });

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.displayNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

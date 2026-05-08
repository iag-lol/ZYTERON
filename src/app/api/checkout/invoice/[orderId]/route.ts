import { NextResponse } from "next/server";
import { generateCheckoutInvoicePdf } from "@/lib/checkout/invoice-pdf";
import { getCheckoutOrder } from "@/lib/checkout/orders";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: {
    params: Promise<{ orderId: string }>;
  },
) {
  try {
    const params = await ctx.params;
    const orderId = String(params.orderId || "").trim();
    const token = new URL(req.url).searchParams.get("token")?.trim() || "";

    if (!orderId) {
      return NextResponse.json({ error: "Orden inválida." }, { status: 400 });
    }

    const order = await getCheckoutOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    if (order.meta.flow.status !== 2) {
      return NextResponse.json({ error: "Documento disponible solo para compras pagadas." }, { status: 403 });
    }

    if (!token || token !== order.meta.flow.token) {
      return NextResponse.json({ error: "Token de acceso inválido." }, { status: 403 });
    }

    const pdfBytes = await generateCheckoutInvoicePdf({
      orderId,
      createdAt: order.createdAt || order.meta.flow.updatedAt || null,
      flowOrder: order.meta.flow.flowOrder || null,
      meta: order.meta,
    });

    const documentPrefix = order.meta.customer.documentType === "FACTURA" ? "factura-referencial" : "boleta";
    const fileName = `${documentPrefix}-${orderId.slice(0, 8).toUpperCase()}.pdf`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo generar el PDF." },
      { status: 500 },
    );
  }
}


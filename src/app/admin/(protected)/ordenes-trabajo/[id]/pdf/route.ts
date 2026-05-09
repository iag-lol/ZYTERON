import { NextResponse } from "next/server";
import { getQuoteById, getWorkOrderById } from "@/lib/admin/repository";
import { generateWorkOrderPdf } from "@/lib/admin/work-order-pdf";
import { parseCheckoutMeta } from "@/lib/checkout/orders";
import { workOrderStatusLabel } from "@/lib/admin/work-orders";

function sourceLabel(value?: string | null) {
  return String(value || "").toUpperCase() === "WEB_ORDER" ? "Venta Web" : "Cotización Manual";
}

function priorityLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "LOW") return "Baja";
  if (normalized === "HIGH") return "Alta";
  if (normalized === "URGENT") return "Urgente";
  return "Normal";
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workOrder = await getWorkOrderById(id);

  if (!workOrder) {
    return NextResponse.json({ error: "Orden de trabajo no encontrada" }, { status: 404 });
  }

  const quote = workOrder.quoteId ? await getQuoteById(workOrder.quoteId) : null;
  const checkoutMeta = quote ? parseCheckoutMeta(quote.message) : null;

  const scopeFromOrder = Array.isArray(workOrder.scope)
    ? workOrder.scope.filter((line) => typeof line === "string" && line.trim().length > 0)
    : [];

  const scopeFromWebQuote = checkoutMeta
    ? checkoutMeta.items.map((item) => `${item.name} x${item.quantity}`)
    : [];

  const scope = scopeFromOrder.length > 0 ? scopeFromOrder : scopeFromWebQuote;

  const pdfBytes = await generateWorkOrderPdf({
    code: workOrder.code,
    title: workOrder.title,
    sourceLabel: sourceLabel(workOrder.source),
    statusLabel: workOrderStatusLabel(workOrder.status),
    priorityLabel: priorityLabel(workOrder.priority),
    clientName: checkoutMeta?.customer.buyerName || quote?.name || quote?.company || "Cliente",
    clientCompany:
      checkoutMeta?.customer.documentType === "FACTURA"
        ? checkoutMeta.customer.companyName || quote?.company || null
        : quote?.company || null,
    clientEmail: checkoutMeta?.customer.buyerEmail || quote?.email || null,
    clientPhone: checkoutMeta?.customer.buyerPhone || quote?.phone || null,
    budget: workOrder.budget || quote?.totalAmount || 0,
    plannedDate: workOrder.plannedDate,
    dueDate: workOrder.dueDate,
    createdAt: workOrder.createdAt,
    notes: workOrder.notes,
    description: workOrder.description,
    scope,
  });

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${workOrder.code}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

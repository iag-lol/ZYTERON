import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getQuoteById, getWorkOrderByQuoteId, insertRow } from "@/lib/admin/repository";
import { buildWorkOrderScopeFromQuote, isWebCheckoutQuote } from "@/lib/admin/work-orders";
import { parseCheckoutMeta } from "@/lib/checkout/orders";
import { parseQuoteMessage } from "@/lib/admin/quote";

type WorkOrderSource = "MANUAL_QUOTE" | "WEB_ORDER";

function normalizeSource(value: FormDataEntryValue | null): WorkOrderSource {
  return String(value || "").toUpperCase() === "WEB_ORDER" ? "WEB_ORDER" : "MANUAL_QUOTE";
}

function safeRedirect(path: FormDataEntryValue | null) {
  const value = String(path || "").trim();
  if (value.startsWith("/admin/")) return value;
  return "/admin/ordenes-trabajo";
}

function shouldBePending(status?: string | null) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "PENDING" || normalized === "SENT";
}

function buildWorkOrderCode(quoteId: string) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `OT-${year}${month}${day}-${quoteId.slice(0, 5).toUpperCase()}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const quoteId = String(formData.get("quoteId") || "").trim();
  const source = normalizeSource(formData.get("source"));
  const redirectTo = safeRedirect(formData.get("redirectTo"));
  const redirectUrl = new URL(redirectTo, request.url);

  if (!quoteId) {
    redirectUrl.searchParams.set("ot_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    const [quote, existing] = await Promise.all([getQuoteById(quoteId), getWorkOrderByQuoteId(quoteId)]);

    if (!quote) {
      redirectUrl.searchParams.set("ot_not_found", "1");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    if (existing) {
      redirectUrl.searchParams.set("ot_exists", "1");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const isWeb = isWebCheckoutQuote(quote);
    if (source === "MANUAL_QUOTE") {
      if (isWeb || !shouldBePending(quote.status)) {
        redirectUrl.searchParams.set("ot_invalid_quote", "1");
        return NextResponse.redirect(redirectUrl, { status: 303 });
      }
    }

    if (source === "WEB_ORDER" && !isWeb) {
      redirectUrl.searchParams.set("ot_invalid_quote", "1");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const manualMeta = parseQuoteMessage(quote.message);
    const checkoutMeta = parseCheckoutMeta(quote.message);
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const title =
      source === "WEB_ORDER"
        ? `OT WEB ${quote.displayNumber} - ${checkoutMeta?.customer.buyerName || quote.name || "Cliente"}`
        : `OT ${quote.displayNumber} - ${quote.company || quote.name || "Cliente"}`;

    const description =
      source === "WEB_ORDER"
        ? checkoutMeta?.customer.comments || "Orden operativa para cumplimiento de pedido web."
        : manualMeta.notes || "Orden operativa para ejecución de cotización manual.";

    const notes =
      source === "WEB_ORDER"
        ? `Pedido web asociado. Documento: ${checkoutMeta?.customer.documentType || "N/A"}`
        : `Cotización manual asociada. Estado comercial: ${String(quote.status || "PENDING").toUpperCase()}`;

    await insertRow(
      "WorkOrder",
      {
        id,
        code: buildWorkOrderCode(quote.id),
        source,
        status: "ACTIVE",
        priority: source === "WEB_ORDER" ? "HIGH" : "NORMAL",
        quoteId: quote.id,
        saleId: null,
        clientId: quote.userId || null,
        title,
        description,
        scope: buildWorkOrderScopeFromQuote(quote),
        plannedDate: createdAt.slice(0, 10),
        dueDate: manualMeta.validUntil || null,
        estimatedHours: source === "WEB_ORDER" ? 6 : 12,
        actualHours: null,
        budget: Math.max(0, Math.round(quote.totalAmount || 0)),
        assignedTo: null,
        notes,
        pdfUrl: `/admin/ordenes-trabajo/${id}/pdf`,
        createdAt,
        updatedAt: createdAt,
      },
      "id",
    );

    redirectUrl.searchParams.set("ot_created", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("workorder") && message.includes("does not exist")) {
      redirectUrl.searchParams.set("ot_schema_missing", "1");
    } else {
      redirectUrl.searchParams.set("ot_error", "1");
    }
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}

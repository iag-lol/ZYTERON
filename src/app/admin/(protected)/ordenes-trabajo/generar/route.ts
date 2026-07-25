import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getQuoteById, getWorkOrderByQuoteId } from "@/lib/admin/repository";
import { prisma } from "@/lib/prisma";
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

function firstHeaderValue(value: string | null) {
  if (!value) return "";
  return value.split(",")[0]?.trim() || "";
}

function resolveRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = firstHeaderValue(request.headers.get("host"));
  const targetHost = forwardedHost || host;
  const targetProto = forwardedProto || requestUrl.protocol.replace(":", "");

  if (targetHost && (targetProto === "http" || targetProto === "https")) {
    return `${targetProto}://${targetHost}`;
  }

  return requestUrl.origin;
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

function normalizeDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const fallback = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(fallback)) return fallback;
  return null;
}

function normalizeScope(items: string[]) {
  const cleaned = items
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
  return cleaned.length > 0 ? cleaned : ["Ejecución de alcance según cotización aprobada."];
}



export async function POST(request: Request) {
  const formData = await request.formData();
  const quoteId = String(formData.get("quoteId") || "").trim();
  const source = normalizeSource(formData.get("source"));
  const redirectTo = safeRedirect(formData.get("redirectTo"));
  const redirectUrl = new URL(redirectTo, resolveRequestOrigin(request));

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

    const existingStatus = String(existing?.status || "").trim().toUpperCase();
    if (existing && existingStatus !== "CANCELLED") {
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
    const scope = normalizeScope(buildWorkOrderScopeFromQuote(quote));
    const dueDate = normalizeDateOnly(manualMeta.validUntil);
    const plannedDate = normalizeDateOnly(createdAt);
    const clientExists = quote.userId
      ? await prisma.user.findUnique({ where: { id: quote.userId }, select: { id: true } })
      : null;
    const clientId = clientExists?.id || null;

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

    await prisma.workOrder.create({
      data: {
        id,
        code: buildWorkOrderCode(quote.id),
        source,
        status: "ACTIVE",
        priority: source === "WEB_ORDER" ? "HIGH" : "NORMAL",
        quoteId: quote.id,
        clientId,
        title,
        description,
        scope,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: source === "WEB_ORDER" ? 6 : 12,
        budget: Math.max(0, Math.round(quote.totalAmount || 0)),
        notes,
        pdfUrl: `/admin/ordenes-trabajo/${id}/pdf`,
      },
    });

    // Auto-relleno del BORRADOR de documento tributario (DTE) desde la cotización.
    // No emite ante el SII: deja el borrador listo para revisar y confirmar.
    try {
      const { createDteDraftFromQuote } = await import("@/lib/dte/dte-repository");
      await createDteDraftFromQuote({
        quote: {
          id: quote.id,
          userId: quote.userId,
          name: quote.name,
          email: quote.email,
          phone: quote.phone,
          company: quote.company,
          totalAmount: quote.totalAmount,
          displayNumber: quote.displayNumber,
        },
        workOrderId: id,
        meta: {
          items: manualMeta.items,
          clientRut: manualMeta.clientRut,
          clientAddress: manualMeta.clientAddress,
          clientCity: manualMeta.clientCity,
        },
      });
    } catch (dteError) {
      // El borrador tributario no debe bloquear la creación de la OT.
      console.error("[ot/generar] auto-relleno DTE falló", dteError);
    }

    redirectUrl.searchParams.set("ot_created", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("[ot/generar] failed", {
      quoteId,
      source,
      redirectTo,
      message: error instanceof Error ? error.message : String(error || "unknown error"),
    });
    redirectUrl.searchParams.set("ot_error", "1");
    redirectUrl.searchParams.set("error_detail", error instanceof Error ? error.message : "unknown");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}

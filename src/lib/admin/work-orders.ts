import { parseQuoteMessage, type QuoteRecord } from "@/lib/admin/quote";
import { parseCheckoutMeta } from "@/lib/checkout/orders";
import type { EnrichedQuote, WorkOrder, WorkOrderStatus } from "@/lib/admin/repository";

export function isWebCheckoutQuote(raw?: Pick<QuoteRecord, "message"> | null) {
  return Boolean(parseCheckoutMeta(raw?.message));
}

export function isManualQuote(raw?: Pick<QuoteRecord, "message"> | null) {
  return !isWebCheckoutQuote(raw);
}

export function normalizeWorkOrderStatus(status?: string | null): WorkOrderStatus {
  const value = String(status || "").trim().toUpperCase();
  if (
    value === "ACTIVE" ||
    value === "IN_PROGRESS" ||
    value === "COMPLETED" ||
    value === "CLOSED" ||
    value === "CANCELLED"
  ) {
    return value;
  }
  return "ACTIVE";
}

export function workOrderStatusLabel(status?: string | null) {
  const normalized = normalizeWorkOrderStatus(status);
  if (normalized === "IN_PROGRESS") return "En Progreso";
  if (normalized === "COMPLETED") return "Terminada";
  if (normalized === "CLOSED") return "Cerrada";
  if (normalized === "CANCELLED") return "Cancelada";
  return "Activa";
}

export function workOrderStatusStyles(status?: string | null) {
  const normalized = normalizeWorkOrderStatus(status);
  if (normalized === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "CLOSED") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  if (normalized === "CANCELLED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (normalized === "IN_PROGRESS") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function workOrderDisplayClient(workOrder: WorkOrder, quotesById: Map<string, EnrichedQuote>) {
  const quote = workOrder.quoteId ? quotesById.get(workOrder.quoteId) : null;
  if (!quote) {
    return {
      name: "Cliente no vinculado",
      email: "",
      company: "",
    };
  }

  if (isWebCheckoutQuote(quote)) {
    const checkoutMeta = parseCheckoutMeta(quote.message);
    if (checkoutMeta) {
      return {
        name: checkoutMeta.customer.buyerName,
        email: checkoutMeta.customer.buyerEmail,
        company:
          checkoutMeta.customer.documentType === "FACTURA"
            ? checkoutMeta.customer.companyName || ""
            : quote.company || "",
      };
    }
  }

  const manualMeta = parseQuoteMessage(quote.message);
  return {
    name: quote.name || quote.company || "Cliente",
    email: quote.email || "",
    company: manualMeta.clientContact || quote.company || "",
  };
}

export function buildWorkOrderScopeFromQuote(quote: EnrichedQuote) {
  const checkoutMeta = parseCheckoutMeta(quote.message);
  if (checkoutMeta) {
    return checkoutMeta.items.map((item) => `${item.name} x${item.quantity}`);
  }

  const manualMeta = parseQuoteMessage(quote.message);
  if (manualMeta.items.length > 0) {
    return manualMeta.items.map((item) => {
      const parts = [item.description, item.detail].filter(Boolean);
      return parts.join(" - ");
    });
  }

  return ["Ejecución de alcance según cotización aprobada."];
}

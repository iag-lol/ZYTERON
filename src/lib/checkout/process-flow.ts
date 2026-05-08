import { getCheckoutOrder, markCheckoutEmailSent, markCheckoutStockHandled, setCheckoutFlowStatus } from "@/lib/checkout/orders";
import { syncWonQuoteById } from "@/lib/admin/repository";
import { deductStockFromCheckout } from "@/lib/checkout/stock";
import { getFlowPaymentStatus, isFlowApproved, isFlowRejected, mapFlowStatusLabel } from "@/lib/payments/flow";
import { sendCheckoutStatusEmail } from "@/lib/notifications/purchase-status";
import { ZYTERON_COMPANY } from "@/lib/company";

function resolvePublicBaseUrl() {
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalHost = (host: string) =>
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const sanitizeUrl = (value?: string | null) => {
    const normalized = String(value || "").trim();
    if (!normalized || !/^https?:\/\//i.test(normalized)) return "";
    try {
      const parsed = new URL(normalized);
      if (isProduction && isLocalHost(parsed.hostname.toLowerCase())) return "";
      return normalized.replace(/\/+$/, "");
    } catch {
      return "";
    }
  };

  const candidates = [
    process.env.FLOW_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.PUBLIC_SITE_URL,
    process.env.RENDER_EXTERNAL_URL,
    ZYTERON_COMPANY.website,
  ];

  for (const candidate of candidates) {
    const resolved = sanitizeUrl(candidate);
    if (!resolved) continue;
    return resolved;
  }

  return "";
}

export async function processFlowToken(token: string) {
  const status = await getFlowPaymentStatus(token);
  const orderId = String(status.commerceOrder || "").trim();
  if (!orderId) {
    throw new Error("Flow no devolvió commerceOrder.");
  }

  const order = await getCheckoutOrder(orderId);
  if (!order) {
    throw new Error(`No existe orden asociada: ${orderId}`);
  }

  const updated = await setCheckoutFlowStatus({
    orderId,
    flowStatus: status.status,
    flowOrder: status.flowOrder,
    lastError: status.lastError || null,
  });

  const freshestOrder = (await getCheckoutOrder(orderId)) || updated;

  if (isFlowApproved(status.status) && !freshestOrder.meta.fulfillment?.stockDiscountedAt) {
    try {
      const stockResult = await deductStockFromCheckout(freshestOrder.meta);
      await markCheckoutStockHandled({
        orderId,
        stockDiscountedAt: new Date().toISOString(),
        stockDiscountedUnits: stockResult.deductedUnits,
        stockDiscountError: stockResult.warnings.length > 0 ? stockResult.warnings.join(" | ") : null,
      });
      await syncWonQuoteById(orderId);
    } catch (error) {
      await markCheckoutStockHandled({
        orderId,
        stockDiscountError: error instanceof Error ? error.message : String(error),
      });
      console.error("[checkout] stock deduction failed", {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (isFlowApproved(status.status)) {
    try {
      await syncWonQuoteById(orderId);
    } catch (error) {
      console.error("[checkout] quote won sync failed", {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const shouldSendApproved = isFlowApproved(status.status) && !updated.meta.mail.approvedSentAt;
  const shouldSendRejected = isFlowRejected(status.status) && !updated.meta.mail.rejectedSentAt;
  const shouldSendPending =
    !isFlowApproved(status.status) &&
    !isFlowRejected(status.status) &&
    !updated.meta.mail.pendingSentAt;

  if (shouldSendApproved || shouldSendRejected || shouldSendPending) {
    try {
      const baseUrl = resolvePublicBaseUrl();
      const invoiceUrl =
        shouldSendApproved && baseUrl
          ? `${baseUrl}/api/checkout/invoice/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`
          : null;

      await sendCheckoutStatusEmail({
        orderId,
        recipientEmail: updated.email || updated.meta.customer.buyerEmail,
        recipientName: updated.name || updated.meta.customer.buyerName,
        flowStatus: status.status,
        flowLabel: mapFlowStatusLabel(status.status),
        meta: updated.meta,
        checkoutUrl: updated.meta.flow.checkoutUrl || null,
        invoiceUrl,
      });

      await markCheckoutEmailSent(
        orderId,
        shouldSendApproved ? "approved" : shouldSendRejected ? "rejected" : "pending",
      );
    } catch (error) {
      console.error("[checkout] send status email failed", {
        orderId,
        status: status.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    orderId,
    flowStatus: status.status,
    flowLabel: mapFlowStatusLabel(status.status),
    quoteStatus: updated.quoteStatus,
  };
}

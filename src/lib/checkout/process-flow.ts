import { getCheckoutOrder, markCheckoutEmailSent, setCheckoutFlowStatus } from "@/lib/checkout/orders";
import { getFlowPaymentStatus, isFlowApproved, isFlowRejected, mapFlowStatusLabel } from "@/lib/payments/flow";
import { sendCheckoutStatusEmail } from "@/lib/notifications/purchase-status";

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

  const shouldSendApproved = isFlowApproved(status.status) && !updated.meta.mail.approvedSentAt;
  const shouldSendRejected = isFlowRejected(status.status) && !updated.meta.mail.rejectedSentAt;
  const shouldSendPending =
    !isFlowApproved(status.status) &&
    !isFlowRejected(status.status) &&
    !updated.meta.mail.pendingSentAt;

  if (shouldSendApproved || shouldSendRejected || shouldSendPending) {
    try {
      await sendCheckoutStatusEmail({
        orderId,
        recipientEmail: updated.email || updated.meta.customer.buyerEmail,
        recipientName: updated.name || updated.meta.customer.buyerName,
        flowStatus: status.status,
        flowLabel: mapFlowStatusLabel(status.status),
        meta: updated.meta,
        checkoutUrl: updated.meta.flow.checkoutUrl || null,
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

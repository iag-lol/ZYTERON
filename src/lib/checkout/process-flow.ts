import { getCheckoutOrder, setCheckoutFlowCreation } from "@/lib/checkout/orders";
import { getFlowPaymentStatus, mapFlowStatusLabel } from "@/lib/payments/flow";
import { samePaymentToken, verifyPaymentObservation } from "@/lib/payments/verified-payment";

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

  if (order.storage !== "db") throw new Error("PAYMENT_PERSISTENCE_REQUIRED");
  const { paymentAttempt, attemptToken, flagAttemptReview } =
    await import("@/lib/payments/payment-attempt");
  const attempt = await paymentAttempt(token);
  if (attempt && (attempt.kind !== "CHECKOUT" || attempt.quote_id !== order.id))
    throw new Error("PAYMENT_ATTEMPT_MISMATCH");
  verifyPaymentObservation(
    status,
    attempt
      ? {
          id: attempt.commerce_order,
          amount: attempt.amount,
          flowOrder: Number(attempt.flow_order),
          token: attemptToken(attempt),
        }
      : {
          id: order.id,
          amount: order.meta.total,
          flowOrder: order.meta.flow.flowOrder,
          token: order.meta.flow.token,
        },
    token,
  );
  if (attempt && !samePaymentToken(token, order.meta.flow.token)) {
    if (status.status !== 2)
      return {
        orderId,
        flowStatus: status.status,
        flowLabel: mapFlowStatusLabel(status.status),
        quoteStatus: order.status,
      };
    if (order.meta.flow.status === 2 || attempt.amount !== order.meta.total) {
      await flagAttemptReview(token);
      throw new Error("RETIRED_CHECKOUT_PAYMENT_REQUIRES_REVIEW");
    }
    await setCheckoutFlowCreation({
      orderId: order.id,
      token,
      flowOrder: status.flowOrder,
      checkoutUrl: order.meta.flow.checkoutUrl || "",
    });
  }

  const { prisma } = await import("@/lib/prisma");
  const { parseObservation } = await import("@/lib/payments/pilot-protocol");
  const proof = parseObservation({ ...status });
  await prisma.$queryRaw`SELECT public.zyteron_apply_checkout(${orderId},${token},${status.flowOrder}::bigint,${status.amount}::int,${status.status}::int,${proof.paidAt}::timestamptz)`;
  return {
    orderId,
    flowStatus: status.status,
    flowLabel: mapFlowStatusLabel(status.status),
    quoteStatus: status.status === 2 ? "WON" : status.status === 1 ? "PENDING" : "LOST",
  };
}

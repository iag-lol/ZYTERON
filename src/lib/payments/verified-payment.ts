import { createHash, timingSafeEqual } from "node:crypto";
import type { FlowStatusResult } from "./flow";
import { parseObservation } from "./pilot-protocol";

export function samePaymentToken(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  if (!left || !right) return false;
  return timingSafeEqual(
    createHash("sha256").update(left).digest(),
    createHash("sha256").update(right).digest(),
  );
}

/** Only a signed provider response matching a persisted order may credit it. */
export function verifyPaymentObservation(
  status: FlowStatusResult,
  order: {
    id: string;
    amount: number;
    flowOrder: number | null | undefined;
    token: string | null | undefined;
  },
  token: string,
) {
  if (
    !samePaymentToken(token, order.token) ||
    status.commerceOrder !== order.id ||
    !Number.isSafeInteger(status.flowOrder) ||
    status.flowOrder !== order.flowOrder
  )
    throw new Error("PAYMENT_REFERENCE_MISMATCH");
  if (
    ![1, 2, 3, 4].includes(status.status) ||
    status.currency !== "CLP" ||
    !Number.isSafeInteger(status.amount) ||
    status.amount !== order.amount ||
    order.amount <= 0
  )
    throw new Error("PAYMENT_AMOUNT_OR_STATE_MISMATCH");
  if (status.status === 2) {
    const proof = status.paymentData;
    if (
      !proof ||
      proof.currency !== "CLP" ||
      Number(proof.amount) !== order.amount ||
      typeof proof.date !== "string" ||
      !proof.date.trim()
    )
      throw new Error("PAYMENT_EVIDENCE_MISSING");
    parseObservation({ ...status });
  }
  return status;
}

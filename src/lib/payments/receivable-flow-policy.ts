import { collectionArchive } from "@/lib/full-control/receivable-archive";
import { assertCheckoutAmount, PaymentTargetError } from "./invoice-payment-option";
export function payableReceivable(
  row: {
    clientId: string;
    currency: string;
    status: string;
    totalAmount: number;
    metadata: unknown;
    allocations: { amount: number }[];
  } | null,
  userId: string,
  expectedAmount: number,
) {
  if (
    !row ||
    row.clientId !== userId ||
    row.currency.trim() !== "CLP" ||
    collectionArchive(row.metadata)?.active ||
    ["PAID", "VOID", "VOIDED", "CANCELLED", "CANCELED"].includes(row.status)
  )
    throw new PaymentTargetError("Este cobro ya no está disponible para pagar.");
  const balance = Math.max(0, row.totalAmount - row.allocations.reduce((n, a) => n + a.amount, 0));
  assertCheckoutAmount(expectedAmount, balance);
  return balance;
}
export function receivablePaymentApplication(balance: number, amount: number, closed: boolean) {
  if (!Number.isSafeInteger(balance) || balance < 0 || !Number.isSafeInteger(amount) || amount <= 0)
    throw new Error("PAYMENT_AMOUNT_INVALID");
  // Un abono recibido durante el checkout queda como crédito; nunca se sobreaplica al documento.
  const allocated = closed ? 0 : Math.min(balance, amount);
  return { allocated, credit: amount - allocated, balance: balance - allocated };
}

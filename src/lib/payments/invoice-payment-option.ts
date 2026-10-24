type Invoice = {
  id: string;
  source?: "commercial" | "accounting";
  quoteId: string | null;
  balance: number;
  currency: string;
};

export class PaymentTargetError extends Error {}
type Quote = {
  id: string;
  billingType: string;
  payable: boolean;
  currency: string;
  stages: {
    amount: number;
    status: string;
    dueEnabled: boolean;
    channel: string;
  }[];
};

export function invoicePaymentOption(invoice: Invoice, quote?: Quote) {
  if (!(invoice.balance > 0)) return "SETTLED";
  if (invoice.source && invoice.currency === "CLP" && Number.isSafeInteger(invoice.balance))
    return "BOTH";
  if (!quote || quote.id !== invoice.quoteId || quote.currency !== invoice.currency)
    return "REVIEW";
  // Pagar un documento existente no autoriza una nueva suscripción mensual.
  if (quote.billingType !== "ONE_TIME") return "REVIEW";
  const stage = quote.stages.find(
    (row) => row.dueEnabled && ["READY", "REJECTED", "PROCESSING"].includes(row.status),
  );
  if (stage?.channel === "TRANSFER") return "TRANSFER";
  if (quote.payable && stage?.channel === "FLOW" && stage.amount === invoice.balance) return "FLOW";
  return "REVIEW";
}

export function assertCheckoutAmount(expected: number, current: number) {
  if (!Number.isSafeInteger(expected) || expected <= 0 || expected !== current)
    throw new PaymentTargetError(
      "El importe del cobro cambió. Actualiza la cuenta y revisa el saldo antes de pagar.",
    );
}

export function assertReceivableCheckout(input: {
  clientId: string;
  quoteId: string;
  stageKey: string;
  expectedAmount: number;
  receivable: {
    clientId: string;
    quoteId: string | null;
    stageKey: string | null;
    currency: string;
    balance: number;
    status: string;
    archived: boolean;
  } | null;
}) {
  const row = input.receivable;
  if (
    !row ||
    row.clientId !== input.clientId ||
    row.quoteId !== input.quoteId ||
    (row.stageKey && row.stageKey !== input.stageKey) ||
    row.currency.trim() !== "CLP" ||
    row.archived ||
    ["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(row.status)
  )
    throw new PaymentTargetError("El documento no está disponible para este pago.");
  assertCheckoutAmount(input.expectedAmount, row.balance);
}

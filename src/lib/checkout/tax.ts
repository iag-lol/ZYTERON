export const CHILE_IVA_RATE = 0.19;

export type CheckoutTotals = {
  grossSubtotal: number;
  discountAmount: number;
  netSubtotal: number;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
};

function roundAmount(value: number) {
  return Math.max(0, Math.round(Number(value) || 0));
}

export function computeCheckoutTotals(input: {
  grossSubtotal: number;
  netSubtotal: number;
  taxRate?: number;
}): CheckoutTotals {
  const taxRate = Number.isFinite(input.taxRate) ? Math.max(0, input.taxRate as number) : CHILE_IVA_RATE;
  const grossSubtotal = roundAmount(input.grossSubtotal);
  const netSubtotal = roundAmount(input.netSubtotal);
  const discountAmount = Math.max(0, grossSubtotal - netSubtotal);
  const taxAmount = roundAmount(netSubtotal * taxRate);
  const totalWithTax = roundAmount(netSubtotal + taxAmount);

  return {
    grossSubtotal,
    discountAmount,
    netSubtotal,
    taxRate,
    taxAmount,
    totalWithTax,
  };
}


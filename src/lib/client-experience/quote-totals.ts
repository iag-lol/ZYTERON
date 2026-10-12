export function quoteTotals(
  items: Array<{ qty: number; unitPrice: number; discountPct?: number }>,
  includeIva: boolean,
) {
  const net = items.reduce(
    (sum, i) => sum + i.qty * i.unitPrice * (1 - (i.discountPct || 0) / 100),
    0,
  );
  const discounts = items.reduce(
    (sum, i) => sum + (i.qty * i.unitPrice * (i.discountPct || 0)) / 100,
    0,
  );
  return {
    subtotal: Math.round(net),
    totalDescuento: Math.round(discounts),
    iva: includeIva ? Math.round(net * 0.19) : 0,
    grandTotal: Math.round(net + (includeIva ? net * 0.19 : 0)),
  };
}

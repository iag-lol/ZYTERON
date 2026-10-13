export function quoteTotals(
  items: Array<{ qty: number; unitPrice: number; discountPct?: number;taxable?:boolean }>,
  includeIva: boolean,
) {
  const net = items.reduce(
    (sum, i) => sum + i.qty * i.unitPrice * (1 - (i.discountPct || 0) / 100),
    0,
  );
  const taxableNet=items.filter(i=>i.taxable!==false).reduce((sum,i)=>sum+i.qty*i.unitPrice*(1-(i.discountPct||0)/100),0);
  const discounts = items.reduce(
    (sum, i) => sum + (i.qty * i.unitPrice * (i.discountPct || 0)) / 100,
    0,
  );
  return {
    subtotal: Math.round(net),
    totalDescuento: Math.round(discounts),
    iva: includeIva ? Math.round(taxableNet * 0.19) : 0,
    grandTotal: Math.round(net + (includeIva ? taxableNet * 0.19 : 0)),
  };
}

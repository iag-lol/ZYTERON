type PendingInvoice = { balance: number; currency: string; status: string; due: string | null };

export function billingInvoiceFromSearch(search: string, invoices: readonly { id: string }[]) {
  const id = new URLSearchParams(search).get("cobro");
  return id && invoices.some((invoice) => invoice.id === id) ? id : null;
}

export function pendingBilling<T extends PendingInvoice>(invoices: readonly T[]) {
  const pending = invoices
    .filter((invoice) => invoice.balance > 0)
    .sort((a, b) => {
      const overdue = Number(b.status === "Vencida") - Number(a.status === "Vencida");
      if (overdue) return overdue;
      return (a.due || "9999").localeCompare(b.due || "9999");
    });
  const totals = [...new Set(pending.map((invoice) => invoice.currency))].map((currency) => {
    const group = pending.filter((invoice) => invoice.currency === currency);
    return {
      currency,
      balance: group.reduce((sum, invoice) => sum + invoice.balance, 0),
      overdue: group
        .filter((invoice) => invoice.status === "Vencida")
        .reduce((sum, invoice) => sum + invoice.balance, 0),
      count: group.length,
    };
  });
  return { pending, totals };
}

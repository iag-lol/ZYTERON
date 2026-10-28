type CommercialPayment = { amount: number; currency: string; metadata: unknown };
type AccountingPayment = { id: string; amount: number };

function confirmedLinks(payment: CommercialPayment): string[] {
  const metadata = payment.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const record = metadata as Record<string, unknown>;
  const ids = record.portalAccountingPaymentIds;
  if (
    record.portalReconciliationConfirmed !== true ||
    !Array.isArray(ids) ||
    !ids.length ||
    ids.some((id) => typeof id !== "string" || !id) ||
    new Set(ids).size !== ids.length
  )
    return [];
  return ids as string[];
}

/** Keep ledger allocations intact; show the confirmed bank movements once in the customer history. */
export function commercialPaymentsForPortal<T extends CommercialPayment>(
  commercial: readonly T[],
  accounting: readonly AccountingPayment[],
): T[] {
  const uses = new Map<string, number>();
  for (const payment of commercial)
    for (const id of confirmedLinks(payment)) uses.set(id, (uses.get(id) || 0) + 1);
  return commercial.filter((payment) => {
    const ids = confirmedLinks(payment);
    if (
      payment.currency !== "CLP" ||
      !Number.isSafeInteger(payment.amount) ||
      payment.amount <= 0 ||
      !ids.length
    )
      return true;
    const rows = ids.map((id) => accounting.find((row) => row.id === id));
    if (
      ids.some((id) => uses.get(id) !== 1) ||
      rows.some((row) => !row || !Number.isSafeInteger(row.amount) || row.amount <= 0)
    )
      return true;
    return rows.reduce((sum, row) => sum + row!.amount, 0) !== payment.amount;
  });
}

export type QuoteCollectionState = "UNPAID" | "PARTIAL" | "PAID" | "CURRENT";
export type QuoteBilling = {
  source: "WEBSITE" | "CONTROL";
  frequency: "ONE_TIME" | "MONTHLY" | null;
  state: QuoteCollectionState;
  paid: number;
  balance: number;
  advance: number;
  finite: boolean;
  editable: boolean;
  basis: "QUOTE" | "CALENDAR" | "ISSUED_PERIODS";
  paidThrough?: string | null;
  monthlyAmount?: number | null;
  currency: string;
};
export type QuoteEvidence = {
  amount: number;
  paid: number;
  dueDate?: string | null;
  initial?: boolean;
};
/** Uses money assigned to this quote, never acceptance, card registration or client-wide credit. */
export function collectionSummary(input: {
  total: number;
  frequency: QuoteBilling["frequency"];
  finite: boolean;
  evidence: QuoteEvidence[];
  today: string;
}) {
  const paid = input.evidence.reduce((sum, row) => sum + Math.max(0, row.paid), 0);
  const target =
    input.frequency === "MONTHLY"
      ? input.evidence.reduce((sum, row) => sum + Math.max(0, row.amount), 0)
      : Math.max(0, input.total);
  const balance =
    input.frequency === "MONTHLY"
      ? input.evidence.reduce((sum, row) => sum + Math.max(0, row.amount - row.paid), 0)
      : Math.max(0, target - paid);
  const dueBalance = input.evidence
    .filter((row) => !row.dueDate || row.dueDate.slice(0, 10) <= input.today)
    .reduce((sum, row) => sum + Math.max(0, row.amount - row.paid), 0);
  const advance = input.evidence
    .filter((row) => row.initial || Boolean(row.dueDate && row.dueDate.slice(0, 10) > input.today))
    .reduce((sum, row) => sum + Math.max(0, row.paid), 0);
  const state: QuoteCollectionState =
    paid <= 0
      ? "UNPAID"
      : input.frequency === "MONTHLY" && !input.finite
        ? dueBalance <= 0
          ? "CURRENT"
          : "PARTIAL"
        : target > 0 && balance <= 0
          ? "PAID"
          : "PARTIAL";
  return { paid, balance, advance, state };
}
export function quoteClientKey(q: {
  clientId: string | null;
  contactEmail: string | null;
  companyName: string;
}) {
  return (
    q.clientId || `unlinked:${(q.contactEmail || q.companyName).trim().toLocaleLowerCase("es")}`
  );
}
export function recentQuotes<T extends { id: string; createdAt: string }>(items: readonly T[]) {
  return [...items].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}

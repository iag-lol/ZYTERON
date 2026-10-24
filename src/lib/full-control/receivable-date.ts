import { dueInstant } from "../payments/monthly-calendar";

type ReceivableDateSource = {
  clientId: string;
  status: string;
  totalAmount: number;
  dueAt: Date | null;
  allocations: Array<{ amount: number }>;
};
export function receivableDateChange(
  row: ReceivableDateSource | null,
  userId: string,
  input: { dueDate: string; expectedDueAt: string | null },
) {
  if (!row || row.clientId !== userId) throw Error("RECEIVABLE_NOT_FOUND");
  if (
    ["CANCELLED", "VOID", "PAID"].includes(row.status) ||
    row.allocations.reduce((n, a) => n + a.amount, 0) >= row.totalAmount
  )
    throw Error("RECEIVABLE_CLOSED");
  const date = dueInstant(input.dueDate);
  if (row.dueAt?.getTime() === date.getTime()) return { date, changed: false };
  if ((row.dueAt?.toISOString() ?? null) !== input.expectedDueAt) throw Error("RECEIVABLE_STALE");
  return { date, changed: true };
}

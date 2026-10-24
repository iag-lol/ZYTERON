type ArchiveMetadata = {
  active: boolean;
  reason: string;
  at: string;
  actorId: string | null;
  previousStatus: string;
  restoredAt?: string;
  restoredBy?: string | null;
  restoreReason?: string;
};
type Row = {
  clientId: string;
  status: string;
  totalAmount: number;
  dueAt: Date | null;
  metadata: unknown;
  allocations: Array<{ amount: number }>;
};
export function collectionArchive(metadata: unknown): ArchiveMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).adminCollectionArchive;
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as ArchiveMetadata).active === "boolean"
    ? (value as ArchiveMetadata)
    : null;
}
export function receivableArchiveChange(
  row: Row | null,
  userId: string,
  input: { operation: "archive" | "restore"; reason: string; expectedBalance: number },
  actorId: string | null,
  now = new Date(),
) {
  if (!row || row.clientId !== userId) throw Error("RECEIVABLE_NOT_FOUND");
  if (input.reason.trim().length < 5) throw Error("ARCHIVE_REASON_REQUIRED");
  const archive = collectionArchive(row.metadata);
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const applied = row.allocations.reduce((n, a) => n + a.amount, 0);
  const balance = Math.max(0, row.totalAmount - applied);
  if (input.operation === "archive" && row.status === "CANCELLED" && archive?.active) return null;
  if (balance !== input.expectedBalance) throw Error("RECEIVABLE_STALE");
  if (input.operation === "restore") {
    if (row.status !== "CANCELLED" || !archive?.active) throw Error("RECEIVABLE_NOT_RESTORABLE");
    const status =
      balance <= 0
        ? "PAID"
        : row.dueAt && row.dueAt < now
          ? "OVERDUE"
          : applied > 0
            ? "PARTIAL"
            : "PENDING";
    return {
      status,
      closedAt: status === "PAID" ? now : null,
      metadata: {
        ...metadata,
        adminCollectionArchive: {
          ...archive,
          active: false,
          restoredAt: now.toISOString(),
          restoredBy: actorId,
          restoreReason: input.reason.trim(),
        },
      },
    };
  }
  if (["CANCELLED", "CANCELED", "VOID", "VOIDED", "PAID"].includes(row.status) || balance <= 0)
    throw Error("RECEIVABLE_CLOSED");
  return {
    status: "CANCELLED",
    closedAt: now,
    metadata: {
      ...metadata,
      adminCollectionArchive: {
        active: true,
        reason: input.reason.trim(),
        at: now.toISOString(),
        actorId,
        previousStatus: row.status,
      } satisfies ArchiveMetadata,
    },
  };
}

export type ClientRecurring = {
  quoteId: string;
  quoteViewId: string;
  label: string;
  amount: number;
  currency: string;
  state: string;
  managedBy: string;
  nextDate: string | null;
  activatedAt: string | null;
  paidThrough: string | null;
  anchorDate: string | null;
  endsAt?: string | null;
  calendarEntries?: { period: string; date: string | null; amount: number }[];
};
export type RecurringCandidate = ClientRecurring & { approved: boolean; closed: boolean };
export function clientRecurringProjection(
  candidates: readonly RecurringCandidate[],
  archives: readonly { quote_id: string; native_quote_id: string | null; state: string }[],
) {
  return candidates.flatMap(({ approved, closed, ...plan }) => {
    const archive = archives.find(
      (a) => a.quote_id === plan.quoteViewId || a.native_quote_id === plan.quoteId,
    );
    if (!approved || closed || archive?.state === "ARCHIVED" || plan.amount <= 0) return [];
    return [
      {
        ...plan,
        state: archive?.state === "PENDING_CANCELLATION" ? "CANCEL_REQUESTED" : plan.state,
      },
    ];
  });
}
export const recurringStateLabel = (state: string) =>
  ({
    ACTIVE: "Activa",
    PAUSED: "Pausada",
    ASSIGNED: "Pendiente de activación",
    PENDING: "Pendiente de autorización",
    CANCEL_REQUESTED: "Cancelación en proceso",
    CANCELLED: "Cancelada",
    FAILED: "Requiere revisión",
  })[state] || "Pendiente de configuración";

export function recurringAssignmentVisible(
  status: string,
  controlState?: string,
  payment: { billingType?: string; enabled?: boolean } = { billingType: "SUBSCRIPTION" },
) {
  // enabled controla el inicio de pagos online, no la existencia del acuerdo mensual.
  if (payment.billingType !== "SUBSCRIPTION") return false;
  if (
    status === "LOST" ||
    ["CANCELLED", "DECLINED", "REJECTED", "EXPIRED"].includes(controlState || "")
  )
    return false;
  return (
    ["SENT", "WON"].includes(status) ||
    ["APPROVED", "SENT", "NEGOTIATING", "ACCEPTED"].includes(controlState || "") ||
    (!controlState && status === "PENDING")
  );
}

export function nativeProposalVisible(
  status: string,
  meta: { items?: unknown[]; controlState?: string },
) {
  if (status === "LOST") return false;
  if (["SENT", "WON"].includes(status)) return true;
  if (meta.controlState) return ["SENT", "NEGOTIATING", "ACCEPTED"].includes(meta.controlState);
  // Historical web proposals predate commercial states and remain available to their owner.
  return status === "PENDING";
}

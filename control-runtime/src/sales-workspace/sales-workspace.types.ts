export type WorkActor = { userId: string; role: "GERENTE_GENERAL" | "EJECUTIVA_VENTAS" };
export type Row = Record<string, unknown>;
export const stages = [
  "CONTACTED",
  "RESPONDED",
  "INTERESTED",
  "PROPOSAL",
  "ACCEPTED",
  "COMPLETED",
  "LOST",
] as const;
export const reviewStates = ["PENDING", "APPROVED", "REJECTED"] as const;

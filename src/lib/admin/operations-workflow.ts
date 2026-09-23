export const OPERATION_STAGE_KEYS = [
  "INTAKE",
  "QUALIFICATION",
  "DISCOVERY",
  "PROPOSAL",
  "QUOTE_SENT",
  "NEGOTIATION",
  "APPROVED",
  "INITIAL_PAYMENT",
  "WORK_ORDER",
  "PLANNING",
  "IN_PROGRESS",
  "CLIENT_REVIEW",
  "DELIVERY",
  "INVOICING",
  "COLLECTION",
  "CLOSED",
] as const;

export type OperationStage = (typeof OPERATION_STAGE_KEYS)[number];
export type OperationStatus = "ACTIVE" | "ON_HOLD" | "CANCELLED" | "CLOSED";
export type CommercialOutcome = "WON" | "LOST" | null;

export type OperationStageDefinition = {
  key: OperationStage;
  label: string;
  shortLabel: string;
  description: string;
  area: "COMERCIAL" | "OPERACIONES" | "FINANZAS";
};

export const OPERATION_STAGES: readonly OperationStageDefinition[] = [
  {
    key: "INTAKE",
    label: "Ingreso del cliente",
    shortLabel: "Ingreso",
    description: "Origen, datos mínimos y consentimiento registrados.",
    area: "COMERCIAL",
  },
  {
    key: "QUALIFICATION",
    label: "Calificación",
    shortLabel: "Calificación",
    description: "Necesidad, presupuesto, autoridad y urgencia validados.",
    area: "COMERCIAL",
  },
  {
    key: "DISCOVERY",
    label: "Levantamiento",
    shortLabel: "Levantamiento",
    description: "Objetivos, alcance, requisitos, riesgos y responsables definidos.",
    area: "COMERCIAL",
  },
  {
    key: "PROPOSAL",
    label: "Propuesta en preparación",
    shortLabel: "Propuesta",
    description: "Solución, alcance, hitos, precio y condiciones preparados.",
    area: "COMERCIAL",
  },
  {
    key: "QUOTE_SENT",
    label: "Cotización enviada",
    shortLabel: "Enviada",
    description: "Cotización versionada, enviada y con vigencia controlada.",
    area: "COMERCIAL",
  },
  {
    key: "NEGOTIATION",
    label: "Negociación",
    shortLabel: "Negociación",
    description: "Ajustes, objeciones y decisión comercial en seguimiento.",
    area: "COMERCIAL",
  },
  {
    key: "APPROVED",
    label: "Aprobación formal",
    shortLabel: "Aprobada",
    description: "Aceptación del cliente y condiciones finales respaldadas.",
    area: "COMERCIAL",
  },
  {
    key: "INITIAL_PAYMENT",
    label: "Abono inicial",
    shortLabel: "Abono",
    description: "Anticipo recibido o condición de inicio autorizada.",
    area: "FINANZAS",
  },
  {
    key: "WORK_ORDER",
    label: "Orden de trabajo",
    shortLabel: "OT",
    description: "OT emitida con alcance, prioridad, fechas y responsable.",
    area: "OPERACIONES",
  },
  {
    key: "PLANNING",
    label: "Planificación",
    shortLabel: "Planificación",
    description: "Proyecto, hitos, dependencias y materiales planificados.",
    area: "OPERACIONES",
  },
  {
    key: "IN_PROGRESS",
    label: "Ejecución",
    shortLabel: "Ejecución",
    description: "Trabajo en curso con avance y horas trazables.",
    area: "OPERACIONES",
  },
  {
    key: "CLIENT_REVIEW",
    label: "Revisión del cliente",
    shortLabel: "Revisión",
    description: "Entregable sometido a validación y correcciones controladas.",
    area: "OPERACIONES",
  },
  {
    key: "DELIVERY",
    label: "Entrega y aceptación",
    shortLabel: "Entrega",
    description: "Entrega final, aceptación y traspaso de accesos documentados.",
    area: "OPERACIONES",
  },
  {
    key: "INVOICING",
    label: "Facturación",
    shortLabel: "Facturación",
    description: "Documento tributario emitido y vinculado al expediente.",
    area: "FINANZAS",
  },
  {
    key: "COLLECTION",
    label: "Cobranza",
    shortLabel: "Cobranza",
    description: "Pagos conciliados, abonos aplicados y saldo controlado.",
    area: "FINANZAS",
  },
  {
    key: "CLOSED",
    label: "Cierre y postventa",
    shortLabel: "Cierre",
    description: "Saldo en cero, cierre documentado y postventa activada.",
    area: "FINANZAS",
  },
] as const;

const STAGE_INDEX = new Map(OPERATION_STAGE_KEYS.map((key, index) => [key, index]));

export function isOperationStage(value: unknown): value is OperationStage {
  return typeof value === "string" && STAGE_INDEX.has(value as OperationStage);
}

export function operationStageDefinition(stage: OperationStage) {
  return OPERATION_STAGES[STAGE_INDEX.get(stage) ?? 0];
}

export function operationStageProgress(stage: OperationStage) {
  const index = STAGE_INDEX.get(stage) ?? 0;
  return Math.round(((index + 1) / OPERATION_STAGE_KEYS.length) * 100);
}

export function nextOperationStage(stage: OperationStage): OperationStage | null {
  const index = STAGE_INDEX.get(stage) ?? 0;
  return OPERATION_STAGE_KEYS[index + 1] ?? null;
}

export function canTransitionOperation(input: {
  from: OperationStage;
  to: OperationStage;
  status?: OperationStatus;
  allowOverride?: boolean;
  overrideReason?: string;
  requiresInitialPayment?: boolean;
}) {
  if (input.from === input.to) return true;
  const hasAuditedOverride = Boolean(
    input.allowOverride && String(input.overrideReason || "").trim().length >= 8,
  );
  if (input.status === "CANCELLED" || input.status === "CLOSED") {
    return hasAuditedOverride;
  }
  const fromIndex = STAGE_INDEX.get(input.from) ?? 0;
  const toIndex = STAGE_INDEX.get(input.to) ?? 0;
  if (
    input.from === "APPROVED" &&
    input.to === "WORK_ORDER" &&
    input.requiresInitialPayment === false
  ) {
    return true;
  }
  return toIndex === fromIndex + 1 || hasAuditedOverride;
}

export type LegacyProcessSignals = {
  hasLead?: boolean;
  hasClient?: boolean;
  quoteStatus?: string | null;
  hasWorkOrder?: boolean;
  projectStatus?: string | null;
  hasInvoice?: boolean;
  billedAmount?: number;
  paidAmount?: number;
};

function normalized(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");
}

export function inferOperationStage(signals: LegacyProcessSignals): OperationStage {
  const billed = Math.max(0, Math.round(signals.billedAmount || 0));
  const paid = Math.max(0, Math.round(signals.paidAmount || 0));
  const projectStatus = normalized(signals.projectStatus);
  const quoteStatus = normalized(signals.quoteStatus);

  if (signals.hasInvoice && billed > 0 && paid >= billed) return "CLOSED";
  if (signals.hasInvoice && paid < billed) return "COLLECTION";
  if (signals.hasInvoice) return "INVOICING";
  if (["COMPLETED", "FINALIZADO", "DONE", "DELIVERED", "ENTREGADO"].includes(projectStatus))
    return "DELIVERY";
  if (["CLIENT_REVIEW", "REVISION", "EN_REVISION"].includes(projectStatus)) return "CLIENT_REVIEW";
  if (["ACTIVE", "IN_PROGRESS", "EN_CURSO", "EJECUCION"].includes(projectStatus))
    return "IN_PROGRESS";
  if (projectStatus || signals.hasWorkOrder)
    return signals.hasWorkOrder ? "WORK_ORDER" : "PLANNING";
  if (quoteStatus === "WON" || quoteStatus.includes("GANAD") || quoteStatus === "APPROVED") {
    return paid > 0 ? "INITIAL_PAYMENT" : "APPROVED";
  }
  if (quoteStatus === "SENT" || quoteStatus === "ENVIADA") return "QUOTE_SENT";
  if (quoteStatus) return "PROPOSAL";
  if (signals.hasClient) return "QUALIFICATION";
  return signals.hasLead ? "INTAKE" : "INTAKE";
}

export type FinancialPosition = {
  total: number;
  paid: number;
  pending: number;
  credit: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERPAID";
};

export function calculateFinancialPosition(total: number, paid: number): FinancialPosition {
  const safeTotal = Math.max(0, Math.round(Number.isFinite(total) ? total : 0));
  const safePaid = Math.max(0, Math.round(Number.isFinite(paid) ? paid : 0));
  const pending = Math.max(0, safeTotal - safePaid);
  const credit = Math.max(0, safePaid - safeTotal);
  const status =
    safePaid <= 0
      ? "PENDING"
      : safePaid < safeTotal
        ? "PARTIAL"
        : safePaid === safeTotal
          ? "PAID"
          : "OVERPAID";

  return { total: safeTotal, paid: safePaid, pending, credit, status };
}

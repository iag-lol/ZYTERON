import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getClients,
  getProjects,
  getQuotes,
  getSales,
  getTaxDocuments,
  safeSelect,
  type Client,
  type EnrichedQuote,
  type Project,
  type Sale,
  type TaxDocument,
  type WorkOrder,
} from "@/lib/admin/repository";
import {
  OPERATION_STAGE_KEYS,
  OPERATION_STAGES,
  calculateFinancialPosition,
  canTransitionOperation,
  inferOperationStage,
  isOperationStage,
  nextOperationStage,
  operationStageProgress,
  type OperationStage,
  type OperationStatus,
} from "@/lib/admin/operations-workflow";

export const PROCESS_STATUSES = ["ACTIVE", "ON_HOLD", "CLOSED", "CANCELLED"] as const;
export const PROCESS_OUTCOMES = ["WON", "LOST"] as const;
export const PROCESS_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export type ProcessStatus = (typeof PROCESS_STATUSES)[number];
export type ProcessOutcome = (typeof PROCESS_OUTCOMES)[number] | null;
export type ProcessPriority = (typeof PROCESS_PRIORITIES)[number];
export type OperationSource = "PERSISTED" | "LEGACY";
export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export type OperationAlert = {
  code: string;
  severity: AlertSeverity;
  label: string;
};

export type OperationFinancials = {
  quoted: number;
  billed: number;
  paid: number;
  pending: number;
  credit: number;
  overdueReceivables: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERPAID";
};

export type OperationRelations = {
  quoteId: string | null;
  workOrderId: string | null;
  projectId: string | null;
  taxDocumentId: string | null;
  leadCount: number;
  quoteCount: number;
  workOrderCount: number;
  projectCount: number;
  documentCount: number;
};

export type OperationRecord = {
  id: string;
  code: string;
  title: string;
  stage: OperationStage;
  stageProgress: number;
  status: ProcessStatus;
  outcome: ProcessOutcome;
  priority: ProcessPriority;
  owner: string | null;
  requiresInitialPayment: boolean;
  nextAction: string | null;
  nextActionAt: string | null;
  blockedReason: string | null;
  lostReason: string | null;
  cancelReason: string | null;
  version: number;
  startedAt: string;
  updatedAt: string;
  closedAt: string | null;
  source: OperationSource;
  client: {
    id: string | null;
    name: string;
    email: string | null;
    company: string | null;
  };
  financials: OperationFinancials;
  relations: OperationRelations;
  alerts: OperationAlert[];
  lastEvent: {
    title: string;
    createdAt: string;
  } | null;
};

export type OperationCandidate = {
  id: string;
  label: string;
  clientId: string | null;
  status?: string | null;
  total?: number;
};

export type OperationsMetrics = {
  total: number;
  active: number;
  onHold: number;
  closed: number;
  cancelled: number;
  won: number;
  lost: number;
  overdueActions: number;
  withoutNextAction: number;
  criticalAlerts: number;
  pendingAmount: number;
  paidAmount: number;
};

export type OperationsDashboard = {
  operations: OperationRecord[];
  metrics: OperationsMetrics;
  stageCounts: Record<OperationStage, number>;
  schemaReady: boolean;
  mode: "NATIVE" | "HYBRID" | "LEGACY";
  warning: string | null;
  quoteCandidates: OperationCandidate[];
  clientCandidates: OperationCandidate[];
};

type LegacyData = {
  clients: Client[];
  quotes: EnrichedQuote[];
  workOrders: WorkOrder[];
  projects: Project[];
  sales: Sale[];
  taxDocuments: TaxDocument[];
};

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function dateIso(value: Date | string | null | undefined, fallback = new Date(0).toISOString()) {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function normalized(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");
}

export function normalizeProcessStatus(value: unknown): ProcessStatus {
  const status = normalized(value);
  return PROCESS_STATUSES.includes(status as ProcessStatus) ? (status as ProcessStatus) : "ACTIVE";
}

export function normalizeProcessOutcome(value: unknown): ProcessOutcome {
  const outcome = normalized(value);
  return PROCESS_OUTCOMES.includes(outcome as Exclude<ProcessOutcome, null>)
    ? (outcome as Exclude<ProcessOutcome, null>)
    : null;
}

export function normalizeProcessPriority(value: unknown): ProcessPriority {
  const priority = normalized(value);
  return PROCESS_PRIORITIES.includes(priority as ProcessPriority)
    ? (priority as ProcessPriority)
    : "NORMAL";
}

function normalizeStage(value: unknown): OperationStage {
  return isOperationStage(value) ? value : "INTAKE";
}

function quotePaymentTotal(quote?: EnrichedQuote | null) {
  return numberValue(quote?.meta?.payment?.totalPaid);
}

function quoteRequiresInitialPayment(
  input?: {
    message?: string | null;
    meta?: EnrichedQuote["meta"];
  } | null,
) {
  let payment = input?.meta?.payment;
  if (!payment && input?.message) {
    try {
      payment = JSON.parse(input.message)?.payment;
    } catch {
      payment = undefined;
    }
  }
  if (!payment?.enabled) return false;
  if (payment.billingType === "SUBSCRIPTION") return true;
  if (payment.planMode === "DELIVERY") return false;
  return payment.planMode === "FULL" || payment.planMode === "SPLIT";
}

function isPaidTaxDocument(document: { paymentStatus?: string | null }) {
  return ["PAID", "PAGADA", "PAGADO"].includes(normalized(document.paymentStatus));
}

function isOverdueReceivable(
  receivable: { status?: string | null; dueAt?: Date | string | null },
  now = new Date(),
) {
  if (normalized(receivable.status) === "OVERDUE") return true;
  if (!receivable.dueAt || ["PAID", "VOID"].includes(normalized(receivable.status))) return false;
  const dueAt = new Date(receivable.dueAt);
  return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < now.getTime();
}

export function suggestedNextAction(stage: OperationStage) {
  const suggestions: Record<OperationStage, string> = {
    INTAKE: "Validar datos de contacto y origen",
    QUALIFICATION: "Calificar necesidad, presupuesto y urgencia",
    DISCOVERY: "Agendar levantamiento de alcance",
    PROPOSAL: "Preparar propuesta técnica y comercial",
    QUOTE_SENT: "Confirmar recepción y fecha de decisión",
    NEGOTIATION: "Resolver objeciones y registrar acuerdo",
    APPROVED: "Confirmar condiciones de inicio",
    INITIAL_PAYMENT: "Conciliar anticipo o autorizar excepción",
    WORK_ORDER: "Emitir y asignar orden de trabajo",
    PLANNING: "Definir hitos, fechas y responsables",
    IN_PROGRESS: "Actualizar avance, bloqueos y horas",
    CLIENT_REVIEW: "Solicitar validación formal del cliente",
    DELIVERY: "Documentar entrega y aceptación",
    INVOICING: "Emitir y enviar documento tributario",
    COLLECTION: "Conciliar pagos y gestionar saldo",
    CLOSED: "Programar seguimiento de postventa",
  };
  return suggestions[stage];
}

export function deriveOperationAlerts(
  operation: Pick<
    OperationRecord,
    | "stage"
    | "status"
    | "outcome"
    | "nextAction"
    | "nextActionAt"
    | "client"
    | "financials"
    | "relations"
    | "updatedAt"
  >,
  now = new Date(),
) {
  const alerts: OperationAlert[] = [];
  const nextActionAt = operation.nextActionAt ? new Date(operation.nextActionAt) : null;
  const isOpen = operation.status === "ACTIVE" || operation.status === "ON_HOLD";

  if (
    isOpen &&
    nextActionAt &&
    !Number.isNaN(nextActionAt.getTime()) &&
    nextActionAt.getTime() < now.getTime()
  ) {
    alerts.push({
      code: "NEXT_ACTION_OVERDUE",
      severity: "CRITICAL",
      label: "Próxima acción vencida",
    });
  } else if (isOpen && !operation.nextAction) {
    alerts.push({ code: "NEXT_ACTION_MISSING", severity: "WARNING", label: "Sin próxima acción" });
  }

  if (operation.financials.overdueReceivables > 0) {
    alerts.push({
      code: "PAYMENT_OVERDUE",
      severity: "CRITICAL",
      label: `${operation.financials.overdueReceivables} cuenta${operation.financials.overdueReceivables === 1 ? "" : "s"} vencida${operation.financials.overdueReceivables === 1 ? "" : "s"}`,
    });
  }
  if (operation.status === "ON_HOLD") {
    alerts.push({ code: "ON_HOLD", severity: "WARNING", label: "Proceso en pausa" });
  }
  if (!operation.client.id) {
    alerts.push({ code: "CLIENT_MISSING", severity: "WARNING", label: "Cliente sin vincular" });
  }
  if (
    ["APPROVED", "INITIAL_PAYMENT", "WORK_ORDER", "PLANNING", "IN_PROGRESS"].includes(
      operation.stage,
    ) &&
    operation.relations.workOrderCount === 0
  ) {
    alerts.push({
      code: "WORK_ORDER_MISSING",
      severity: "WARNING",
      label: "Falta orden de trabajo",
    });
  }
  if (
    ["PLANNING", "IN_PROGRESS", "CLIENT_REVIEW", "DELIVERY"].includes(operation.stage) &&
    operation.relations.projectCount === 0
  ) {
    alerts.push({
      code: "PROJECT_MISSING",
      severity: "WARNING",
      label: "Falta proyecto vinculado",
    });
  }
  if (
    operation.status === "CLOSED" &&
    operation.financials.pending > 0 &&
    operation.outcome !== "LOST"
  ) {
    alerts.push({
      code: "CLOSED_WITH_BALANCE",
      severity: "CRITICAL",
      label: "Cerrado con saldo pendiente",
    });
  }

  const updatedAt = new Date(operation.updatedAt);
  const staleThreshold = now.getTime() - 14 * 24 * 60 * 60 * 1000;
  if (isOpen && !Number.isNaN(updatedAt.getTime()) && updatedAt.getTime() < staleThreshold) {
    alerts.push({ code: "STALE", severity: "INFO", label: "Sin actividad por más de 14 días" });
  }

  return alerts;
}

function alertWeight(alert: OperationAlert) {
  if (alert.severity === "CRITICAL") return 3;
  if (alert.severity === "WARNING") return 2;
  return 1;
}

export function summarizeOperations(operations: OperationRecord[]): OperationsMetrics {
  return operations.reduce<OperationsMetrics>(
    (metrics, operation) => {
      metrics.total += 1;
      if (operation.status === "ACTIVE") metrics.active += 1;
      if (operation.status === "ON_HOLD") metrics.onHold += 1;
      if (operation.status === "CLOSED") metrics.closed += 1;
      if (operation.status === "CANCELLED") metrics.cancelled += 1;
      if (operation.outcome === "WON") metrics.won += 1;
      if (operation.outcome === "LOST") metrics.lost += 1;
      if (operation.alerts.some((alert) => alert.code === "NEXT_ACTION_OVERDUE"))
        metrics.overdueActions += 1;
      if (
        (operation.status === "ACTIVE" || operation.status === "ON_HOLD") &&
        !operation.nextAction
      ) {
        metrics.withoutNextAction += 1;
      }
      metrics.criticalAlerts += operation.alerts.filter(
        (alert) => alert.severity === "CRITICAL",
      ).length;
      metrics.pendingAmount += operation.financials.pending;
      metrics.paidAmount += operation.financials.paid;
      return metrics;
    },
    {
      total: 0,
      active: 0,
      onHold: 0,
      closed: 0,
      cancelled: 0,
      won: 0,
      lost: 0,
      overdueActions: 0,
      withoutNextAction: 0,
      criticalAlerts: 0,
      pendingAmount: 0,
      paidAmount: 0,
    },
  );
}

function emptyStageCounts() {
  return Object.fromEntries(OPERATION_STAGE_KEYS.map((stage) => [stage, 0])) as Record<
    OperationStage,
    number
  >;
}

function buildStageCounts(operations: OperationRecord[]) {
  const counts = emptyStageCounts();
  for (const operation of operations) counts[operation.stage] += 1;
  return counts;
}

function sortOperations(operations: OperationRecord[]) {
  return operations.sort((left, right) => {
    const leftAlert = Math.max(0, ...left.alerts.map(alertWeight));
    const rightAlert = Math.max(0, ...right.alerts.map(alertWeight));
    if (leftAlert !== rightAlert) return rightAlert - leftAlert;

    const leftDue = left.nextActionAt
      ? new Date(left.nextActionAt).getTime()
      : Number.POSITIVE_INFINITY;
    const rightDue = right.nextActionAt
      ? new Date(right.nextActionAt).getTime()
      : Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

async function loadLegacyData(): Promise<LegacyData> {
  const [clients, quotes, workOrders, projects, sales, taxDocuments] = await Promise.all([
    getClients(),
    getQuotes(),
    safeSelect<WorkOrder>(
      "WorkOrder",
      "id, code, source, status, priority, quoteId, saleId, clientId, title, description, scope, plannedDate, dueDate, estimatedHours, actualHours, budget, assignedTo, notes, pdfUrl, completedAt, closedAt, cancelledAt, createdAt, updatedAt",
      { orderBy: "createdAt", limit: 1000 },
    ),
    getProjects(),
    getSales(),
    getTaxDocuments(),
  ]);

  return { clients, quotes, workOrders, projects, sales, taxDocuments };
}

function clientIdentity(
  client: Client | undefined,
  fallback?: { name?: string | null; email?: string | null; company?: string | null },
) {
  return {
    id: client?.id || null,
    name:
      client?.name ||
      fallback?.name ||
      fallback?.company ||
      fallback?.email ||
      "Cliente sin vincular",
    email: client?.email || fallback?.email || null,
    company: client?.company || fallback?.company || null,
  };
}

function legacyFinancials(input: { quote?: EnrichedQuote | null; documents: TaxDocument[] }) {
  const quoted = numberValue(input.quote?.totalAmount);
  const billed = input.documents.reduce(
    (total, document) => total + numberValue(document.totalAmount),
    0,
  );
  const paidFromDocuments = input.documents.reduce(
    (total, document) =>
      total + (isPaidTaxDocument(document) ? numberValue(document.totalAmount) : 0),
    0,
  );
  const paid = Math.max(paidFromDocuments, quotePaymentTotal(input.quote));
  const position = calculateFinancialPosition(billed || quoted, paid);

  return {
    quoted,
    billed,
    paid: position.paid,
    pending: position.pending,
    credit: position.credit,
    overdueReceivables: input.documents.filter((document) => {
      const dueAt = document.dueDate ? new Date(document.dueDate) : null;
      return Boolean(
        dueAt &&
        !Number.isNaN(dueAt.getTime()) &&
        dueAt.getTime() < Date.now() &&
        !isPaidTaxDocument(document),
      );
    }).length,
    status: position.status,
  } satisfies OperationFinancials;
}

function buildLegacyRecord(input: {
  id: string;
  code: string;
  title: string;
  client: ReturnType<typeof clientIdentity>;
  quote?: EnrichedQuote | null;
  workOrders?: WorkOrder[];
  projects?: Project[];
  documents?: TaxDocument[];
  stage: OperationStage;
  status?: ProcessStatus;
  outcome?: ProcessOutcome;
  priority?: unknown;
  owner?: string | null;
  requiresInitialPayment?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}): OperationRecord {
  const workOrders = input.workOrders || [];
  const projects = input.projects || [];
  const documents = input.documents || [];
  const financials = legacyFinancials({ quote: input.quote, documents });
  const fallbackDate = dateIso(input.createdAt, new Date().toISOString());
  const record: OperationRecord = {
    id: input.id,
    code: input.code,
    title: input.title,
    stage: input.stage,
    stageProgress: operationStageProgress(input.stage),
    status: input.status || (input.stage === "CLOSED" ? "CLOSED" : "ACTIVE"),
    outcome: input.outcome || null,
    priority: normalizeProcessPriority(input.priority),
    owner: input.owner || null,
    requiresInitialPayment:
      input.requiresInitialPayment ?? quoteRequiresInitialPayment(input.quote || null),
    nextAction: suggestedNextAction(input.stage),
    nextActionAt: null,
    blockedReason: null,
    lostReason: input.outcome === "LOST" ? "Resultado legado: cotización perdida" : null,
    cancelReason: null,
    version: 0,
    startedAt: fallbackDate,
    updatedAt: dateIso(input.updatedAt || input.createdAt, fallbackDate),
    closedAt:
      input.stage === "CLOSED" ? dateIso(input.updatedAt || input.createdAt, fallbackDate) : null,
    source: "LEGACY",
    client: input.client,
    financials,
    relations: {
      quoteId: input.quote?.id || null,
      workOrderId: workOrders[0]?.id || null,
      projectId: projects[0]?.id || null,
      taxDocumentId: documents[0]?.id || null,
      leadCount: 0,
      quoteCount: input.quote ? 1 : 0,
      workOrderCount: workOrders.length,
      projectCount: projects.length,
      documentCount: documents.length,
    },
    alerts: [],
    lastEvent: null,
  };
  record.alerts = deriveOperationAlerts(record);
  return record;
}

function deriveLegacyOperations(
  legacy: LegacyData,
  linkedIds: {
    quotes: Set<string>;
    workOrders: Set<string>;
    projects: Set<string>;
  },
) {
  const clientsById = new Map(legacy.clients.map((client) => [client.id, client]));
  const clientsByEmail = new Map(
    legacy.clients
      .filter((client) => client.email)
      .map((client) => [String(client.email).trim().toLowerCase(), client]),
  );
  const consumedWorkOrders = new Set(linkedIds.workOrders);
  const consumedProjects = new Set(linkedIds.projects);
  const operations: OperationRecord[] = [];

  for (const quote of legacy.quotes) {
    if (linkedIds.quotes.has(quote.id)) continue;
    const quoteWorkOrders = legacy.workOrders.filter((order) => order.quoteId === quote.id);
    const quoteProjects = legacy.projects.filter((project) => project.quoteId === quote.id);
    quoteWorkOrders.forEach((order) => consumedWorkOrders.add(order.id));
    quoteProjects.forEach((project) => consumedProjects.add(project.id));

    const saleIds = new Set(
      legacy.sales.filter((sale) => sale.invoiceRef === `COT:${quote.id}`).map((sale) => sale.id),
    );
    const projectIds = new Set(quoteProjects.map((project) => project.id));
    const documents = legacy.taxDocuments.filter(
      (document) =>
        document.quoteId === quote.id ||
        Boolean(document.saleId && saleIds.has(document.saleId)) ||
        Boolean(document.projectId && projectIds.has(document.projectId)),
    );
    const billed = documents.reduce(
      (total, document) => total + numberValue(document.totalAmount),
      0,
    );
    const paid = Math.max(
      quotePaymentTotal(quote),
      documents.reduce(
        (total, document) =>
          total + (isPaidTaxDocument(document) ? numberValue(document.totalAmount) : 0),
        0,
      ),
    );
    const stage = inferOperationStage({
      hasClient: Boolean(quote.userId),
      quoteStatus: quote.status,
      hasWorkOrder: quoteWorkOrders.length > 0,
      projectStatus: quoteProjects[0]?.status,
      hasInvoice: documents.length > 0,
      billedAmount: billed,
      paidAmount: paid,
    });
    const quoteStatus = normalized(quote.status);
    const client =
      (quote.userId ? clientsById.get(quote.userId) : undefined) ||
      clientsByEmail.get(
        String(quote.email || "")
          .trim()
          .toLowerCase(),
      );
    const title =
      quote.meta?.projectTypeLabel ||
      quote.company ||
      quote.name ||
      `Cotización ${quote.displayNumber}`;

    operations.push(
      buildLegacyRecord({
        id: `legacy-quote-${quote.id}`,
        code: quote.displayNumber,
        title,
        client: clientIdentity(client, quote),
        quote,
        workOrders: quoteWorkOrders,
        projects: quoteProjects,
        documents,
        stage,
        status: quoteStatus === "LOST" ? "CLOSED" : stage === "CLOSED" ? "CLOSED" : "ACTIVE",
        outcome: quoteStatus === "WON" ? "WON" : quoteStatus === "LOST" ? "LOST" : null,
        priority:
          quote.meta?.priority || quoteProjects[0]?.priority || quoteWorkOrders[0]?.priority,
        owner: quoteProjects[0]?.owner || quoteWorkOrders[0]?.assignedTo || null,
        createdAt: quote.createdAt,
        updatedAt: quoteProjects[0]?.createdAt || quoteWorkOrders[0]?.updatedAt || quote.createdAt,
      }),
    );
  }

  for (const project of legacy.projects) {
    if (consumedProjects.has(project.id)) continue;
    const documents = legacy.taxDocuments.filter((document) => document.projectId === project.id);
    const stage = inferOperationStage({
      hasClient: Boolean(project.clientId),
      projectStatus: project.status,
      hasInvoice: documents.length > 0,
      billedAmount: documents.reduce((sum, document) => sum + numberValue(document.totalAmount), 0),
      paidAmount: documents.reduce(
        (sum, document) =>
          sum + (isPaidTaxDocument(document) ? numberValue(document.totalAmount) : 0),
        0,
      ),
    });
    operations.push(
      buildLegacyRecord({
        id: `legacy-project-${project.id}`,
        code: `PROY-${project.id.slice(0, 8).toUpperCase()}`,
        title: project.title,
        client: clientIdentity(project.clientId ? clientsById.get(project.clientId) : undefined),
        projects: [project],
        documents,
        stage,
        status:
          normalized(project.status) === "CANCELLED"
            ? "CANCELLED"
            : stage === "CLOSED"
              ? "CLOSED"
              : "ACTIVE",
        priority: project.priority,
        owner: project.owner,
        createdAt: project.createdAt,
      }),
    );
  }

  for (const order of legacy.workOrders) {
    if (consumedWorkOrders.has(order.id)) continue;
    const stage = inferOperationStage({ hasClient: Boolean(order.clientId), hasWorkOrder: true });
    const orderStatus = normalized(order.status);
    operations.push(
      buildLegacyRecord({
        id: `legacy-work-order-${order.id}`,
        code: order.code,
        title: order.title,
        client: clientIdentity(order.clientId ? clientsById.get(order.clientId) : undefined),
        workOrders: [order],
        stage,
        status:
          orderStatus === "CANCELLED"
            ? "CANCELLED"
            : orderStatus === "CLOSED"
              ? "CLOSED"
              : "ACTIVE",
        priority: order.priority,
        owner: order.assignedTo,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }),
    );
  }

  return operations;
}

const processSelect = Prisma.validator<Prisma.ClientProcessSelect>()({
  id: true,
  code: true,
  title: true,
  stage: true,
  status: true,
  outcome: true,
  priority: true,
  owner: true,
  requiresInitialPayment: true,
  nextAction: true,
  nextActionAt: true,
  blockedReason: true,
  lostReason: true,
  cancelReason: true,
  version: true,
  startedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: { id: true, name: true, email: true, company: true },
  },
  leads: { select: { id: true } },
  quotes: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      message: true,
      total: true,
      status: true,
      createdAt: true,
    },
  },
  workOrders: {
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true },
  },
  projects: {
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true },
  },
  taxDocuments: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      totalAmount: true,
      paymentStatus: true,
      dueDate: true,
      createdAt: true,
    },
  },
  documents: { select: { id: true } },
  receivables: {
    select: {
      id: true,
      totalAmount: true,
      status: true,
      dueAt: true,
      allocations: {
        select: {
          amount: true,
          payment: { select: { status: true } },
        },
      },
    },
  },
  payments: {
    select: {
      amount: true,
      status: true,
      allocations: { select: { amount: true } },
    },
  },
  events: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { title: true, createdAt: true },
  },
});

type PersistedProcess = Prisma.ClientProcessGetPayload<{ select: typeof processSelect }>;

function persistedFinancials(process: PersistedProcess): OperationFinancials {
  const primaryQuote = process.quotes[0];
  const quoted = numberValue(primaryQuote?.total);
  const activeReceivables = process.receivables.filter(
    (receivable) => normalized(receivable.status) !== "VOID",
  );
  const billedFromReceivables = activeReceivables.reduce(
    (total, receivable) => total + numberValue(receivable.totalAmount),
    0,
  );
  const billedFromDocuments = process.taxDocuments.reduce(
    (total, document) => total + numberValue(document.totalAmount),
    0,
  );
  const billed = billedFromReceivables || billedFromDocuments;
  const paidFromAllocations = activeReceivables.reduce(
    (total, receivable) =>
      total +
      receivable.allocations.reduce(
        (allocated, allocation) =>
          allocated +
          (normalized(allocation.payment.status) === "CONFIRMED"
            ? numberValue(allocation.amount)
            : 0),
        0,
      ),
    0,
  );
  const paidFromDocuments = process.taxDocuments.reduce(
    (total, document) =>
      total + (isPaidTaxDocument(document) ? numberValue(document.totalAmount) : 0),
    0,
  );
  const quotePaid = primaryQuote
    ? numberValue(
        (() => {
          try {
            const raw = JSON.parse(primaryQuote.message || "{}");
            return raw?.payment?.totalPaid;
          } catch {
            return 0;
          }
        })(),
      )
    : 0;
  const paid =
    activeReceivables.length > 0 ? paidFromAllocations : Math.max(paidFromDocuments, quotePaid);
  const confirmedPayments = process.payments
    .filter((payment) => normalized(payment.status) === "CONFIRMED")
    .reduce((total, payment) => total + numberValue(payment.amount), 0);
  const processAllocations = process.payments.reduce(
    (total, payment) =>
      total +
      payment.allocations.reduce((sum, allocation) => sum + numberValue(allocation.amount), 0),
    0,
  );
  const position = calculateFinancialPosition(billed || quoted, paid);

  return {
    quoted,
    billed,
    paid: position.paid,
    pending: position.pending,
    credit: Math.max(position.credit, confirmedPayments - processAllocations),
    overdueReceivables: activeReceivables.filter((receivable) => isOverdueReceivable(receivable))
      .length,
    status: position.status,
  };
}

function mapPersistedProcess(process: PersistedProcess): OperationRecord {
  const stage = normalizeStage(process.stage);
  const primaryQuote = process.quotes[0];
  const financials = persistedFinancials(process);
  const record: OperationRecord = {
    id: process.id,
    code: process.code,
    title: process.title,
    stage,
    stageProgress: operationStageProgress(stage),
    status: normalizeProcessStatus(process.status),
    outcome: normalizeProcessOutcome(process.outcome),
    priority: normalizeProcessPriority(process.priority),
    owner: process.owner,
    requiresInitialPayment: process.requiresInitialPayment,
    nextAction: process.nextAction,
    nextActionAt: process.nextActionAt?.toISOString() || null,
    blockedReason: process.blockedReason,
    lostReason: process.lostReason,
    cancelReason: process.cancelReason,
    version: process.version,
    startedAt: process.startedAt.toISOString(),
    updatedAt: process.updatedAt.toISOString(),
    closedAt: process.closedAt?.toISOString() || null,
    source: "PERSISTED",
    client: clientIdentity(process.client || undefined, primaryQuote || undefined),
    financials,
    relations: {
      quoteId: primaryQuote?.id || null,
      workOrderId: process.workOrders[0]?.id || null,
      projectId: process.projects[0]?.id || null,
      taxDocumentId: process.taxDocuments[0]?.id || null,
      leadCount: process.leads.length,
      quoteCount: process.quotes.length,
      workOrderCount: process.workOrders.length,
      projectCount: process.projects.length,
      documentCount: process.documents.length + process.taxDocuments.length,
    },
    alerts: [],
    lastEvent: process.events[0]
      ? { title: process.events[0].title, createdAt: process.events[0].createdAt.toISOString() }
      : null,
  };
  record.alerts = deriveOperationAlerts(record);
  return record;
}

function prismaErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String((error as { code?: unknown }).code || "");
}

export function isOperationsSchemaMissingError(error: unknown) {
  const code = prismaErrorCode(error);
  if (code === "P2021" || code === "P2022") return true;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("clientprocess") &&
    (message.includes("does not exist") ||
      message.includes("unknown column") ||
      message.includes("column"))
  );
}

export async function getOperationsDashboard(): Promise<OperationsDashboard> {
  const legacy = await loadLegacyData();
  let persisted: PersistedProcess[] = [];
  let schemaReady = true;
  let warning: string | null = null;

  try {
    persisted = await prisma.clientProcess.findMany({
      select: processSelect,
      orderBy: [{ status: "asc" }, { nextActionAt: "asc" }, { updatedAt: "desc" }],
      take: 1000,
    });
  } catch (error) {
    if (!isOperationsSchemaMissingError(error)) throw error;
    schemaReady = false;
    warning =
      "La migración de operaciones aún no está instalada. Se muestra una vista derivada y de solo lectura desde cotizaciones, OTs y proyectos existentes.";
  }

  const nativeOperations = persisted.map(mapPersistedProcess);
  const linkedIds = {
    quotes: new Set(persisted.flatMap((process) => process.quotes.map((quote) => quote.id))),
    workOrders: new Set(
      persisted.flatMap((process) => process.workOrders.map((order) => order.id)),
    ),
    projects: new Set(
      persisted.flatMap((process) => process.projects.map((project) => project.id)),
    ),
  };
  const legacyOperations = deriveLegacyOperations(legacy, linkedIds);
  const operations = sortOperations([...nativeOperations, ...legacyOperations]);
  const quoteCandidates = legacy.quotes
    .filter((quote) => !linkedIds.quotes.has(quote.id))
    .map((quote) => ({
      id: quote.id,
      clientId: quote.userId || null,
      label: `${quote.displayNumber} · ${quote.company || quote.name || quote.email}`,
      status: quote.status,
      total: numberValue(quote.totalAmount),
    }));
  const clientCandidates = legacy.clients
    .filter((client) => normalized(client.role) === "CLIENT" || !client.role)
    .map((client) => ({
      id: client.id,
      clientId: client.id,
      label: `${client.company || client.name} · ${client.email || "sin email"}`,
    }));

  return {
    operations,
    metrics: summarizeOperations(operations),
    stageCounts: buildStageCounts(operations),
    schemaReady,
    mode: !schemaReady ? "LEGACY" : legacyOperations.length > 0 ? "HYBRID" : "NATIVE",
    warning,
    quoteCandidates,
    clientCandidates,
  };
}

export class OperationInputError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OperationInputError";
    this.code = code;
  }
}

function processCode() {
  return `OP-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function quoteInitialStage(quote: { status: string; message: string | null }) {
  let paidAmount = 0;
  try {
    const meta = JSON.parse(quote.message || "{}");
    paidAmount = numberValue(meta?.payment?.totalPaid);
  } catch {
    paidAmount = 0;
  }
  return inferOperationStage({
    hasClient: true,
    quoteStatus: quote.status,
    paidAmount,
  });
}

type EnsureProcessInput = {
  quoteId?: string | null;
  clientId?: string | null;
  actorId?: string | null;
};

export async function ensureClientProcess(input: EnsureProcessInput) {
  const quoteId = String(input.quoteId || "").trim();
  const clientId = String(input.clientId || "").trim();
  if (!quoteId && !clientId) {
    throw new OperationInputError("SOURCE_REQUIRED", "Selecciona un cliente o una cotización.");
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        if (quoteId) {
          const quote = await tx.quote.findUnique({
            where: { id: quoteId },
            select: {
              id: true,
              processId: true,
              userId: true,
              name: true,
              email: true,
              company: true,
              message: true,
              status: true,
            },
          });
          if (!quote) throw new OperationInputError("QUOTE_NOT_FOUND", "Cotización no encontrada.");
          if (quote.processId) {
            return { id: quote.processId, created: false, source: "QUOTE" as const };
          }

          const explicitClient = clientId
            ? await tx.user.findUnique({
                where: { id: clientId },
                select: { id: true, role: true },
              })
            : null;
          if (clientId && (!explicitClient || explicitClient.role !== "CLIENT")) {
            throw new OperationInputError("CLIENT_NOT_FOUND", "Cliente no encontrado.");
          }
          const clientByEmail =
            !clientId && !quote.userId && quote.email
              ? await tx.user.findUnique({
                  where: { email: quote.email.trim().toLowerCase() },
                  select: { id: true, role: true },
                })
              : null;
          const resolvedClientId =
            explicitClient?.id ||
            quote.userId ||
            (clientByEmail?.role === "CLIENT" ? clientByEmail.id : null);

          const stage = quoteInitialStage(quote);
          const quoteStatus = normalized(quote.status);
          const process = await tx.clientProcess.create({
            data: {
              code: processCode(),
              clientId: resolvedClientId,
              title: quote.company || quote.name || `Servicio para ${quote.email}`,
              stage,
              status: quoteStatus === "LOST" || stage === "CLOSED" ? "CLOSED" : "ACTIVE",
              outcome: quoteStatus === "WON" ? "WON" : quoteStatus === "LOST" ? "LOST" : null,
              requiresInitialPayment: quoteRequiresInitialPayment(quote),
              nextAction: suggestedNextAction(stage),
              lostReason: quoteStatus === "LOST" ? "Cotización marcada como perdida" : null,
              events: {
                create: {
                  actorId: input.actorId || null,
                  eventType: "PROCESS_CREATED",
                  fromStage: null,
                  toStage: stage,
                  title: "Expediente creado desde cotización",
                  notes: `Cotización ${quote.id} vinculada como origen.`,
                  metadata: {
                    quoteId: quote.id,
                    source: "QUOTE",
                    actorType: input.actorId ? "PORTAL_ADMIN" : "LEGACY_ADMIN",
                  },
                },
              },
            },
            select: { id: true },
          });

          const linked = await tx.quote.updateMany({
            where: { id: quote.id, processId: null },
            data: { processId: process.id, userId: quote.userId || resolvedClientId },
          });
          if (linked.count !== 1) {
            throw new OperationInputError(
              "ENSURE_RACE",
              "La cotización fue enlazada por otra operación.",
            );
          }

          await Promise.all([
            tx.workOrder.updateMany({
              where: { quoteId: quote.id, processId: null },
              data: { processId: process.id },
            }),
            tx.project.updateMany({
              where: { quoteId: quote.id, processId: null },
              data: { processId: process.id },
            }),
            tx.sale.updateMany({
              where: { invoiceRef: `COT:${quote.id}`, processId: null },
              data: { processId: process.id },
            }),
            tx.taxDocument.updateMany({
              where: { quoteId: quote.id, processId: null },
              data: { processId: process.id },
            }),
          ]);

          return { id: process.id, created: true, source: "QUOTE" as const };
        }

        const client = await tx.user.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, company: true, role: true },
        });
        if (!client || client.role !== "CLIENT") {
          throw new OperationInputError("CLIENT_NOT_FOUND", "Cliente no encontrado.");
        }
        const existing = await tx.clientProcess.findFirst({
          where: { clientId: client.id, status: { in: ["ACTIVE", "ON_HOLD"] } },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });
        if (existing) return { id: existing.id, created: false, source: "CLIENT" as const };

        const process = await tx.clientProcess.create({
          data: {
            code: processCode(),
            clientId: client.id,
            title: `Nuevo servicio · ${client.company || client.name}`,
            stage: "QUALIFICATION",
            status: "ACTIVE",
            nextAction: suggestedNextAction("QUALIFICATION"),
            events: {
              create: {
                actorId: input.actorId || null,
                eventType: "PROCESS_CREATED",
                fromStage: null,
                toStage: "QUALIFICATION",
                title: "Expediente creado desde cliente",
                notes: `Cliente ${client.id} vinculado como origen.`,
                metadata: {
                  clientId: client.id,
                  source: "CLIENT",
                  actorType: input.actorId ? "PORTAL_ADMIN" : "LEGACY_ADMIN",
                },
              },
            },
          },
          select: { id: true },
        });
        return { id: process.id, created: true, source: "CLIENT" as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof OperationInputError && error.code === "ENSURE_RACE" && quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        select: { processId: true },
      });
      if (quote?.processId)
        return { id: quote.processId, created: false, source: "QUOTE" as const };
    }
    throw error;
  }
}

/** Mantiene el expediente alineado cuando cambia el estado comercial de una cotización. */
export async function syncClientProcessFromQuoteStatus(input: {
  quoteId: string;
  actorId?: string | null;
}) {
  const ensured = await ensureClientProcess({
    quoteId: input.quoteId,
    actorId: input.actorId,
  });

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: input.quoteId },
      select: { status: true },
    });
    const process = await tx.clientProcess.findUnique({
      where: { id: ensured.id },
      select: {
        id: true,
        stage: true,
        status: true,
        outcome: true,
        version: true,
      },
    });
    if (!quote || !process) {
      throw new OperationInputError(
        "PROCESS_NOT_FOUND",
        "No fue posible sincronizar el expediente de la cotización.",
      );
    }

    const quoteStatus = normalized(quote.status);
    const currentStage = normalizeStage(process.stage);
    const desiredStage: OperationStage =
      quoteStatus === "WON"
        ? "APPROVED"
        : quoteStatus === "SENT"
          ? "QUOTE_SENT"
          : quoteStatus === "LOST"
            ? currentStage
            : "PROPOSAL";
    const currentIndex = OPERATION_STAGE_KEYS.indexOf(currentStage);
    const desiredIndex = OPERATION_STAGE_KEYS.indexOf(desiredStage);
    const nextStage = desiredIndex > currentIndex ? desiredStage : currentStage;
    const nextStatus: ProcessStatus =
      quoteStatus === "LOST"
        ? "CLOSED"
        : normalizeProcessStatus(process.status) === "CANCELLED"
          ? "CANCELLED"
          : "ACTIVE";
    const nextOutcome: ProcessOutcome =
      quoteStatus === "WON" ? "WON" : quoteStatus === "LOST" ? "LOST" : null;
    const changed =
      nextStage !== currentStage ||
      nextStatus !== normalizeProcessStatus(process.status) ||
      nextOutcome !== normalizeProcessOutcome(process.outcome);

    if (!changed) return { ...ensured, updated: false };

    const updated = await tx.clientProcess.updateMany({
      where: { id: process.id, version: process.version },
      data: {
        stage: nextStage,
        status: nextStatus,
        outcome: nextOutcome,
        nextAction: quoteStatus === "LOST" ? null : suggestedNextAction(nextStage),
        lostReason: quoteStatus === "LOST" ? "Cotización marcada como perdida" : null,
        closedAt: quoteStatus === "LOST" ? new Date() : null,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new OperationInputError(
        "VERSION_CONFLICT",
        "El expediente cambió mientras se sincronizaba. Vuelve a intentarlo.",
      );
    }

    await tx.clientProcessEvent.create({
      data: {
        processId: process.id,
        actorId: input.actorId || null,
        eventType: "QUOTE_STATUS_SYNCED",
        fromStage: currentStage,
        toStage: nextStage,
        title: `Cotización actualizada a ${quoteStatus}`,
        notes: "El expediente se sincronizó automáticamente con el estado comercial.",
        metadata: { quoteId: input.quoteId, quoteStatus },
      },
    });

    return { ...ensured, updated: true };
  });
}

export type TransitionAssessmentInput = {
  fromStage: OperationStage;
  toStage: OperationStage;
  currentStatus: ProcessStatus;
  nextStatus: ProcessStatus;
  currentOutcome: ProcessOutcome;
  nextOutcome: ProcessOutcome;
  currentRequiresInitialPayment?: boolean;
  requiresInitialPayment?: boolean;
  allowOverride?: boolean;
  reason?: string | null;
};

export type TransitionAssessment = {
  allowed: boolean;
  requiresOverride: boolean;
  requiresReason: boolean;
  message: string | null;
};

export function assessProcessTransition(input: TransitionAssessmentInput): TransitionAssessment {
  const reason = String(input.reason || "").trim();
  const normalStage =
    input.fromStage === input.toStage ||
    nextOperationStage(input.fromStage) === input.toStage ||
    (input.fromStage === "APPROVED" &&
      input.toStage === "WORK_ORDER" &&
      input.requiresInitialPayment === false);
  const reopensTerminal =
    (input.currentStatus === "CLOSED" || input.currentStatus === "CANCELLED") &&
    (input.nextStatus === "ACTIVE" || input.nextStatus === "ON_HOLD");
  const changesTerminalRecord =
    (input.currentStatus === "CLOSED" || input.currentStatus === "CANCELLED") &&
    (input.fromStage !== input.toStage ||
      input.currentStatus !== input.nextStatus ||
      input.currentOutcome !== input.nextOutcome);
  const closesBeforeFinalStage =
    input.nextStatus === "CLOSED" && input.toStage !== "CLOSED" && input.nextOutcome !== "LOST";
  const winsBeforeApproval =
    input.nextOutcome === "WON" &&
    OPERATION_STAGE_KEYS.indexOf(input.toStage) < OPERATION_STAGE_KEYS.indexOf("APPROVED");
  const clearsLostOutcome =
    input.currentOutcome === "LOST" && input.nextOutcome !== input.currentOutcome;
  const waivesInitialPayment =
    input.currentRequiresInitialPayment === true && input.requiresInitialPayment === false;
  const requiresOverride =
    !normalStage ||
    reopensTerminal ||
    changesTerminalRecord ||
    closesBeforeFinalStage ||
    winsBeforeApproval ||
    clearsLostOutcome ||
    waivesInitialPayment;
  const requiresReason =
    requiresOverride ||
    Boolean(input.allowOverride) ||
    (input.nextStatus === "ON_HOLD" && input.currentStatus !== "ON_HOLD") ||
    input.nextStatus === "CANCELLED" ||
    input.nextOutcome === "LOST";

  if (requiresOverride && !input.allowOverride) {
    return {
      allowed: false,
      requiresOverride,
      requiresReason,
      message: "El salto, retroceso o reapertura requiere marcar excepción autorizada.",
    };
  }
  if (requiresReason && reason.length < 8) {
    return {
      allowed: false,
      requiresOverride,
      requiresReason,
      message:
        "Registra una razón de al menos 8 caracteres para auditar la excepción, pausa o cierre.",
    };
  }

  const workflowAllows = canTransitionOperation({
    from: input.fromStage,
    to: input.toStage,
    status: input.currentStatus as OperationStatus,
    allowOverride: input.allowOverride,
    overrideReason: reason,
    requiresInitialPayment: input.requiresInitialPayment,
  });
  if (!workflowAllows && input.fromStage !== input.toStage) {
    return {
      allowed: false,
      requiresOverride: true,
      requiresReason: true,
      message: "La transición no respeta la secuencia operativa.",
    };
  }

  return { allowed: true, requiresOverride, requiresReason, message: null };
}

export type TransitionProcessInput = {
  processId: string;
  toStage: OperationStage;
  status: ProcessStatus;
  outcome: ProcessOutcome;
  priority?: ProcessPriority;
  owner?: string | null;
  nextAction?: string | null;
  nextActionAt?: Date | null;
  requiresInitialPayment: boolean;
  allowOverride?: boolean;
  reason?: string | null;
  actorId?: string | null;
  expectedVersion?: number;
};

export async function transitionClientProcess(input: TransitionProcessInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.clientProcess.findUnique({
      where: { id: input.processId },
      select: {
        id: true,
        stage: true,
        status: true,
        outcome: true,
        requiresInitialPayment: true,
        blockedReason: true,
        lostReason: true,
        cancelReason: true,
        version: true,
      },
    });
    if (!current) throw new OperationInputError("PROCESS_NOT_FOUND", "Expediente no encontrado.");

    const fromStage = normalizeStage(current.stage);
    const currentStatus = normalizeProcessStatus(current.status);
    const currentOutcome = normalizeProcessOutcome(current.outcome);
    const status =
      input.toStage === "CLOSED" ? "CLOSED" : input.outcome === "LOST" ? "CLOSED" : input.status;
    const assessment = assessProcessTransition({
      fromStage,
      toStage: input.toStage,
      currentStatus,
      nextStatus: status,
      currentOutcome,
      nextOutcome: input.outcome,
      currentRequiresInitialPayment: current.requiresInitialPayment,
      requiresInitialPayment: input.requiresInitialPayment,
      allowOverride: input.allowOverride,
      reason: input.reason,
    });
    if (!assessment.allowed) {
      throw new OperationInputError(
        "INVALID_TRANSITION",
        assessment.message || "Transición inválida.",
      );
    }
    if (typeof input.expectedVersion === "number" && input.expectedVersion !== current.version) {
      throw new OperationInputError(
        "PROCESS_CONFLICT",
        "El expediente fue actualizado por otra sesión. Recarga antes de guardar.",
      );
    }

    const owner = input.owner?.trim() || null;
    const nextAction = input.nextAction?.trim() || null;
    const reason = input.reason?.trim() || null;
    const eventType = assessment.requiresOverride
      ? "PROCESS_OVERRIDE"
      : fromStage !== input.toStage
        ? "PROCESS_STAGE_CHANGED"
        : "PROCESS_UPDATED";

    const updated = await tx.clientProcess.updateMany({
      where: { id: current.id, version: current.version },
      data: {
        stage: input.toStage,
        status,
        outcome: input.outcome,
        priority: input.priority || undefined,
        owner,
        requiresInitialPayment: input.requiresInitialPayment,
        nextAction,
        nextActionAt: input.nextActionAt ?? null,
        blockedReason: status === "ON_HOLD" ? reason || current.blockedReason : null,
        lostReason: input.outcome === "LOST" ? reason || current.lostReason : null,
        cancelReason: status === "CANCELLED" ? reason || current.cancelReason : null,
        closedAt: status === "CLOSED" || status === "CANCELLED" ? new Date() : null,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new OperationInputError(
        "PROCESS_CONFLICT",
        "El expediente fue actualizado por otra sesión. Recarga antes de guardar.",
      );
    }

    await tx.clientProcessEvent.create({
      data: {
        actorId: input.actorId || null,
        processId: current.id,
        eventType,
        fromStage,
        toStage: input.toStage,
        title:
          fromStage === input.toStage
            ? "Información operativa actualizada"
            : `Etapa actualizada: ${fromStage} → ${input.toStage}`,
        notes: reason,
        metadata: {
          override: assessment.requiresOverride || Boolean(input.allowOverride),
          previousStatus: currentStatus,
          status,
          previousOutcome: currentOutcome,
          outcome: input.outcome,
          previousRequiresInitialPayment: current.requiresInitialPayment,
          requiresInitialPayment: input.requiresInitialPayment,
          nextAction,
          nextActionAt: input.nextActionAt?.toISOString() || null,
          version: current.version + 1,
          actorType: input.actorId ? "PORTAL_ADMIN" : "LEGACY_ADMIN",
        },
      },
    });

    return {
      id: current.id,
      stage: input.toStage,
      status,
      outcome: input.outcome,
      version: current.version + 1,
    };
  });
}

export function operationStageGroups() {
  return ["COMERCIAL", "OPERACIONES", "FINANZAS"].map((area) => ({
    area,
    stages: OPERATION_STAGES.filter((stage) => stage.area === area),
  }));
}

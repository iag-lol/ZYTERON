import { Prisma, type Payment, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_CLP_AMOUNT = 2_147_483_647;
const CONFIRMED_PAYMENT_STATUS = "CONFIRMED";
const VOIDED_PAYMENT_STATUS = "VOIDED";
const CANCELLED_RECEIVABLE_STATUSES = new Set(["CANCELLED", "CANCELED", "VOID", "VOIDED"]);

export const CLIENT_PAYMENT_METHODS = ["BANK_TRANSFER", "CARD", "CASH", "CHECK", "OTHER"] as const;

export type ClientPaymentMethod = (typeof CLIENT_PAYMENT_METHODS)[number];
export type ClientPaymentSource = "MANUAL" | "FLOW" | "TRANSFER_PROOF" | "SUBSCRIPTION" | "IMPORT";

export class ClientFinanceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400, options?: ErrorOptions) {
    super(message, options);
    this.name = "ClientFinanceError";
    this.code = code;
    this.status = status;
  }
}

export class FinanceSchemaUnavailableError extends ClientFinanceError {
  constructor(options?: ErrorOptions) {
    super(
      "FINANCE_SCHEMA_UNAVAILABLE",
      "El módulo de pagos todavía no está habilitado en la base de datos. Aplica la migración financiera y vuelve a intentar.",
      503,
      options,
    );
    this.name = "FinanceSchemaUnavailableError";
  }
}

type PrismaLikeError = {
  code?: unknown;
  message?: unknown;
  meta?: unknown;
};

function prismaErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "";
  return String((error as PrismaLikeError).code || "").trim();
}

export function isFinanceSchemaUnavailable(error: unknown) {
  if (error instanceof FinanceSchemaUnavailableError) return true;

  const code = prismaErrorCode(error);
  if (code === "P2021" || code === "P2022") return true;

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "string"
        ? error.toLowerCase()
        : "";

  const mentionsFinanceModel = [
    "receivable",
    "paymentallocation",
    "payment",
    "payment_allocation",
  ].some((model) => message.includes(model.toLowerCase()));

  return (
    mentionsFinanceModel &&
    (message.includes("does not exist") ||
      message.includes("no existe") ||
      message.includes("unknown column") ||
      (message.includes("column") && message.includes("not found")))
  );
}

export function isFinanceSchemaUnavailableError(
  error: unknown,
): error is FinanceSchemaUnavailableError {
  return isFinanceSchemaUnavailable(error);
}

function isRetryableTransactionError(error: unknown) {
  const code = prismaErrorCode(error);
  if (code === "P2034") return true;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("40001") ||
    message.includes("serialization failure") ||
    message.includes("deadlock")
  );
}

function isUniqueConstraintError(error: unknown) {
  return prismaErrorCode(error) === "P2002";
}

function positiveClpAmount(value: number, field = "Monto") {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_CLP_AMOUNT) {
    throw new ClientFinanceError(
      "INVALID_AMOUNT",
      `${field} debe ser un entero positivo en pesos chilenos y no superar ${MAX_CLP_AMOUNT}.`,
    );
  }
  return value;
}

function normalizedText(value: string | null | undefined, maxLength: number) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function jsonMetadata(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function paymentTargetKey(target: PaymentTarget) {
  if (target.receivableId) return `receivable:${target.receivableId}`;
  if (target.taxDocumentId) return `tax-document:${target.taxDocumentId}`;
  if (target.quoteId && target.quoteStageKey) {
    return `quote-stage:${target.quoteId}:${target.quoteStageKey}`;
  }
  if (target.quoteId) return `quote:${target.quoteId}`;
  return "client-credit";
}

export type AllocationCandidate = {
  id: string;
  totalAmount: number;
  appliedAmount: number;
};

export type AllocationPlan = {
  allocations: Array<{ receivableId: string; amount: number }>;
  allocatedAmount: number;
  creditAmount: number;
};

/**
 * Distribuye un pago en el orden recibido. El remanente nunca se fuerza sobre
 * una deuda ya pagada: permanece como crédito del cliente.
 */
export function buildAllocationPlan(
  paymentAmount: number,
  candidates: readonly AllocationCandidate[],
): AllocationPlan {
  const amount = positiveClpAmount(paymentAmount);
  let available = amount;
  const allocations: AllocationPlan["allocations"] = [];

  for (const candidate of candidates) {
    if (available <= 0) break;
    const total = Math.max(0, Math.round(candidate.totalAmount));
    const applied = Math.max(0, Math.round(candidate.appliedAmount));
    const outstanding = Math.max(0, total - applied);
    const allocated = Math.min(outstanding, available);
    if (allocated <= 0) continue;
    allocations.push({ receivableId: candidate.id, amount: allocated });
    available -= allocated;
  }

  return {
    allocations,
    allocatedAmount: amount - available,
    creditAmount: available,
  };
}

export type ReceivableCollectionStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";

export function deriveReceivableCollectionStatus(input: {
  totalAmount: number;
  appliedAmount: number;
  dueAt?: Date | null;
  currentStatus?: string | null;
  now?: Date;
}): ReceivableCollectionStatus {
  if (CANCELLED_RECEIVABLE_STATUSES.has(String(input.currentStatus || "").toUpperCase())) {
    return "CANCELLED";
  }
  const total = Math.max(0, Math.round(input.totalAmount));
  const applied = Math.max(0, Math.round(input.appliedAmount));
  if (total > 0 && applied >= total) return "PAID";
  const now = input.now || new Date();
  if (input.dueAt && input.dueAt.getTime() < now.getTime()) return "OVERDUE";
  if (applied > 0) return "PARTIAL";
  return "PENDING";
}

export function assertExternalPaymentMatches(input: {
  expectedAmount: number;
  reportedAmount?: number;
  reportedCurrency?: string;
}) {
  const expected = positiveClpAmount(Math.round(input.expectedAmount), "Monto esperado");
  if (input.reportedAmount !== undefined) {
    if (!Number.isSafeInteger(input.reportedAmount) || input.reportedAmount !== expected) {
      throw new ClientFinanceError(
        "PAYMENT_AMOUNT_MISMATCH",
        `El proveedor informó $${Math.round(input.reportedAmount || 0)} y se esperaban $${expected}.`,
        409,
      );
    }
  }
  if (input.reportedCurrency && input.reportedCurrency.trim().toUpperCase() !== "CLP") {
    throw new ClientFinanceError(
      "PAYMENT_CURRENCY_MISMATCH",
      `El proveedor informó una moneda no admitida (${input.reportedCurrency}).`,
      409,
    );
  }
}

export type PaymentTarget = {
  receivableId?: string;
  quoteId?: string;
  quoteStageKey?: string;
  strictQuoteStage?: boolean;
  taxDocumentId?: string;
  targetTotalAmount?: number;
};

function assertSingleTarget(target: PaymentTarget) {
  const selected = [target.receivableId, target.quoteId, target.taxDocumentId].filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (selected.length > 1) {
    throw new ClientFinanceError(
      "AMBIGUOUS_PAYMENT_TARGET",
      "Selecciona solo una cuenta por cobrar, cotización o documento tributario.",
    );
  }
  if (target.quoteStageKey && !target.quoteId) {
    throw new ClientFinanceError(
      "INVALID_PAYMENT_TARGET",
      "Una etapa de cobro requiere una cotización asociada.",
    );
  }
}

export type RecordClientPaymentInput = PaymentTarget & {
  clientId: string;
  amount: number;
  method: ClientPaymentMethod;
  source?: ClientPaymentSource;
  receivedAt?: Date;
  reference?: string;
  notes?: string;
  proofUrl?: string;
  provider?: string;
  providerPaymentId?: string;
  commerceOrder?: string;
  idempotencyKey?: string;
  processId?: string;
  recordedById?: string;
  metadata?: Record<string, unknown>;
};

export type RecordedPaymentResult = {
  created: boolean;
  paymentId: string;
  status: string;
  amount: number;
  allocatedAmount: number;
  creditAmount: number;
  allocations: Array<{ receivableId: string; amount: number }>;
};

type FinanceTransaction = Prisma.TransactionClient;

type TargetReceivable = {
  id: string;
  clientId: string;
  totalAmount: number;
  status: string;
  dueAt: Date | null;
  taxDocumentId: string | null;
  currency: string;
};

function assertClientOwnership(
  actualClientId: string | null | undefined,
  expectedClientId: string,
  label: string,
) {
  if (!actualClientId || actualClientId !== expectedClientId) {
    throw new ClientFinanceError(
      "PAYMENT_TARGET_FORBIDDEN",
      `${label} no pertenece al cliente seleccionado.`,
      403,
    );
  }
}

async function ensureTargetReceivables(
  tx: FinanceTransaction,
  input: RecordClientPaymentInput,
): Promise<TargetReceivable[]> {
  assertSingleTarget(input);

  if (input.receivableId) {
    const receivable = await tx.receivable.findUnique({
      where: { id: input.receivableId },
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        status: true,
        dueAt: true,
        taxDocumentId: true,
        currency: true,
      },
    });
    if (!receivable) {
      throw new ClientFinanceError("RECEIVABLE_NOT_FOUND", "La cuenta por cobrar no existe.", 404);
    }
    assertClientOwnership(receivable.clientId, input.clientId, "La cuenta por cobrar");
    if (CANCELLED_RECEIVABLE_STATUSES.has(receivable.status.toUpperCase())) {
      throw new ClientFinanceError(
        "RECEIVABLE_CANCELLED",
        "La cuenta por cobrar seleccionada está cancelada.",
        409,
      );
    }
    if (receivable.currency.toUpperCase() !== "CLP") {
      throw new ClientFinanceError(
        "PAYMENT_CURRENCY_MISMATCH",
        "La cuenta por cobrar no está expresada en pesos chilenos.",
        409,
      );
    }
    return [receivable];
  }

  if (input.quoteId) {
    const quote = await tx.quote.findUnique({
      where: { id: input.quoteId },
      select: { id: true, userId: true, total: true, createdAt: true, processId: true },
    });
    if (!quote) throw new ClientFinanceError("QUOTE_NOT_FOUND", "La cotización no existe.", 404);
    assertClientOwnership(quote.userId, input.clientId, "La cotización");

    const existing = await tx.receivable.findMany({
      where: {
        clientId: input.clientId,
        quoteId: quote.id,
        status: { notIn: [...CANCELLED_RECEIVABLE_STATUSES] },
        ...(input.quoteStageKey
          ? input.strictQuoteStage
            ? { quoteStageKey: input.quoteStageKey }
            : { OR: [{ quoteStageKey: input.quoteStageKey }, { quoteStageKey: null }] }
          : {}),
      },
      orderBy: [{ dueAt: "asc" }, { issuedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        status: true,
        dueAt: true,
        taxDocumentId: true,
        quoteStageKey: true,
        currency: true,
      },
    });
    if (existing.length > 0) {
      if (!input.quoteStageKey) return existing;
      const exactStage = existing.filter(
        (receivable) => receivable.quoteStageKey === input.quoteStageKey,
      );
      if (input.strictQuoteStage) return exactStage;
      return exactStage.length > 0
        ? exactStage
        : existing.filter((receivable) => receivable.quoteStageKey === null);
    }

    const totalAmount = positiveClpAmount(
      Math.round(input.targetTotalAmount ?? quote.total),
      "Monto de la cuenta por cobrar",
    );
    const stageKey = normalizedText(input.quoteStageKey, 80);
    const receivable = await tx.receivable.create({
      data: {
        sourceKey: stageKey ? `quote-stage:${quote.id}:${stageKey}` : `quote:${quote.id}`,
        clientId: input.clientId,
        processId: input.processId || quote.processId,
        quoteId: quote.id,
        quoteStageKey: stageKey,
        description: stageKey
          ? `Cotización ${quote.id} · etapa ${stageKey}`
          : `Cotización ${quote.id}`,
        kind: input.source === "SUBSCRIPTION" ? "SUBSCRIPTION_CYCLE" : "QUOTE_STAGE",
        currency: "CLP",
        totalAmount,
        status: "PENDING",
        issuedAt: quote.createdAt,
      },
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        status: true,
        dueAt: true,
        taxDocumentId: true,
        currency: true,
      },
    });
    return [receivable];
  }

  if (input.taxDocumentId) {
    const document = await tx.taxDocument.findUnique({
      where: { id: input.taxDocumentId },
      select: {
        id: true,
        clientId: true,
        quoteId: true,
        projectId: true,
        processId: true,
        type: true,
        documentNumber: true,
        totalAmount: true,
        issueDate: true,
        dueDate: true,
      },
    });
    if (!document) {
      throw new ClientFinanceError(
        "TAX_DOCUMENT_NOT_FOUND",
        "El documento tributario no existe.",
        404,
      );
    }
    assertClientOwnership(document.clientId, input.clientId, "El documento tributario");

    let existing = await tx.receivable.findMany({
      where: {
        clientId: input.clientId,
        status: { notIn: [...CANCELLED_RECEIVABLE_STATUSES] },
        OR: [
          { taxDocumentId: document.id },
          ...(document.quoteId ? [{ quoteId: document.quoteId }] : []),
        ],
      },
      orderBy: [{ dueAt: "asc" }, { issuedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        status: true,
        dueAt: true,
        taxDocumentId: true,
        quoteStageKey: true,
        currency: true,
      },
    });

    if (existing.length > 0) {
      const directlyLinked = existing.filter(
        (receivable) => receivable.taxDocumentId === document.id,
      );
      if (directlyLinked.length > 0) existing = directlyLinked;
      const withoutDocument = existing.filter((receivable) => !receivable.taxDocumentId);
      if (withoutDocument.length > 0) {
        await tx.receivable.updateMany({
          where: { id: { in: withoutDocument.map((receivable) => receivable.id) } },
          data: { taxDocumentId: document.id },
        });
        existing = existing.map((receivable) => ({
          ...receivable,
          taxDocumentId: receivable.taxDocumentId || document.id,
        }));
      }
      return existing;
    }

    const totalAmount = positiveClpAmount(
      Math.round(input.targetTotalAmount ?? document.totalAmount ?? 0),
      "Total del documento tributario",
    );
    const reference = [document.type, document.documentNumber].filter(Boolean).join(" ");
    const receivable = await tx.receivable.create({
      data: {
        sourceKey: `tax-document:${document.id}`,
        clientId: input.clientId,
        processId: input.processId || document.processId,
        quoteId: document.quoteId,
        taxDocumentId: document.id,
        projectId: document.projectId,
        description: reference || `Documento tributario ${document.id}`,
        kind: "INVOICE",
        currency: "CLP",
        totalAmount,
        status: "PENDING",
        issuedAt: document.issueDate || new Date(),
        dueAt: document.dueDate,
      },
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        status: true,
        dueAt: true,
        taxDocumentId: true,
        currency: true,
      },
    });
    return [receivable];
  }

  return [];
}

async function appliedAmountsByReceivable(tx: FinanceTransaction, receivableIds: string[]) {
  const totals = new Map<string, number>();
  if (receivableIds.length === 0) return totals;

  const allocations = await tx.paymentAllocation.findMany({
    where: {
      receivableId: { in: receivableIds },
      payment: { status: CONFIRMED_PAYMENT_STATUS },
    },
    select: { receivableId: true, amount: true },
  });
  for (const allocation of allocations) {
    totals.set(
      allocation.receivableId,
      (totals.get(allocation.receivableId) || 0) + allocation.amount,
    );
  }
  return totals;
}

async function refreshReceivableStates(tx: FinanceTransaction, receivableIds: string[]) {
  if (receivableIds.length === 0) return [] as string[];
  const receivables = await tx.receivable.findMany({
    where: { id: { in: receivableIds } },
    select: {
      id: true,
      totalAmount: true,
      status: true,
      dueAt: true,
      taxDocumentId: true,
    },
  });
  const applied = await appliedAmountsByReceivable(
    tx,
    receivables.map((receivable) => receivable.id),
  );
  const now = new Date();

  for (const receivable of receivables) {
    const status = deriveReceivableCollectionStatus({
      totalAmount: receivable.totalAmount,
      appliedAmount: applied.get(receivable.id) || 0,
      dueAt: receivable.dueAt,
      currentStatus: receivable.status,
      now,
    });
    if (status === "CANCELLED") continue;
    await tx.receivable.update({
      where: { id: receivable.id },
      data: {
        status,
        closedAt: status === "PAID" ? now : null,
      },
    });
  }

  return [
    ...new Set(receivables.map((receivable) => receivable.taxDocumentId).filter(Boolean)),
  ] as string[];
}

async function refreshTaxDocumentPaymentStatuses(tx: FinanceTransaction, taxDocumentIds: string[]) {
  for (const taxDocumentId of [...new Set(taxDocumentIds)]) {
    const receivables = await tx.receivable.findMany({
      where: {
        taxDocumentId,
        status: { notIn: [...CANCELLED_RECEIVABLE_STATUSES] },
      },
      select: { id: true, totalAmount: true, dueAt: true },
    });
    const applied = await appliedAmountsByReceivable(
      tx,
      receivables.map((receivable) => receivable.id),
    );
    const total = receivables.reduce((sum, receivable) => sum + receivable.totalAmount, 0);
    const paid = receivables.reduce(
      (sum, receivable) => sum + Math.min(receivable.totalAmount, applied.get(receivable.id) || 0),
      0,
    );
    const hasOverdueBalance = receivables.some(
      (receivable) =>
        receivable.dueAt &&
        receivable.dueAt.getTime() < Date.now() &&
        (applied.get(receivable.id) || 0) < receivable.totalAmount,
    );
    const paymentStatus =
      total > 0 && paid >= total
        ? "Pagada"
        : paid > 0
          ? "Parcial"
          : hasOverdueBalance
            ? "Vencida"
            : "Pendiente";
    await tx.taxDocument.update({
      where: { id: taxDocumentId },
      data: { paymentStatus },
    });
  }
}

async function paymentResult(
  tx: FinanceTransaction | PrismaClient,
  payment: Pick<Payment, "id" | "status" | "amount">,
  created: boolean,
): Promise<RecordedPaymentResult> {
  const allocations = await tx.paymentAllocation.findMany({
    where: { paymentId: payment.id },
    select: { receivableId: true, amount: true },
    orderBy: { createdAt: "asc" },
  });
  const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  return {
    created,
    paymentId: payment.id,
    status: payment.status,
    amount: payment.amount,
    allocatedAmount,
    creditAmount:
      payment.status === CONFIRMED_PAYMENT_STATUS
        ? Math.max(0, payment.amount - allocatedAmount)
        : 0,
    allocations,
  };
}

function assertIdempotentPaymentMatches(
  payment: Pick<
    Payment,
    "clientId" | "amount" | "currency" | "method" | "source" | "provider" | "metadata"
  >,
  input: RecordClientPaymentInput,
) {
  const metadata =
    payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
      ? (payment.metadata as Record<string, unknown>)
      : null;
  const storedTarget =
    typeof metadata?.financeTargetKey === "string" ? metadata.financeTargetKey : null;
  const targetMatches = !storedTarget || storedTarget === paymentTargetKey(input);
  if (
    payment.clientId !== input.clientId ||
    payment.amount !== input.amount ||
    payment.currency !== "CLP" ||
    payment.method !== input.method ||
    payment.source !== input.source ||
    String(payment.provider || "") !== String(input.provider || "") ||
    !targetMatches
  ) {
    throw new ClientFinanceError(
      "IDEMPOTENCY_CONFLICT",
      "La clave de idempotencia ya fue utilizada por un pago diferente.",
      409,
    );
  }
}

async function findExistingPayment(input: RecordClientPaymentInput) {
  const alternatives: Prisma.PaymentWhereInput[] = [];
  if (input.idempotencyKey) alternatives.push({ idempotencyKey: input.idempotencyKey });
  if (input.provider && input.providerPaymentId) {
    alternatives.push({ provider: input.provider, providerPaymentId: input.providerPaymentId });
  }
  if (input.provider && input.commerceOrder) {
    alternatives.push({ provider: input.provider, commerceOrder: input.commerceOrder });
  }
  if (alternatives.length === 0) return null;
  return prisma.payment.findFirst({ where: { OR: alternatives } });
}

async function runSerializable<T>(operation: (tx: FinanceTransaction) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if ((isRetryableTransactionError(error) || isUniqueConstraintError(error)) && attempt < 2)
        continue;
      if (isFinanceSchemaUnavailable(error)) {
        throw new FinanceSchemaUnavailableError({ cause: error });
      }
      throw error;
    }
  }
  throw new ClientFinanceError(
    "PAYMENT_CONCURRENCY_ERROR",
    "No se pudo conciliar el pago. Intenta nuevamente.",
    409,
  );
}

export async function recordClientPayment(
  input: RecordClientPaymentInput,
): Promise<RecordedPaymentResult> {
  const clientId = normalizedText(input.clientId, 100);
  if (!clientId) throw new ClientFinanceError("CLIENT_REQUIRED", "Debes indicar el cliente.");
  const amount = positiveClpAmount(input.amount);
  if (!CLIENT_PAYMENT_METHODS.includes(input.method)) {
    throw new ClientFinanceError("INVALID_PAYMENT_METHOD", "El método de pago no es válido.");
  }
  assertSingleTarget(input);
  if (input.receivedAt && Number.isNaN(input.receivedAt.getTime())) {
    throw new ClientFinanceError("INVALID_PAYMENT_DATE", "La fecha del pago no es válida.");
  }

  const normalizedInput: RecordClientPaymentInput = {
    ...input,
    clientId,
    amount,
    source: input.source || "MANUAL",
    idempotencyKey: normalizedText(input.idempotencyKey, 180),
    provider: normalizedText(input.provider, 80),
    providerPaymentId: normalizedText(input.providerPaymentId, 180),
    commerceOrder: normalizedText(input.commerceOrder, 180),
    reference: normalizedText(input.reference, 180),
    notes: normalizedText(input.notes, 2_000),
    proofUrl: normalizedText(input.proofUrl, 2_000),
    quoteStageKey: normalizedText(input.quoteStageKey, 80),
  };

  try {
    return await runSerializable(async (tx) => {
      const client = await tx.user.findUnique({
        where: { id: clientId },
        select: { id: true },
      });
      if (!client) throw new ClientFinanceError("CLIENT_NOT_FOUND", "El cliente no existe.", 404);

      if (normalizedInput.idempotencyKey) {
        const existing = await tx.payment.findUnique({
          where: { idempotencyKey: normalizedInput.idempotencyKey },
        });
        if (existing) {
          assertIdempotentPaymentMatches(existing, normalizedInput);
          return paymentResult(tx, existing, false);
        }
      }

      const targets = await ensureTargetReceivables(tx, normalizedInput);
      if (targets.some((target) => target.currency.toUpperCase() !== "CLP")) {
        throw new ClientFinanceError(
          "PAYMENT_CURRENCY_MISMATCH",
          "La cuenta por cobrar no está expresada en pesos chilenos.",
          409,
        );
      }
      const existingApplied = await appliedAmountsByReceivable(
        tx,
        targets.map((target) => target.id),
      );
      const plan = buildAllocationPlan(
        amount,
        targets.map((target) => ({
          id: target.id,
          totalAmount: target.totalAmount,
          appliedAmount: existingApplied.get(target.id) || 0,
        })),
      );

      const payment = await tx.payment.create({
        data: {
          clientId,
          processId: normalizedInput.processId,
          amount,
          currency: "CLP",
          method: normalizedInput.method,
          source: normalizedInput.source,
          status: CONFIRMED_PAYMENT_STATUS,
          reference: normalizedInput.reference,
          provider: normalizedInput.provider,
          providerPaymentId: normalizedInput.providerPaymentId,
          commerceOrder: normalizedInput.commerceOrder,
          idempotencyKey: normalizedInput.idempotencyKey,
          receivedAt: normalizedInput.receivedAt || new Date(),
          notes: normalizedInput.notes,
          proofUrl: normalizedInput.proofUrl,
          metadata: jsonMetadata({
            ...(normalizedInput.metadata || {}),
            financeTargetKey: paymentTargetKey(normalizedInput),
          }),
          recordedById: normalizedInput.recordedById,
        },
      });

      for (const allocation of plan.allocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            receivableId: allocation.receivableId,
            amount: allocation.amount,
          },
        });
      }

      const taxDocumentIds = await refreshReceivableStates(
        tx,
        plan.allocations.map((allocation) => allocation.receivableId),
      );
      if (normalizedInput.taxDocumentId) taxDocumentIds.push(normalizedInput.taxDocumentId);
      await refreshTaxDocumentPaymentStatuses(tx, taxDocumentIds);

      return {
        created: true,
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        allocatedAmount: plan.allocatedAmount,
        creditAmount: plan.creditAmount,
        allocations: plan.allocations,
      };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      try {
        const existing = await findExistingPayment(normalizedInput);
        if (existing) {
          assertIdempotentPaymentMatches(existing, normalizedInput);
          return await paymentResult(prisma, existing, false);
        }
      } catch (lookupError) {
        if (isFinanceSchemaUnavailable(lookupError)) {
          throw new FinanceSchemaUnavailableError({ cause: lookupError });
        }
        throw lookupError;
      }
    }
    if (isFinanceSchemaUnavailable(error)) {
      throw new FinanceSchemaUnavailableError({ cause: error });
    }
    throw error;
  }
}

export type VoidClientPaymentInput = {
  clientId: string;
  paymentId: string;
  reason: string;
};

export async function voidClientPayment(input: VoidClientPaymentInput) {
  const reason = normalizedText(input.reason, 500);
  if (!reason || reason.length < 5) {
    throw new ClientFinanceError(
      "VOID_REASON_REQUIRED",
      "La anulación requiere un motivo de al menos 5 caracteres.",
    );
  }

  return runSerializable(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: input.paymentId },
      include: { allocations: { select: { receivableId: true } } },
    });
    if (!payment) throw new ClientFinanceError("PAYMENT_NOT_FOUND", "El pago no existe.", 404);
    assertClientOwnership(payment.clientId, input.clientId, "El pago");

    if (payment.status === VOIDED_PAYMENT_STATUS) {
      return { paymentId: payment.id, status: payment.status, alreadyVoided: true };
    }
    if (payment.status !== CONFIRMED_PAYMENT_STATUS) {
      throw new ClientFinanceError(
        "PAYMENT_NOT_VOIDABLE",
        "Solo se puede anular un pago confirmado.",
        409,
      );
    }

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: VOIDED_PAYMENT_STATUS,
        voidedAt: new Date(),
        voidReason: reason,
      },
    });
    const receivableIds = [
      ...new Set(payment.allocations.map((allocation) => allocation.receivableId)),
    ];
    const taxDocumentIds = await refreshReceivableStates(tx, receivableIds);
    await refreshTaxDocumentPaymentStatuses(tx, taxDocumentIds);

    return { paymentId: updated.id, status: updated.status, alreadyVoided: false };
  });
}

export type ClientFinanceReceivable = {
  id: string;
  sourceKey: string;
  description: string;
  kind: string;
  quoteId: string | null;
  taxDocumentId: string | null;
  totalAmount: number;
  appliedAmount: number;
  balanceAmount: number;
  status: ReceivableCollectionStatus;
  issuedAt: Date;
  dueAt: Date | null;
};

export type ClientFinancePayment = {
  id: string;
  amount: number;
  allocatedAmount: number;
  creditAmount: number;
  method: string;
  source: string;
  status: string;
  reference: string | null;
  receivedAt: Date;
  voidedAt: Date | null;
  voidReason: string | null;
};

export type ClientFinanceSummary = {
  available: boolean;
  unavailableReason?: string;
  totals: {
    receivableAmount: number;
    receivedAmount: number;
    appliedAmount: number;
    outstandingAmount: number;
    overdueAmount: number;
    creditAmount: number;
  };
  receivables: ClientFinanceReceivable[];
  payments: ClientFinancePayment[];
};

export function unavailableClientFinanceSummary(): ClientFinanceSummary {
  return {
    available: false,
    unavailableReason:
      "La cartola financiera se habilitará al aplicar la migración pendiente. El historial comercial continúa disponible.",
    totals: {
      receivableAmount: 0,
      receivedAmount: 0,
      appliedAmount: 0,
      outstandingAmount: 0,
      overdueAmount: 0,
      creditAmount: 0,
    },
    receivables: [],
    payments: [],
  };
}

export async function getClientFinanceSummary(clientId: string): Promise<ClientFinanceSummary> {
  try {
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) throw new ClientFinanceError("CLIENT_NOT_FOUND", "El cliente no existe.", 404);

    const [receivables, payments] = await Promise.all([
      prisma.receivable.findMany({
        where: { clientId },
        orderBy: [{ dueAt: "asc" }, { issuedAt: "desc" }],
        take: 300,
        include: {
          allocations: {
            where: { payment: { status: CONFIRMED_PAYMENT_STATUS } },
            select: { amount: true },
          },
        },
      }),
      prisma.payment.findMany({
        where: { clientId },
        orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
        take: 300,
        include: {
          allocations: { select: { amount: true } },
        },
      }),
    ]);

    const now = new Date();
    const receivableRows: ClientFinanceReceivable[] = receivables.map((receivable) => {
      const appliedAmount = receivable.allocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0,
      );
      const status = deriveReceivableCollectionStatus({
        totalAmount: receivable.totalAmount,
        appliedAmount,
        dueAt: receivable.dueAt,
        currentStatus: receivable.status,
        now,
      });
      return {
        id: receivable.id,
        sourceKey: receivable.sourceKey,
        description: receivable.description,
        kind: receivable.kind,
        quoteId: receivable.quoteId,
        taxDocumentId: receivable.taxDocumentId,
        totalAmount: receivable.totalAmount,
        appliedAmount,
        balanceAmount: Math.max(0, receivable.totalAmount - appliedAmount),
        status,
        issuedAt: receivable.issuedAt,
        dueAt: receivable.dueAt,
      };
    });

    const paymentRows: ClientFinancePayment[] = payments.map((payment) => {
      const rawAllocated = payment.allocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0,
      );
      const isConfirmed = payment.status === CONFIRMED_PAYMENT_STATUS;
      return {
        id: payment.id,
        amount: payment.amount,
        allocatedAmount: isConfirmed ? rawAllocated : 0,
        creditAmount: isConfirmed ? Math.max(0, payment.amount - rawAllocated) : 0,
        method: payment.method,
        source: payment.source,
        status: payment.status,
        reference: payment.reference,
        receivedAt: payment.receivedAt,
        voidedAt: payment.voidedAt,
        voidReason: payment.voidReason,
      };
    });

    const activeReceivables = receivableRows.filter((row) => row.status !== "CANCELLED");
    const confirmedPayments = paymentRows.filter((row) => row.status === CONFIRMED_PAYMENT_STATUS);
    const receivableAmount = activeReceivables.reduce((sum, row) => sum + row.totalAmount, 0);
    const appliedAmount = activeReceivables.reduce(
      (sum, row) => sum + Math.min(row.totalAmount, row.appliedAmount),
      0,
    );
    const receivedAmount = confirmedPayments.reduce((sum, row) => sum + row.amount, 0);
    const outstandingAmount = activeReceivables.reduce((sum, row) => sum + row.balanceAmount, 0);
    const overdueAmount = activeReceivables.reduce(
      (sum, row) =>
        sum +
        (row.dueAt && row.dueAt.getTime() < now.getTime() && row.balanceAmount > 0
          ? row.balanceAmount
          : 0),
      0,
    );

    return {
      available: true,
      totals: {
        receivableAmount,
        receivedAmount,
        appliedAmount,
        outstandingAmount,
        overdueAmount,
        creditAmount: Math.max(0, receivedAmount - appliedAmount),
      },
      receivables: receivableRows,
      payments: paymentRows,
    };
  } catch (error) {
    if (isFinanceSchemaUnavailable(error)) return unavailableClientFinanceSummary();
    throw error;
  }
}

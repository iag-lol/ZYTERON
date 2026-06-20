import type {
  QuoteMeta,
  QuotePaymentChannel,
  QuotePaymentConfig,
  QuotePaymentPlanMode,
  QuotePaymentProof,
  QuotePaymentStage,
  QuotePaymentStageKey,
} from "@/lib/admin/quote";

type NormalizeInput = {
  raw?: QuotePaymentConfig;
  totalQuoted: number;
  fallbackMethod?: string | null;
  fallbackTerms?: string | null;
};

type StageFlowData = {
  commerceOrder?: string;
  token?: string;
  checkoutUrl?: string;
  flowOrder?: number;
  status?: number;
  statusLabel?: string;
  updatedAt?: string;
  lastError?: string;
};

function roundAmount(value: number) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

function clampPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(99, Math.round(value)));
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeChannel(value?: string | null): QuotePaymentChannel {
  return String(value || "").trim().toUpperCase() === "TRANSFER" ? "TRANSFER" : "FLOW";
}

function inferDefaultChannel(value?: string | null): QuotePaymentChannel {
  void value;
  return "FLOW";
}

function normalizePlanMode(value?: string | null, fallbackTerms?: string | null): QuotePaymentPlanMode {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "DELIVERY" || normalized === "SPLIT") return normalized;
  const terms = String(fallbackTerms || "").trim().toLowerCase();
  if (terms.includes("contra entrega") || terms.includes("contraentrega")) return "DELIVERY";
  return "FULL";
}

function normalizeProofs(raw: unknown) {
  if (!Array.isArray(raw)) return [] as QuotePaymentProof[];

  const proofs: QuotePaymentProof[] = [];

  for (const item of raw) {
    const proof = asRecord(item);
    if (!proof) continue;

    const normalized: QuotePaymentProof = {
      id: String(proof.id || ""),
      amount: roundAmount(Number(proof.amount || 0)),
      uploadedAt: String(proof.uploadedAt || new Date().toISOString()),
      transferDate: typeof proof.transferDate === "string" ? proof.transferDate : undefined,
      reference: typeof proof.reference === "string" ? proof.reference : undefined,
      note: typeof proof.note === "string" ? proof.note : undefined,
      fileUrl: typeof proof.fileUrl === "string" ? proof.fileUrl : undefined,
      fileName: typeof proof.fileName === "string" ? proof.fileName : undefined,
      status:
        proof.status === "APPROVED" || proof.status === "REJECTED" || proof.status === "PENDING"
          ? proof.status
          : "PENDING",
      reviewedAt: typeof proof.reviewedAt === "string" ? proof.reviewedAt : undefined,
      reviewedBy: typeof proof.reviewedBy === "string" ? proof.reviewedBy : undefined,
      reviewNote: typeof proof.reviewNote === "string" ? proof.reviewNote : undefined,
    };

    if (normalized.id) {
      proofs.push(normalized);
    }
  }

  return proofs;
}

function normalizeStageStatus(value: unknown, dueEnabled: boolean) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "PAID") return "PAID" as const;
  if (normalized === "PENDING_TRANSFER_REVIEW") return "PENDING_TRANSFER_REVIEW" as const;
  if (normalized === "PROCESSING") return "PROCESSING" as const;
  if (normalized === "REJECTED") return "REJECTED" as const;
  if (normalized === "READY") return "READY" as const;
  return dueEnabled ? ("READY" as const) : ("PENDING" as const);
}

function buildStage(input: {
  key: QuotePaymentStageKey;
  label: string;
  percentage: number;
  amount: number;
  paymentChannel: QuotePaymentChannel;
  dueEnabled: boolean;
  dueLabel: string;
  existing?: QuotePaymentStage | null;
}) {
  const existing = input.existing;
  const flow = asRecord(existing?.flow);
  const status = normalizeStageStatus(existing?.status, input.dueEnabled);

  return {
    key: input.key,
    label: input.label,
    percentage: input.percentage,
    amount: input.amount,
    paymentChannel: input.paymentChannel,
    status,
    dueEnabled: input.dueEnabled,
    dueLabel: input.dueLabel,
    lastRequestedAt: typeof existing?.lastRequestedAt === "string" ? existing.lastRequestedAt : undefined,
    paidAt: typeof existing?.paidAt === "string" ? existing.paidAt : undefined,
    approvedAt: typeof existing?.approvedAt === "string" ? existing.approvedAt : undefined,
    flow: flow
      ? {
          commerceOrder: typeof flow.commerceOrder === "string" ? flow.commerceOrder : undefined,
          token: typeof flow.token === "string" ? flow.token : undefined,
          checkoutUrl: typeof flow.checkoutUrl === "string" ? flow.checkoutUrl : undefined,
          flowOrder: typeof flow.flowOrder === "number" ? flow.flowOrder : undefined,
          status: typeof flow.status === "number" ? flow.status : undefined,
          statusLabel: typeof flow.statusLabel === "string" ? flow.statusLabel : undefined,
          updatedAt: typeof flow.updatedAt === "string" ? flow.updatedAt : undefined,
          lastError: typeof flow.lastError === "string" ? flow.lastError : undefined,
        }
      : undefined,
    transferProofs: normalizeProofs(existing?.transferProofs),
  } satisfies QuotePaymentStage;
}

export function normalizeQuotePaymentConfig(input: NormalizeInput): QuotePaymentConfig {
  const totalQuoted = roundAmount(input.totalQuoted);
  const raw = input.raw || {};
  const defaultChannel = normalizeChannel(raw.defaultChannel || inferDefaultChannel(input.fallbackMethod));
  const planMode = normalizePlanMode(raw.planMode, input.fallbackTerms);
  const splitPercentInitial = clampPercent(Number(raw.splitPercentInitial || 50), 50);
  const splitPercentFinal = Math.max(1, 100 - splitPercentInitial);
  const existingStages = Array.isArray(raw.stages) ? raw.stages : [];
  const stageByKey = new Map(
    existingStages
      .filter((stage): stage is QuotePaymentStage => Boolean(stage?.key))
      .map((stage) => [stage.key, stage]),
  );

  const initialAmount = roundAmount(totalQuoted * (splitPercentInitial / 100));
  const finalAmount = Math.max(0, totalQuoted - initialAmount);

  const stages: QuotePaymentStage[] =
    planMode === "SPLIT"
      ? [
          buildStage({
            key: "INITIAL",
            label: `Pago inicial ${splitPercentInitial}%`,
            percentage: splitPercentInitial,
            amount: initialAmount,
            paymentChannel: defaultChannel,
            dueEnabled: true,
            dueLabel: "Disponible al inicio",
            existing: stageByKey.get("INITIAL"),
          }),
          buildStage({
            key: "FINAL",
            label: `Pago final ${splitPercentFinal}%`,
            percentage: splitPercentFinal,
            amount: finalAmount,
            paymentChannel: defaultChannel,
            dueEnabled: false,
            dueLabel: "Se habilita al validar el pago inicial",
            existing: stageByKey.get("FINAL"),
          }),
        ]
      : planMode === "DELIVERY"
        ? [
            buildStage({
              key: "DELIVERY",
              label: "Pago contraentrega 100%",
              percentage: 100,
              amount: totalQuoted,
              paymentChannel: defaultChannel,
              dueEnabled: false,
              dueLabel: "Debe ser habilitado por administración al momento de entrega",
              existing: stageByKey.get("DELIVERY"),
            }),
          ]
        : [
            buildStage({
              key: "FULL",
              label: "Pago completo 100%",
              percentage: 100,
              amount: totalQuoted,
              paymentChannel: defaultChannel,
              dueEnabled: true,
              dueLabel: "Disponible inmediatamente",
              existing: stageByKey.get("FULL"),
            }),
          ];

  const totalPaid = roundAmount(
    stages
      .filter((stage) => stage.status === "PAID")
      .reduce((acc, stage) => acc + stage.amount, 0),
  );
  const totalPending = Math.max(0, totalQuoted - totalPaid);
  const alertStatus = stages.some((stage) => stage.status === "PENDING_TRANSFER_REVIEW")
    ? "TRANSFER_REVIEW"
    : totalPending === 0
      ? "PAID"
      : "PENDING";

  return {
    enabled: raw.enabled ?? totalQuoted > 0,
    planMode,
    defaultChannel,
    splitPercentInitial: planMode === "SPLIT" ? splitPercentInitial : undefined,
    splitPercentFinal: planMode === "SPLIT" ? splitPercentFinal : undefined,
    alertStatus,
    totalQuoted,
    totalPaid,
    totalPending,
    customerAssignedAt: raw.customerAssignedAt,
    contractEmailSentAt: raw.contractEmailSentAt,
    internalEmailSentAt: raw.internalEmailSentAt,
    stages,
  };
}

export function normalizeQuoteMetaPayment(meta: QuoteMeta) {
  return {
    ...meta,
    payment: normalizeQuotePaymentConfig({
      raw: meta.payment,
      totalQuoted: meta.grandTotal,
      fallbackMethod: meta.paymentMethod,
      fallbackTerms: meta.paymentTerms,
    }),
  } satisfies QuoteMeta;
}

export function getPayableQuoteStage(payment?: QuotePaymentConfig | null) {
  const stages = Array.isArray(payment?.stages) ? payment.stages : [];
  return (
    stages.find((stage) => stage.dueEnabled && (stage.status === "READY" || stage.status === "REJECTED")) || null
  );
}

export function getPendingQuoteStage(payment?: QuotePaymentConfig | null) {
  const stages = Array.isArray(payment?.stages) ? payment.stages : [];
  return stages.find((stage) => stage.status !== "PAID") || null;
}

export function buildFlowCommerceOrder(quoteId: string, stageKey: QuotePaymentStageKey) {
  return `QPAY-${quoteId}-${stageKey}-${Date.now()}`;
}

export function parseFlowCommerceOrder(order: string) {
  const match = String(order || "").trim().match(/^QPAY-([a-z0-9]+)-([A-Z]+)-(\d{10,})$/i);
  if (!match) return null;
  const [, quoteId, stageKey] = match;
  const normalizedStage = String(stageKey).toUpperCase() as QuotePaymentStageKey;
  if (!["FULL", "DELIVERY", "INITIAL", "FINAL"].includes(normalizedStage)) return null;
  return {
    quoteId,
    stageKey: normalizedStage,
  };
}

export function setQuoteStageFlowMeta(
  payment: QuotePaymentConfig,
  stageKey: QuotePaymentStageKey,
  flow: StageFlowData,
) {
  const normalized = normalizeQuotePaymentConfig({
    raw: payment,
    totalQuoted: payment.totalQuoted || 0,
  });

  normalized.stages = (normalized.stages || []).map((stage) =>
    stage.key === stageKey
      ? {
          ...stage,
          status: stage.status === "PAID" ? "PAID" : "PROCESSING",
          lastRequestedAt: new Date().toISOString(),
          flow: {
            ...stage.flow,
            ...flow,
            lastError: flow.lastError || undefined,
          },
        }
      : stage,
  );

  return normalizeQuotePaymentConfig({
    raw: normalized,
    totalQuoted: normalized.totalQuoted || 0,
  });
}

export function markQuoteStageReady(payment: QuotePaymentConfig, stageKey: QuotePaymentStageKey) {
  const normalized = normalizeQuotePaymentConfig({
    raw: payment,
    totalQuoted: payment.totalQuoted || 0,
  });

  normalized.stages = (normalized.stages || []).map((stage) =>
    stage.key === stageKey && stage.status !== "PAID"
      ? {
          ...stage,
          dueEnabled: true,
          status: stage.status === "PENDING_TRANSFER_REVIEW" ? stage.status : "READY",
        }
      : stage,
  );

  return normalizeQuotePaymentConfig({
    raw: normalized,
    totalQuoted: normalized.totalQuoted || 0,
  });
}

export function markQuoteStageRejected(
  payment: QuotePaymentConfig,
  stageKey: QuotePaymentStageKey,
  flow?: StageFlowData,
) {
  const normalized = normalizeQuotePaymentConfig({
    raw: payment,
    totalQuoted: payment.totalQuoted || 0,
  });

  normalized.stages = (normalized.stages || []).map((stage) =>
    stage.key === stageKey
      ? {
          ...stage,
          status: "REJECTED",
          flow: {
            ...stage.flow,
            ...flow,
            lastError: flow?.lastError || undefined,
          },
        }
      : stage,
  );

  return normalizeQuotePaymentConfig({
    raw: normalized,
    totalQuoted: normalized.totalQuoted || 0,
  });
}

export function markQuoteStagePaid(
  payment: QuotePaymentConfig,
  stageKey: QuotePaymentStageKey,
  input?: {
    approvedAt?: string;
    paidAt?: string;
    flow?: StageFlowData;
  },
) {
  const now = input?.approvedAt || new Date().toISOString();
  const normalized = normalizeQuotePaymentConfig({
    raw: payment,
    totalQuoted: payment.totalQuoted || 0,
  });

  normalized.stages = (normalized.stages || []).map((stage) =>
    stage.key === stageKey
      ? {
          ...stage,
          status: "PAID",
          dueEnabled: true,
          paidAt: input?.paidAt || now,
          approvedAt: now,
          flow: input?.flow
            ? {
                ...stage.flow,
                ...input.flow,
                lastError: input.flow.lastError || undefined,
              }
            : stage.flow,
        }
      : stage,
  );

  if (normalized.planMode === "SPLIT") {
    normalized.stages = (normalized.stages || []).map((stage) =>
      stage.key === "FINAL" && stage.status !== "PAID"
        ? {
            ...stage,
            dueEnabled: true,
            status: stage.status === "PENDING_TRANSFER_REVIEW" ? stage.status : "READY",
            dueLabel: "Disponible tras validar el pago inicial",
          }
        : stage,
    );
  }

  return normalizeQuotePaymentConfig({
    raw: normalized,
    totalQuoted: normalized.totalQuoted || 0,
  });
}

export function appendTransferProof(
  payment: QuotePaymentConfig,
  stageKey: QuotePaymentStageKey,
  proof: QuotePaymentProof,
) {
  const normalized = normalizeQuotePaymentConfig({
    raw: payment,
    totalQuoted: payment.totalQuoted || 0,
  });

  normalized.stages = (normalized.stages || []).map((stage) =>
    stage.key === stageKey
      ? {
          ...stage,
          status: "PENDING_TRANSFER_REVIEW",
          transferProofs: [...(stage.transferProofs || []), proof],
        }
      : stage,
  );

  return normalizeQuotePaymentConfig({
    raw: normalized,
    totalQuoted: normalized.totalQuoted || 0,
  });
}

export function paymentRequiresAttention(payment?: QuotePaymentConfig | null) {
  return Boolean(payment && (payment.totalPending || 0) > 0);
}

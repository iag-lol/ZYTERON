import type {
  QuoteMeta,
  QuotePaymentBillingType,
  QuotePaymentChannel,
  QuotePaymentConfig,
  QuotePaymentPlanMode,
  QuotePaymentProof,
  QuotePaymentStage,
  QuotePaymentStageKey,
  QuoteSubscriptionStatus,
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

type QuotePaymentSubscriptionData = NonNullable<QuotePaymentConfig["subscription"]>;

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

function normalizeBillingType(value?: string | null): QuotePaymentBillingType {
  return String(value || "").trim().toUpperCase() === "SUBSCRIPTION" ? "SUBSCRIPTION" : "ONE_TIME";
}

function normalizeSubscriptionStatus(value?: string | null): QuoteSubscriptionStatus {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "FAILED") return normalized;
  return "PENDING";
}

function inferDefaultChannel(value?: string | null): QuotePaymentChannel {
  void value;
  return "FLOW";
}

function shouldPreserveTransferChannel(raw?: QuotePaymentConfig) {
  const stages = Array.isArray(raw?.stages) ? raw.stages : [];
  return stages.some(
    (stage) =>
      stage?.paymentChannel === "TRANSFER" &&
      ((stage.transferProofs?.length || 0) > 0 || stage.status === "PENDING_TRANSFER_REVIEW" || stage.status === "PAID"),
  );
}

function resolveDefaultChannel(raw: QuotePaymentConfig, fallbackMethod?: string | null) {
  const inferred = inferDefaultChannel(fallbackMethod);
  if (raw.channelConfigured === true) {
    return normalizeChannel(raw.defaultChannel || inferred);
  }
  if (shouldPreserveTransferChannel(raw)) {
    return "TRANSFER" as const;
  }
  return inferred;
}

function normalizeCommercialQuoteStatus(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "WON" || normalized === "LOST" || normalized === "SENT") return normalized;
  return "PENDING" as const;
}

function normalizeSubscription(raw: QuotePaymentConfig["subscription"], totalQuoted: number) {
  const subscription = asRecord(raw);
  if (!subscription) return undefined;

  return {
    interval: "MONTHLY" as const,
    amount: roundAmount(Number(subscription.amount || totalQuoted)),
    planId: typeof subscription.planId === "string" ? subscription.planId : undefined,
    planName: typeof subscription.planName === "string" ? subscription.planName : undefined,
    customerId: typeof subscription.customerId === "string" ? subscription.customerId : undefined,
    subscriptionId: typeof subscription.subscriptionId === "string" ? subscription.subscriptionId : undefined,
    registerToken: typeof subscription.registerToken === "string" ? subscription.registerToken : undefined,
    registerUrl: typeof subscription.registerUrl === "string" ? subscription.registerUrl : undefined,
    status: normalizeSubscriptionStatus(typeof subscription.status === "string" ? subscription.status : undefined),
    activatedAt: typeof subscription.activatedAt === "string" ? subscription.activatedAt : undefined,
    nextInvoiceDate: typeof subscription.nextInvoiceDate === "string" ? subscription.nextInvoiceDate : undefined,
    updatedAt: typeof subscription.updatedAt === "string" ? subscription.updatedAt : undefined,
    lastError: typeof subscription.lastError === "string" ? subscription.lastError : undefined,
    lastPaymentAt: typeof subscription.lastPaymentAt === "string" ? subscription.lastPaymentAt : undefined,
    lastPaymentStatus: typeof subscription.lastPaymentStatus === "string" ? subscription.lastPaymentStatus : undefined,
  } satisfies QuotePaymentSubscriptionData;
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
  const billingType = normalizeBillingType(raw.billingType);
  const subscription = normalizeSubscription(raw.subscription, totalQuoted);
  const isSubscription = billingType === "SUBSCRIPTION";
  const defaultChannel = isSubscription ? "FLOW" : resolveDefaultChannel(raw, input.fallbackMethod);
  const planMode = isSubscription ? "FULL" : normalizePlanMode(raw.planMode, input.fallbackTerms);
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
    isSubscription
      ? [
          (() => {
            const baseStage = buildStage({
              key: "FULL",
              label: "Suscripción mensual",
              percentage: 100,
              amount: totalQuoted,
              paymentChannel: "FLOW",
              dueEnabled: subscription?.status !== "ACTIVE",
              dueLabel:
                subscription?.status === "ACTIVE"
                  ? "Suscripción activa con cobro mensual del total de la cotización"
                  : "Activa un cobro mensual recurrente por el total de la cotización",
              existing: stageByKey.get("FULL"),
            });

            return subscription?.status === "ACTIVE"
              ? {
                  ...baseStage,
                  status: "PAID" as const,
                  dueEnabled: false,
                  paidAt: baseStage.paidAt || subscription.activatedAt,
                  approvedAt: baseStage.approvedAt || subscription.activatedAt,
                }
              : {
                  ...baseStage,
                  status: baseStage.status === "PAID" ? ("READY" as const) : baseStage.status,
                  dueEnabled: true,
                };
          })(),
        ]
      : planMode === "SPLIT"
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

  const totalPaid = isSubscription
    ? subscription?.status === "ACTIVE"
      ? totalQuoted
      : 0
    : roundAmount(
        stages
          .filter((stage) => stage.status === "PAID")
          .reduce((acc, stage) => acc + stage.amount, 0),
      );
  const totalPending = isSubscription
    ? subscription?.status === "ACTIVE"
      ? 0
      : totalQuoted
    : Math.max(0, totalQuoted - totalPaid);
  const alertStatus = stages.some((stage) => stage.status === "PENDING_TRANSFER_REVIEW")
    ? "TRANSFER_REVIEW"
    : totalPending === 0
      ? "PAID"
      : "PENDING";

  return {
    enabled: raw.enabled ?? totalQuoted > 0,
    billingType,
    planMode,
    defaultChannel,
    channelConfigured: raw.channelConfigured === true,
    splitPercentInitial: planMode === "SPLIT" ? splitPercentInitial : undefined,
    splitPercentFinal: planMode === "SPLIT" ? splitPercentFinal : undefined,
    alertStatus,
    totalQuoted,
    totalPaid,
    totalPending,
    customerAssignedAt: raw.customerAssignedAt,
    contractEmailSentAt: raw.contractEmailSentAt,
    internalEmailSentAt: raw.internalEmailSentAt,
    subscription,
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
    stages.find(
      (stage) =>
        stage.dueEnabled &&
        (stage.status === "READY" ||
          stage.status === "REJECTED" ||
          (stage.status === "PROCESSING" && stage.paymentChannel === "FLOW")),
    ) || null
  );
}

export function getPendingQuoteStage(payment?: QuotePaymentConfig | null) {
  const stages = Array.isArray(payment?.stages) ? payment.stages : [];
  return stages.find((stage) => stage.status !== "PAID") || null;
}

export function buildFlowSubscriptionPlanId(quoteId: string) {
  return `qsub${compactQuoteIdForFlow(quoteId)}`.slice(0, 40);
}

const FLOW_STAGE_CODE_BY_KEY: Record<QuotePaymentStageKey, string> = {
  FULL: "F",
  DELIVERY: "D",
  INITIAL: "I",
  FINAL: "N",
};

const FLOW_STAGE_KEY_BY_CODE: Record<string, QuotePaymentStageKey> = {
  F: "FULL",
  D: "DELIVERY",
  I: "INITIAL",
  N: "FINAL",
};

function compactQuoteIdForFlow(quoteId: string) {
  return String(quoteId || "").replace(/-/g, "").trim().toLowerCase();
}

function expandCompactQuoteId(compactId: string) {
  if (!/^[a-f0-9]{32}$/i.test(compactId)) return compactId;
  return `${compactId.slice(0, 8)}-${compactId.slice(8, 12)}-${compactId.slice(12, 16)}-${compactId.slice(16, 20)}-${compactId.slice(20)}`;
}

function normalizeLegacyStageKey(stageKey: string) {
  const normalizedStage = String(stageKey || "").trim().toUpperCase() as QuotePaymentStageKey;
  if (!["FULL", "DELIVERY", "INITIAL", "FINAL"].includes(normalizedStage)) return null;
  return normalizedStage;
}

export function buildFlowCommerceOrder(quoteId: string, stageKey: QuotePaymentStageKey) {
  const compactId = compactQuoteIdForFlow(quoteId);
  const stageCode = FLOW_STAGE_CODE_BY_KEY[stageKey];
  const nonce = Date.now().toString(36);
  return `Q${compactId}${stageCode}${nonce}`.slice(0, 45);
}

export function parseFlowCommerceOrder(order: string) {
  const normalizedOrder = String(order || "").trim();
  const compactMatch = normalizedOrder.match(/^Q([a-f0-9]{32})([FDIN])([a-z0-9]{6,})$/i);
  if (compactMatch) {
    const [, compactId, stageCode] = compactMatch;
    const stageKey = FLOW_STAGE_KEY_BY_CODE[String(stageCode).toUpperCase()];
    if (!stageKey) return null;
    return {
      quoteId: expandCompactQuoteId(compactId.toLowerCase()),
      stageKey,
    };
  }

  const legacyMatch = normalizedOrder.match(/^QPAY-([a-z0-9-]+)-([A-Z]+)(?:-(\d{10,}))?$/i);
  if (!legacyMatch) return null;
  const [, quoteId, stageKey] = legacyMatch;
  const normalizedStage = normalizeLegacyStageKey(stageKey);
  if (!normalizedStage) return null;
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
          status: stage.status === "PAID" ? "PAID" : stage.status,
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

export function quotePaymentRequiresPortalAction(
  status?: string | null,
  payment?: { stages?: Array<unknown>; billingType?: string | null; subscription?: { status?: string | null } | null } | null,
) {
  const commercialStatus = normalizeCommercialQuoteStatus(status);
  const billingType = normalizeBillingType(payment?.billingType);
  const subscriptionStatus = normalizeSubscriptionStatus(payment?.subscription?.status);
  if (billingType === "SUBSCRIPTION") {
    return commercialStatus !== "LOST" && subscriptionStatus !== "ACTIVE";
  }
  if (commercialStatus === "WON" || commercialStatus === "LOST") {
    return false;
  }
  return Boolean(payment && Array.isArray(payment.stages) && payment.stages.length > 0);
}

export function quotePaymentIsMarkedPaidInAdmin(status?: string | null) {
  return normalizeCommercialQuoteStatus(status) === "WON";
}

export function quotePaymentVisibleInPortal(
  status?: string | null,
  payment?: { stages?: Array<unknown>; billingType?: string | null } | null,
) {
  const commercialStatus = normalizeCommercialQuoteStatus(status);
  if (commercialStatus === "LOST") return false;
  if (normalizeBillingType(payment?.billingType) === "SUBSCRIPTION") {
    return Boolean(payment && Array.isArray(payment.stages) && payment.stages.length > 0);
  }
  return commercialStatus !== "WON" && Boolean(payment && Array.isArray(payment.stages) && payment.stages.length > 0);
}

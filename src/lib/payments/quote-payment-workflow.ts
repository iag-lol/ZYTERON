import { assertQuoteCollectionsOpen } from "./collection-visibility";
import { onceProviderOperation } from "./provider-operation";
import { queueReceipt } from "./payment-outbox";
import { randomUUID } from "node:crypto";
import { verifySubscriptionCharge } from "./subscription-evidence";
import { samePaymentToken, verifyPaymentObservation } from "./verified-payment";
import {
  assertExternalPaymentMatches,
  isFinanceSchemaUnavailableError,
  recordClientPayment,
  type ClientPaymentMethod,
  type ClientPaymentSource,
} from "@/lib/admin/client-finance";
import {
  isOperationsSchemaMissingError,
  syncClientProcessFromQuoteStatus,
} from "@/lib/admin/operations";
import type {
  QuoteMeta,
  QuotePaymentProof,
  QuotePaymentStage,
  QuotePaymentStageKey,
} from "@/lib/admin/quote";
import { enrichQuoteRecord, serializeQuoteMessage, type QuoteRecord } from "@/lib/admin/quote";
import { syncWonQuoteById } from "@/lib/admin/repository";
import { ZYTERON_COMPANY } from "@/lib/company";
import {
  sendQuotePaymentReadyEmail,
  sendQuotePaymentStatusEmail,
  sendQuoteTransferProofAlertEmail,
} from "@/lib/notifications/quote-payment";
import {
  createFlowCustomer,
  createFlowPayment,
  createFlowPlan,
  createFlowSubscription,
  getFlowCustomerRegisterStatus,
  getFlowSubscription,
  getFlowInvoice,
  verifyFlowMonthlyPlan,
  getFlowPaymentStatus,
  isFlowApproved,
  isFlowRejected,
  mapFlowStatusLabel,
  registerFlowCustomerCard,
} from "@/lib/payments/flow";
import {
  appendTransferProof,
  buildFlowCommerceOrder,
  buildFlowSubscriptionPlanId,
  getPayableQuoteStage,
  markQuoteStagePaid,
  markQuoteStageReady,
  markQuoteStageRejected,
  normalizeQuoteMetaPayment,
  parseFlowCommerceOrder,
  setQuoteStageFlowMeta,
} from "@/lib/payments/quote-payments";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const PRIVATE_PAYMENT_PROOF_BUCKET = "zyteron-payment-proofs-private";

type QuoteWithPayment = ReturnType<typeof enrichQuoteRecord> & {
  meta: QuoteMeta;
};

type PortalQuoteLegalAcceptance = {
  acceptTerms: true;
  acceptPrivacy: true;
};

async function recordQuotePaymentInLedger(input: {
  quote: QuoteWithPayment;
  stage: QuotePaymentStage;
  receivableStageKey?: string;
  strictQuoteStage?: boolean;
  targetTotalAmount?: number;
  amount: number;
  method: ClientPaymentMethod;
  source: ClientPaymentSource;
  idempotencyKey: string;
  reference?: string;
  provider?: string;
  providerPaymentId?: string;
  commerceOrder?: string;
  proofUrl?: string;
  receivedAt?: Date;
  metadata?: Record<string, unknown>;
}) {
  if (!input.quote.userId) throw new Error("PAYMENT_CLIENT_BINDING_REQUIRED");

  try {
    return await recordClientPayment({
      clientId: input.quote.userId,
      quoteId: input.quote.id,
      quoteStageKey: input.receivableStageKey || input.stage.key,
      strictQuoteStage: input.strictQuoteStage,
      targetTotalAmount: Math.round(input.targetTotalAmount ?? input.stage.amount),
      amount: Math.round(input.amount),
      method: input.method,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
      reference: input.reference,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
      commerceOrder: input.commerceOrder,
      proofUrl: input.proofUrl,
      receivedAt: input.receivedAt,
      metadata: {
        quoteId: input.quote.id,
        quoteStageKey: input.stage.key,
        receivableStageKey: input.receivableStageKey || input.stage.key,
        ...(input.metadata || {}),
      },
    });
  } catch (error) {
    // Without the canonical ledger, no paid state or sale may be fabricated.
    if (isFinanceSchemaUnavailableError(error)) {
      throw new Error("PAYMENT_LEDGER_UNAVAILABLE");
    }
    throw error;
  }
}

function optionalPaymentDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toQuoteRecord(quote: {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  createdAt: Date;
}) {
  return {
    id: quote.id,
    userId: quote.userId,
    name: quote.name,
    email: quote.email,
    phone: quote.phone,
    company: quote.company,
    message: quote.message,
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total,
    status: quote.status,
    createdAt: quote.createdAt.toISOString(),
  } satisfies QuoteRecord;
}

function resolveBaseUrl(req?: Request) {
  void req;
  return "https://www.zyteron.cl";
}

async function getQuoteWithPayment(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
  });

  if (!quote) return null;

  const enriched = enrichQuoteRecord(toQuoteRecord(quote));
  return {
    ...enriched,
    meta: normalizeQuoteMetaPayment(enriched.meta),
  } satisfies QuoteWithPayment;
}

async function saveQuotePaymentMeta(input: {
  quote: QuoteWithPayment;
  meta: QuoteMeta;
  status?: "PENDING" | "SENT" | "WON" | "LOST";
}) {
  const saved = await prisma.quote.updateMany({
    where: { id: input.quote.id, message: input.quote.message },
    data: {
      message: serializeQuoteMessage(input.meta),
      status: (input.status || input.quote.status || "PENDING") as
        | "PENDING"
        | "SENT"
        | "WON"
        | "LOST",
      total: input.meta.grandTotal,
      subtotal: input.meta.subtotal,
      discount: input.meta.totalDescuento,
    },
  });

  if (saved.count !== 1) throw new Error("PAYMENT_QUOTE_VERSION_CHANGED");

  if (input.status) {
    try {
      await syncClientProcessFromQuoteStatus({ quoteId: input.quote.id });
    } catch (error) {
      if (!isOperationsSchemaMissingError(error)) {
        console.error("[quote-payment] operation sync failed", {
          quoteId: input.quote.id,
          status: input.status,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

function buildPortalQuotePaymentsUrl(baseUrl: string, params?: Record<string, string>) {
  const url = new URL("/clientes/panel/cotizaciones", baseUrl);
  for (const [key, value] of Object.entries(params || {})) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function mergeQuotePaymentSubscription(
  meta: QuoteMeta,
  patch: Partial<NonNullable<NonNullable<QuoteMeta["payment"]>["subscription"]>>,
) {
  return normalizeQuoteMetaPayment({
    ...meta,
    payment: {
      ...(meta.payment || {}),
      subscription: {
        ...(meta.payment?.subscription || {}),
        ...patch,
      },
    },
  });
}

function assertPortalQuoteLegalAcceptance(input?: PortalQuoteLegalAcceptance) {
  if (input?.acceptTerms !== true || input.acceptPrivacy !== true) {
    throw new Error(
      "Debes aceptar los términos y condiciones y la política de privacidad antes de continuar.",
    );
  }
}

function attachPortalQuoteLegalAcceptance(
  meta: QuoteMeta,
  input: {
    userId: string;
    email: string;
    stageKey: QuotePaymentStageKey;
    mode: "FLOW" | "SUBSCRIPTION";
  },
) {
  return normalizeQuoteMetaPayment({
    ...meta,
    payment: {
      ...(meta.payment || {}),
      legalAcceptance: {
        acceptedAt: new Date().toISOString(),
        acceptedByUserId: input.userId,
        acceptedByEmail: input.email,
        stageKey: input.stageKey,
        mode: input.mode,
        source: "PORTAL_QUOTE_MODAL",
        termsUrl: "/terminos",
        privacyUrl: "/privacidad",
      },
    },
  });
}

async function createPortalNotification(input: {
  userId?: string | null;
  title: string;
  body: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ALERT";
  link?: string | null;
}) {
  if (!input.userId) return;

  const existing = await prisma.clientNotification.findFirst({
    where: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      link: input.link || null,
      isRead: false,
    },
    select: { id: true },
  });

  if (existing) return;

  await prisma.clientNotification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      link: input.link || null,
    },
  });
}

async function createPortalCommunication(input: {
  userId?: string | null;
  subject: string;
  message: string;
}) {
  if (!input.userId) return;

  await prisma.clientCommunication.create({
    data: {
      userId: input.userId,
      subject: input.subject,
      message: input.message,
      direction: "OUTBOUND",
      channel: "EMAIL",
    },
  });
}

async function notifyStageReady(
  quote: QuoteWithPayment,
  stage: QuotePaymentStage,
  baseUrl: string,
) {
  const portalUrl = `${baseUrl}/clientes/panel/cotizaciones`;
  const channelLabel =
    stage.paymentChannel === "TRANSFER" ? "Transferencia bancaria" : "Pago online Flow";
  await createPortalNotification({
    userId: quote.userId,
    title: "Pago pendiente",
    body: `${stage.label}: ${new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(stage.amount)} disponible para tu cotización ${quote.displayNumber}.`,
    type: "ALERT",
    link: "/clientes/panel/cotizaciones",
  });

  if (quote.email) {
    await sendQuotePaymentReadyEmail({
      to: quote.email,
      fullName: quote.name || "Cliente",
      quoteNumber: quote.displayNumber,
      quoteTotal: quote.totalAmount,
      stage,
      channelLabel,
      portalUrl,
    }).catch((error) => {
      console.error("[quote-payment] ready email failed", error);
    });
  }

  await createPortalCommunication({
    userId: quote.userId,
    subject: `Pago habilitado ${quote.displayNumber}`,
    message: `Se habilitó ${stage.label} por ${stage.amount} vía ${channelLabel}.`,
  });
}

async function notifyStageStatus(input: {
  quote: QuoteWithPayment;
  stage: QuotePaymentStage;
  title: string;
  intro: string;
  type: "SUCCESS" | "WARNING" | "ALERT";
  baseUrl: string;
}) {
  await createPortalNotification({
    userId: input.quote.userId,
    title: input.title,
    body: `${input.quote.displayNumber} · ${input.stage.label}`,
    type: input.type,
    link: "/clientes/panel/cotizaciones",
  });

  if (input.quote.email) {
    await sendQuotePaymentStatusEmail({
      to: input.quote.email,
      fullName: input.quote.name || "Cliente",
      quoteNumber: input.quote.displayNumber,
      stage: input.stage,
      title: input.title,
      intro: input.intro,
      portalUrl: `${input.baseUrl}/clientes/panel/cotizaciones`,
    }).catch((error) => {
      console.error("[quote-payment] status email failed", error);
    });
  }

  await createPortalCommunication({
    userId: input.quote.userId,
    subject: `${input.title} ${input.quote.displayNumber}`,
    message: `${input.stage.label}: ${input.intro}`,
  });
}

export async function createQuoteFlowCheckout(input: {
  quoteId: string;
  userId: string;
  email: string;
  req: Request;
  legalAcceptance: PortalQuoteLegalAcceptance;
}) {
  assertPortalQuoteLegalAcceptance(input.legalAcceptance);

  const quote = await getQuoteWithPayment(input.quoteId);
  if (!quote) {
    throw new Error("Cotización no encontrada.");
  }

  if (quote.userId && quote.userId !== input.userId) {
    throw new Error("Esta cotización no pertenece a tu cuenta.");
  }

  const quoteEmail = String(quote.email || "").trim();
  if (!quoteEmail || quoteEmail.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error("La cotización no está vinculada a tu correo activo.");
  }

  await assertQuoteCollectionsOpen(quote.id);

  if (!quote.userId) {
    const bound = await prisma.quote.updateMany({
      where: { id: quote.id, userId: null, email: { equals: input.email, mode: "insensitive" } },
      data: { userId: input.userId },
    });
    if (bound.count !== 1) throw new Error("PAYMENT_CLIENT_BINDING_CONFLICT");
    quote.userId = input.userId;
  }
  const stage = getPayableQuoteStage(quote.meta.payment);
  if (!stage) {
    throw new Error("No hay un pago habilitado para esta cotización.");
  }
  if (quote.meta.payment?.billingType === "SUBSCRIPTION") {
    throw new Error("Esta cotización debe activarse como suscripción mensual.");
  }
  if (stage.paymentChannel !== "FLOW") {
    throw new Error("Esta etapa está configurada para transferencia bancaria.");
  }

  const baseUrl = resolveBaseUrl(input.req);
  const commerceOrder = buildFlowCommerceOrder(quote.id, stage.key);
  const acceptedMeta = attachPortalQuoteLegalAcceptance(quote.meta, {
    userId: input.userId,
    email: input.email,
    stageKey: stage.key,
    mode: "FLOW",
  });
  const flow = await createFlowPayment({
    quoteId: quote.id,
    stageKey: stage.key,
    commerceOrder,
    subject: `${quote.displayNumber} · ${stage.label}`,
    amount: stage.amount,
    email: quoteEmail,
    urlConfirmation: `${baseUrl}/api/portal/payments/quotes/flow/confirmation`,
    urlReturn: `${baseUrl}/api/portal/payments/quotes/flow/return`,
    paymentMethod: 9,
    timeout: 3600,
    optional: JSON.stringify({
      quoteId: quote.id,
      quoteNumber: quote.displayNumber,
      stageKey: stage.key,
      stageLabel: stage.label,
      totalQuoted: quote.totalAmount,
    }),
  });

  const nextMeta = {
    ...acceptedMeta,
    payment: setQuoteStageFlowMeta(acceptedMeta.payment || {}, stage.key, {
      commerceOrder: flow.commerceOrder || commerceOrder,
      token: flow.token,
      checkoutUrl: `${flow.url}?token=${encodeURIComponent(flow.token)}`,
      flowOrder: flow.flowOrder,
      status: 1,
      statusLabel: mapFlowStatusLabel(1),
      updatedAt: new Date().toISOString(),
    }),
  };

  await saveQuotePaymentMeta({
    quote,
    meta: nextMeta,
    status:
      quote.status === "PENDING"
        ? "SENT"
        : (quote.status as "SENT" | "WON" | "LOST" | undefined) || "SENT",
  });

  return {
    quoteId: quote.id,
    stageKey: stage.key,
    amount: stage.amount,
    checkoutUrl: `${flow.url}?token=${encodeURIComponent(flow.token)}`,
  };
}

export async function createQuoteFlowSubscriptionStart(input: {
  quoteId: string;
  userId: string;
  email: string;
  req: Request;
  legalAcceptance: PortalQuoteLegalAcceptance;
}) {
  assertPortalQuoteLegalAcceptance(input.legalAcceptance);

  const quote = await getQuoteWithPayment(input.quoteId);
  if (!quote) throw new Error("Cotización no encontrada.");
  if (quote.userId && quote.userId !== input.userId) {
    throw new Error("Esta cotización no pertenece a tu cuenta.");
  }
  if (quote.meta.payment?.enabled === false) throw new Error("SUBSCRIPTION_NOT_ENABLED");

  const quoteEmail = String(quote.email || "").trim();
  if (!quoteEmail || quoteEmail.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error("La cotización no está vinculada a tu correo activo.");
  }

  await assertQuoteCollectionsOpen(quote.id);

  if (!quote.userId) {
    const bound = await prisma.quote.updateMany({
      where: { id: quote.id, userId: null, email: { equals: input.email, mode: "insensitive" } },
      data: { userId: input.userId },
    });
    if (bound.count !== 1) throw new Error("PAYMENT_CLIENT_BINDING_CONFLICT");
    quote.userId = input.userId;
  }
  const life = await prisma.$queryRaw<
    Array<{ state: string }>
  >`SELECT state FROM zyteron_recurring_lifecycle WHERE quote_id=${quote.id}`;
  if (life[0] && life[0].state !== "ACTIVE")
    throw new Error(
      "Esta suscripción ya tiene una cancelación. La reactivación requiere un nuevo acuerdo.",
    );
  const payment = quote.meta.payment;
  const stage = getPayableQuoteStage(payment);
  if (!payment || payment.billingType !== "SUBSCRIPTION" || !stage) {
    throw new Error("Esta cotización no está configurada para suscripción mensual.");
  }
  if (payment.subscription?.status === "ACTIVE") {
    throw new Error("La suscripción mensual de esta cotización ya está activa.");
  }

  const baseUrl = resolveBaseUrl(input.req);
  const planId = payment.subscription?.planId || buildFlowSubscriptionPlanId(quote.id);
  const planName = payment.subscription?.planName || `${quote.displayNumber} mensual`;

  const { customerId, register } = await onceProviderOperation(
    quote.id,
    "monthly-register/" + planId + "/" + quote.totalAmount,
    async () => {
      if (!payment.subscription?.planId) {
        await createFlowPlan({
          planId,
          name: planName,
          amount: quote.totalAmount,
          interval: 3,
          intervalCount: 1,
          urlCallback: `${baseUrl}/api/portal/payments/quotes/subscription/confirmation?quoteId=${encodeURIComponent(quote.id)}`,
        });
      }

      const customerId =
        payment.subscription?.customerId ||
        (
          await createFlowCustomer({
            name: quote.name || "Cliente",
            email: quoteEmail,
            externalId: `qsub-${quote.id.slice(0, 8)}-${Date.now().toString(36)}`,
          })
        ).customerId;

      const returnUrl = `${baseUrl}/api/portal/payments/quotes/subscription/return?quoteId=${encodeURIComponent(quote.id)}`;
      const register = await registerFlowCustomerCard({
        customerId,
        urlReturn: returnUrl,
      });

      return { customerId, register };
    },
  );

  const acceptedMeta = attachPortalQuoteLegalAcceptance(quote.meta, {
    userId: input.userId,
    email: input.email,
    stageKey: stage.key,
    mode: "SUBSCRIPTION",
  });

  const nextMeta = mergeQuotePaymentSubscription(acceptedMeta, {
    interval: "MONTHLY",
    amount: quote.totalAmount,
    planId,
    planName,
    customerId,
    registerToken: register.token,
    registerUrl: `${register.url}?token=${encodeURIComponent(register.token)}`,
    status: "PENDING",
    updatedAt: new Date().toISOString(),
    lastError: undefined,
  });

  await saveQuotePaymentMeta({
    quote,
    meta: nextMeta,
    status:
      quote.status === "PENDING"
        ? "SENT"
        : (quote.status as "SENT" | "WON" | "LOST" | undefined) || "SENT",
  });

  return {
    quoteId: quote.id,
    redirectUrl: `${register.url}?token=${encodeURIComponent(register.token)}`,
  };
}

export async function processQuoteFlowPaymentToken(token: string, req?: Request) {
  const status = await getFlowPaymentStatus(token);
  const { paymentAttempt, attemptToken, flagAttemptReview } = await import("./payment-attempt");
  const attempt = await paymentAttempt(token);
  const parsed =
    attempt?.kind === "QUOTE" && attempt.stage_key
      ? { quoteId: attempt.quote_id, stageKey: attempt.stage_key as QuotePaymentStageKey }
      : parseFlowCommerceOrder(String(status.commerceOrder || ""));
  if (!parsed) {
    throw new Error("Orden Flow no reconocida para cotización.");
  }

  const quote = await getQuoteWithPayment(parsed.quoteId);
  if (!quote) {
    throw new Error("Cotización asociada al pago no encontrada.");
  }

  const currentStage = (quote.meta.payment?.stages || []).find(
    (stage) => stage.key === parsed.stageKey,
  );
  if (!currentStage) {
    throw new Error("Etapa de pago no disponible en la cotización.");
  }

  if (
    attempt &&
    (attempt.kind !== "QUOTE" ||
      attempt.quote_id !== quote.id ||
      attempt.stage_key !== currentStage.key ||
      attempt.client_id !== quote.userId)
  )
    throw new Error("PAYMENT_ATTEMPT_OWNER_MISMATCH");
  verifyPaymentObservation(
    status,
    attempt
      ? {
          id: attempt.commerce_order,
          amount: attempt.amount,
          flowOrder: Number(attempt.flow_order),
          token: attemptToken(attempt),
        }
      : {
          id: currentStage.flow?.commerceOrder || "",
          amount: currentStage.amount,
          flowOrder: currentStage.flow?.flowOrder,
          token: currentStage.flow?.token,
        },
    token,
  );
  const { parseObservation } = await import("./pilot-protocol");
  const proof = parseObservation({ ...status });
  const already = await prisma.payment.findUnique({
    where: { idempotencyKey: `flow:${status.flowOrder}` },
  });
  if (
    attempt &&
    status.status === 2 &&
    (attempt.amount !== currentStage.amount || (currentStage.status === "PAID" && !already))
  ) {
    if (!quote.userId || !quote.email) throw new Error("PAYMENT_CLIENT_BINDING_REQUIRED");
    const recorded = await recordClientPayment({
      clientId: quote.userId,
      amount: attempt.amount,
      method: "CARD",
      source: "FLOW",
      provider: "FLOW",
      providerPaymentId: String(status.flowOrder),
      commerceOrder: status.commerceOrder,
      idempotencyKey: `flow:${status.flowOrder}`,
      receivedAt: new Date(proof.paidAt!),
      metadata: { quoteId: quote.id, reviewRequired: true, reason: "RETIRED_PAYMENT_ATTEMPT" },
    });
    await flagAttemptReview(token);
    await queueReceipt({
      quoteId: quote.id,
      paymentId: recorded.paymentId,
      recipient: quote.email,
      amount: attempt.amount,
    });
    return {
      quoteId: quote.id,
      flowStatus: status.status,
      flowLabel: "PAGO RECIBIDO · REVISIÓN REQUERIDA",
      quoteStatus: quote.status,
    };
  }
  if (attempt && status.status !== 2 && !samePaymentToken(token, currentStage.flow?.token))
    return {
      quoteId: quote.id,
      flowStatus: status.status,
      flowLabel: mapFlowStatusLabel(status.status),
      quoteStatus: quote.status,
    };

  const baseUrl = resolveBaseUrl(req);
  let payment = quote.meta.payment || {};

  if (isFlowApproved(status.status)) {
    assertExternalPaymentMatches({
      expectedAmount: currentStage.amount,
      reportedAmount: status.amount,
      reportedCurrency: status.currency,
    });
    const stageWasAlreadyPaid = currentStage.status === "PAID";
    const commerceOrder = String(status.commerceOrder || "");
    const recorded = await recordQuotePaymentInLedger({
      quote,
      stage: currentStage,
      amount: status.amount ?? currentStage.amount,
      method: "CARD",
      source: "FLOW",
      idempotencyKey: `flow:${status.flowOrder ?? commerceOrder}`,
      reference: status.payer,
      provider: "FLOW",
      providerPaymentId: status.flowOrder === undefined ? undefined : String(status.flowOrder),
      commerceOrder,
      receivedAt: new Date(proof.paidAt!),
      metadata: {
        flowStatus: status.status,
        subject: status.subject,
      },
    });
    if (!recorded.paymentId || !quote.email) throw new Error("PAYMENT_LEDGER_RESULT_REQUIRED");
    await queueReceipt({
      quoteId: quote.id,
      paymentId: recorded.paymentId,
      recipient: quote.email,
      amount: currentStage.amount,
    });
    const beforeFinalReady = Boolean(
      (payment.stages || []).find(
        (stage) => stage.key === "FINAL" && stage.dueEnabled && stage.status === "READY",
      ),
    );
    payment = markQuoteStagePaid(payment, parsed.stageKey, {
      approvedAt: proof.paidAt!,
      flow: {
        commerceOrder: String(status.commerceOrder || ""),
        token,
        flowOrder: status.flowOrder,
        status: status.status,
        statusLabel: mapFlowStatusLabel(status.status),
        updatedAt: new Date().toISOString(),
      },
    });

    const allPaid = (payment.totalPending || 0) === 0;
    const nextMeta = {
      ...quote.meta,
      payment,
    };

    await saveQuotePaymentMeta({
      quote,
      meta: nextMeta,
      status: allPaid ? "WON" : "SENT",
    });

    if (allPaid && !stageWasAlreadyPaid) {
      await syncWonQuoteById(quote.id);
    }

    const afterFinalReady = (payment.stages || []).find(
      (stage) => stage.key === "FINAL" && stage.dueEnabled && stage.status === "READY",
    );
    if (!stageWasAlreadyPaid && !beforeFinalReady && afterFinalReady) {
      const refreshedQuote = await getQuoteWithPayment(quote.id);
      if (refreshedQuote) {
        await notifyStageReady(refreshedQuote, afterFinalReady, baseUrl);
      }
    }

    return {
      quoteId: quote.id,
      flowStatus: status.status,
      flowLabel: mapFlowStatusLabel(status.status),
      quoteStatus: allPaid ? "WON" : "SENT",
    };
  }

  if (isFlowRejected(status.status) && currentStage.status !== "PAID") {
    payment = markQuoteStageRejected(payment, parsed.stageKey, {
      commerceOrder: String(status.commerceOrder || ""),
      token,
      flowOrder: status.flowOrder,
      status: status.status,
      statusLabel: mapFlowStatusLabel(status.status),
      updatedAt: new Date().toISOString(),
      lastError:
        typeof status.lastError === "object" && status.lastError
          ? JSON.stringify(status.lastError)
          : "Pago rechazado por Flow.",
    });

    await saveQuotePaymentMeta({
      quote,
      meta: {
        ...quote.meta,
        payment,
      },
      status: quote.status === "WON" ? "WON" : "SENT",
    });

    const rejectedStage =
      (payment.stages || []).find((stage) => stage.key === parsed.stageKey) || currentStage;
    await notifyStageStatus({
      quote,
      stage: rejectedStage,
      title: "Pago rechazado",
      intro: "tu intento de pago fue rechazado. Puedes volver a intentarlo desde el portal.",
      type: "WARNING",
      baseUrl,
    });
  }

  return {
    quoteId: quote.id,
    flowStatus: status.status,
    flowLabel: mapFlowStatusLabel(status.status),
    quoteStatus: quote.status,
  };
}

export async function activateQuoteFlowSubscriptionFromToken(input: {
  quoteId: string;
  token: string;
  req?: Request;
}) {
  const quote = await getQuoteWithPayment(input.quoteId);
  if (!quote) throw new Error("Cotización no encontrada.");

  const currentStage = (quote.meta.payment?.stages || []).find((stage) => stage.key === "FULL");
  if (!quote.meta.payment || quote.meta.payment.billingType !== "SUBSCRIPTION" || !currentStage) {
    throw new Error("La cotización no está configurada para suscripción mensual.");
  }

  const baseUrl = resolveBaseUrl(input.req);
  if (
    quote.meta.payment.subscription?.status === "ACTIVE" &&
    quote.meta.payment.subscription?.subscriptionId
  ) {
    return {
      ok: true as const,
      redirectUrl: buildPortalQuotePaymentsUrl(baseUrl, {
        payment_result: "active",
        payment_label: "Suscripción activa",
        payment_message: "La suscripción mensual ya estaba activa.",
      }),
    };
  }

  if (!samePaymentToken(input.token, quote.meta.payment.subscription?.registerToken))
    throw new Error("SUBSCRIPTION_REGISTRATION_MISMATCH");
  const registerStatus = await getFlowCustomerRegisterStatus(input.token);
  const customerId = String(registerStatus.customerId || "").trim();
  const registerCode = Number.parseInt(String(registerStatus.status || "0"), 10);

  if (customerId && customerId !== quote.meta.payment.subscription?.customerId)
    throw new Error("SUBSCRIPTION_CUSTOMER_MISMATCH");
  if (!customerId || registerCode !== 1) {
    const failedMeta = mergeQuotePaymentSubscription(quote.meta, {
      status: "FAILED",
      customerId: customerId || quote.meta.payment.subscription?.customerId,
      updatedAt: new Date().toISOString(),
      lastError: "No se confirmó el registro de tarjeta para la suscripción mensual.",
    });

    await saveQuotePaymentMeta({
      quote,
      meta: failedMeta,
      status:
        quote.status === "WON"
          ? "WON"
          : (quote.status as "PENDING" | "SENT" | "LOST" | undefined) || "SENT",
    });

    return {
      ok: false as const,
      redirectUrl: buildPortalQuotePaymentsUrl(baseUrl, {
        payment_result: "error",
        payment_message: "No se confirmó el registro de tarjeta. Puedes intentarlo nuevamente.",
        payment_label: "Suscripción mensual",
      }),
    };
  }

  const planId = quote.meta.payment.subscription?.planId || buildFlowSubscriptionPlanId(quote.id);
  const planName = quote.meta.payment.subscription?.planName || `${quote.displayNumber} mensual`;
  if (!quote.meta.payment.subscription?.planId) {
    await createFlowPlan({
      planId,
      name: planName,
      amount: quote.totalAmount,
      interval: 3,
      intervalCount: 1,
      urlCallback: `${baseUrl}/api/portal/payments/quotes/subscription/confirmation?quoteId=${encodeURIComponent(quote.id)}`,
    });
  }

  if (quote.meta.payment.subscription?.amount !== quote.totalAmount)
    throw new Error("SUBSCRIPTION_TERMS_CHANGED");
  await verifyFlowMonthlyPlan(
    planId,
    quote.totalAmount,
    `${baseUrl}/api/portal/payments/quotes/subscription/confirmation?quoteId=${encodeURIComponent(quote.id)}`,
  );
  const subscription = await onceProviderOperation(quote.id, "monthly-subscription/" + planId, () =>
    createFlowSubscription({ planId, customerId }),
  );

  const payment = quote.meta.payment;
  const nextMeta = normalizeQuoteMetaPayment({
    ...quote.meta,
    payment: {
      ...payment,
      subscription: {
        ...(payment.subscription || {}),
        interval: "MONTHLY",
        amount: quote.totalAmount,
        planId: subscription.planId,
        planName,
        customerId: subscription.customerId,
        subscriptionId: subscription.subscriptionId,
        status: "ACTIVE",
        activatedAt: new Date().toISOString(),
        nextInvoiceDate: subscription.nextInvoiceDate,
        updatedAt: new Date().toISOString(),
        registerToken: undefined,
        registerUrl: undefined,
        lastError: undefined,
        lastPaymentStatus: "PENDIENTE_DE_COBRO",
      },
    },
  });

  await saveQuotePaymentMeta({
    quote,
    meta: nextMeta,
    status: quote.status === "WON" ? "WON" : "SENT",
  });

  const paidStage =
    (nextMeta.payment?.stages || []).find((stage) => stage.key === "FULL") || currentStage;
  await notifyStageStatus({
    quote,
    stage: paidStage,
    title: "Suscripción activa",
    intro:
      "tu suscripción mensual quedó activada. Cada cobro se acreditará únicamente después de confirmar el pago.",
    type: "SUCCESS",
    baseUrl,
  });

  return {
    ok: true as const,
    redirectUrl: buildPortalQuotePaymentsUrl(baseUrl, {
      payment_result: "active",
      payment_label: "Suscripción activa",
      payment_message: "La suscripción mensual quedó activada correctamente.",
    }),
  };
}

export async function processQuoteSubscriptionChargeConfirmation(input: {
  quoteId: string;
  token: string;
  req?: Request;
}) {
  const quote = await getQuoteWithPayment(input.quoteId);
  const binding = quote?.meta.payment?.subscription;
  if (
    !quote ||
    quote.meta.payment?.billingType !== "SUBSCRIPTION" ||
    !binding?.subscriptionId ||
    !binding.customerId ||
    !binding.planId
  )
    throw new Error("SUBSCRIPTION_BINDING_REQUIRED");
  const status = await getFlowPaymentStatus(input.token);
  const remote = await getFlowSubscription(binding.subscriptionId);
  if (remote.customerId !== binding.customerId || remote.planId !== binding.planId)
    throw new Error("SUBSCRIPTION_OWNERSHIP_MISMATCH");
  const invoices = Array.isArray(remote.invoices) ? remote.invoices : [];
  const linked = invoices.find((value) => {
    if (!value || typeof value !== "object") return false;
    const payment = (value as Record<string, unknown>).payment as
      | Record<string, unknown>
      | undefined;
    return payment?.flowOrder === status.flowOrder;
  }) as Record<string, unknown> | undefined;
  // Caller-controlled quoteId and an unrelated token can never credit a subscription.
  if (!linked || !Number.isSafeInteger(linked.id))
    throw new Error("SUBSCRIPTION_INVOICE_NOT_LINKED");
  const invoice = await getFlowInvoice(linked.id as number);
  if (isFlowApproved(status.status)) {
    const proof = verifySubscriptionCharge({
      subscription: remote,
      invoice,
      status,
      expected: {
        subscriptionId: binding.subscriptionId,
        customerId: binding.customerId,
        planId: binding.planId,
        amount: binding.amount || quote.totalAmount,
      },
    });
    const stage = quote.meta.payment.stages?.find((item) => item.key === "FULL");
    if (!stage) throw new Error("SUBSCRIPTION_STAGE_REQUIRED");
    const recorded = await recordQuotePaymentInLedger({
      quote,
      stage,
      receivableStageKey: `SUBSCRIPTION:${proof.invoiceId}`,
      strictQuoteStage: true,
      targetTotalAmount: binding.amount || stage.amount,
      amount: status.amount!,
      method: "CARD",
      source: "SUBSCRIPTION",
      idempotencyKey: `flow:${status.flowOrder}`,
      provider: "FLOW",
      providerPaymentId: String(status.flowOrder),
      commerceOrder: status.commerceOrder,
      receivedAt: new Date(proof.paidAt),
      metadata: {
        subscriptionId: binding.subscriptionId,
        invoiceId: proof.invoiceId,
        periodStart: proof.periodStart,
        periodEnd: proof.periodEnd,
      },
    });
    if (!recorded.paymentId || !quote.email) throw new Error("PAYMENT_LEDGER_RESULT_REQUIRED");
    await queueReceipt({
      quoteId: quote.id,
      paymentId: recorded.paymentId,
      recipient: quote.email,
      amount: status.amount!,
    });
    const paidThrough =
      !binding.paidThrough || new Date(proof.periodEnd) > new Date(binding.paidThrough)
        ? proof.periodEnd
        : binding.paidThrough;
    const nextMeta = mergeQuotePaymentSubscription(quote.meta, {
      lastVerifiedInvoiceId: proof.invoiceId,
      lastPaymentAt: proof.paidAt,
      lastPaymentStatus: "PAGADO",
      paidThrough,
      updatedAt: new Date().toISOString(),
    });
    await saveQuotePaymentMeta({ quote, meta: nextMeta, status: "WON" });
    await prisma.$queryRaw`SELECT public.zyteron_sync_subscription_sale(${quote.id},${recorded.paymentId},${proof.invoiceId}::bigint)`;
  } else if (isFlowRejected(status.status)) {
    await createPortalNotification({
      userId: quote.userId,
      title: "Cobro mensual no aprobado",
      body: `${quote.displayNumber}: el intento no fue aprobado. No se acreditó ningún pago.`,
      type: "WARNING",
      link: "/clientes/panel/cotizaciones",
    });
  }
  return { flowStatus: status.status };
}

export async function submitQuoteTransferProof(input: {
  quoteId: string;
  userId: string;
  email: string;
  stageKey: QuotePaymentStageKey;
  transferDate?: string;
  reference?: string;
  note?: string;
  file?: File | null;
  req: Request;
}) {
  const quote = await getQuoteWithPayment(input.quoteId);
  if (!quote) {
    throw new Error("Cotización no encontrada.");
  }
  if (quote.userId && quote.userId !== input.userId) {
    throw new Error("Esta cotización no pertenece a tu cuenta.");
  }
  const quoteEmail = String(quote.email || "").trim();
  if (!quoteEmail || quoteEmail.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error("La cotización no está vinculada a tu correo activo.");
  }

  await assertQuoteCollectionsOpen(quote.id);

  const stage = (quote.meta.payment?.stages || []).find((item) => item.key === input.stageKey);
  if (!stage || !stage.dueEnabled) {
    throw new Error("La etapa indicada no está habilitada.");
  }
  if (stage.paymentChannel !== "TRANSFER") {
    throw new Error("Esta etapa no está configurada para transferencia.");
  }

  const proofId = randomUUID();
  let fileUrl: string | undefined;
  let fileName: string | undefined;

  if (input.file && input.file.size > 0) {
    const { supabase } = createSupabaseServerClient();
    if (
      input.file.size > 10 * 1024 * 1024 ||
      !["application/pdf", "image/jpeg", "image/png"].includes(input.file.type)
    )
      throw new Error("Formato de comprobante no permitido.");
    const uploadName = `${quote.id}/${proofId}`;
    const bytes = Buffer.from(await input.file.arrayBuffer());

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = (buckets || []).some(
      (bucket) => bucket.name === PRIVATE_PAYMENT_PROOF_BUCKET,
    );
    if (!bucketExists) {
      await supabase.storage.createBucket(PRIVATE_PAYMENT_PROOF_BUCKET, {
        public: false,
        fileSizeLimit: "10485760",
      });
    }

    const upload = await supabase.storage
      .from(PRIVATE_PAYMENT_PROOF_BUCKET)
      .upload(uploadName, bytes, {
        contentType: input.file.type || "application/octet-stream",
        upsert: false,
      });
    if (upload.error) {
      throw new Error(`No se pudo subir el comprobante: ${upload.error.message}`);
    }

    fileUrl = `/api/portal/documents/payment-proof/${encodeURIComponent(quote.id)}/${proofId}`;
    fileName = input.file.name;
  }

  const proof: QuotePaymentProof = {
    id: proofId,
    amount: Math.max(0, Math.round(stage.amount)),
    uploadedAt: new Date().toISOString(),
    transferDate: input.transferDate,
    reference: input.reference,
    note: input.note,
    fileUrl,
    fileName,
    status: "PENDING",
  };

  const payment = appendTransferProof(quote.meta.payment || {}, input.stageKey, proof);
  await saveQuotePaymentMeta({
    quote,
    meta: {
      ...quote.meta,
      payment,
    },
    status:
      quote.status === "PENDING"
        ? "SENT"
        : (quote.status as "SENT" | "WON" | "LOST" | undefined) || "SENT",
  });

  await createPortalNotification({
    userId: quote.userId,
    title: "Comprobante recibido",
    body: `${quote.displayNumber} · ${stage.label} quedó pendiente de revisión.`,
    type: "INFO",
    link: "/clientes/panel/cotizaciones",
  });

  const baseUrl = resolveBaseUrl(input.req);
  const adminUrl = `${baseUrl}/admin/cotizaciones/${quote.id}`;
  for (const recipient of [ZYTERON_COMPANY.salesEmail, ZYTERON_COMPANY.email]) {
    await sendQuoteTransferProofAlertEmail({
      to: recipient,
      quoteNumber: quote.displayNumber,
      clientName: quote.name || "Cliente",
      clientEmail: quoteEmail,
      stage,
      proof,
      adminUrl,
    }).catch((error) => {
      console.error("[quote-payment] transfer alert email failed", error);
    });
  }

  return { ok: true, proofId: proof.id };
}

export async function reviewQuoteTransferProof(input: {
  quoteId: string;
  stageKey: QuotePaymentStageKey;
  action: "APPROVE" | "REJECT";
  actorId?: string | null;
  reviewNote?: string;
  req?: Request;
}) {
  const quote = await getQuoteWithPayment(input.quoteId);
  if (!quote) throw new Error("Cotización no encontrada.");

  const stage = (quote.meta.payment?.stages || []).find((item) => item.key === input.stageKey);
  if (!stage) throw new Error("Etapa no encontrada.");

  const proofs = [...(stage.transferProofs || [])];
  const lastPendingIndex = [...proofs].reverse().findIndex((proof) => proof.status === "PENDING");
  if (lastPendingIndex === -1) {
    throw new Error("No hay comprobantes pendientes para esta etapa.");
  }
  const realIndex = proofs.length - 1 - lastPendingIndex;
  const pendingProof = proofs[realIndex];
  proofs[realIndex] = {
    ...pendingProof,
    status: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.actorId || undefined,
    reviewNote: input.reviewNote,
  };

  if (input.action === "APPROVE") {
    await recordQuotePaymentInLedger({
      quote,
      stage,
      amount: pendingProof.amount,
      method: "BANK_TRANSFER",
      source: "TRANSFER_PROOF",
      idempotencyKey: `transfer-proof:${pendingProof.id}`,
      reference: pendingProof.reference,
      proofUrl: pendingProof.fileUrl,
      receivedAt: optionalPaymentDate(pendingProof.transferDate),
      metadata: {
        proofId: pendingProof.id,
        reviewedBy: input.actorId || undefined,
      },
    });
  }

  let payment = quote.meta.payment || {};
  payment = {
    ...payment,
    stages: (payment.stages || []).map((item) =>
      item.key === input.stageKey ? { ...item, transferProofs: proofs } : item,
    ),
  };

  if (input.action === "APPROVE") {
    payment = markQuoteStagePaid(payment, input.stageKey, {
      approvedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    });
  } else {
    payment = markQuoteStageRejected(payment, input.stageKey);
  }

  const allPaid = (payment.totalPending || 0) === 0;
  await saveQuotePaymentMeta({
    quote,
    meta: {
      ...quote.meta,
      payment,
    },
    status: allPaid ? "WON" : "SENT",
  });

  if (allPaid) {
    await syncWonQuoteById(quote.id);
  }

  const baseUrl = resolveBaseUrl(input.req);
  const updatedStage = (payment.stages || []).find((item) => item.key === input.stageKey) || stage;
  await notifyStageStatus({
    quote,
    stage: updatedStage,
    title: input.action === "APPROVE" ? "Transferencia aprobada" : "Transferencia observada",
    intro:
      input.action === "APPROVE"
        ? "tu comprobante fue validado correctamente."
        : "tu comprobante requiere revisión o una nueva carga desde el portal.",
    type: input.action === "APPROVE" ? "SUCCESS" : "WARNING",
    baseUrl,
  });

  if (input.action === "APPROVE") {
    const unlockedStage = (payment.stages || []).find(
      (item) => item.key === "FINAL" && item.dueEnabled && item.status === "READY",
    );
    if (unlockedStage) {
      const refreshedQuote = await getQuoteWithPayment(quote.id);
      if (refreshedQuote) {
        await notifyStageReady(refreshedQuote, unlockedStage, baseUrl);
      }
    }
  }
}

export async function enableQueuedQuoteStage(input: {
  quoteId: string;
  stageKey: QuotePaymentStageKey;
  req?: Request;
}) {
  const quote = await getQuoteWithPayment(input.quoteId);
  if (!quote) throw new Error("Cotización no encontrada.");

  const payment = markQuoteStageReady(quote.meta.payment || {}, input.stageKey);
  await saveQuotePaymentMeta({
    quote,
    meta: {
      ...quote.meta,
      payment,
    },
    status:
      quote.status === "PENDING"
        ? "SENT"
        : (quote.status as "SENT" | "WON" | "LOST" | undefined) || "SENT",
  });

  const enabledStage = (payment.stages || []).find((stage) => stage.key === input.stageKey);
  if (enabledStage) {
    await notifyStageReady(quote, enabledStage, resolveBaseUrl(input.req));
  }
}

export async function notifyQuotePaymentIfReady(quoteId: string, req?: Request) {
  const quote = await getQuoteWithPayment(quoteId);
  if (!quote) return;

  const stage = getPayableQuoteStage(quote.meta.payment);
  if (!stage) return;

  await notifyStageReady(quote, stage, resolveBaseUrl(req));
}

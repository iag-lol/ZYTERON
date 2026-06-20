import { randomUUID } from "node:crypto";
import type { QuoteMeta, QuotePaymentProof, QuotePaymentStage, QuotePaymentStageKey } from "@/lib/admin/quote";
import { enrichQuoteRecord, serializeQuoteMessage, type QuoteRecord } from "@/lib/admin/quote";
import { syncWonQuoteById } from "@/lib/admin/repository";
import { ZYTERON_COMPANY } from "@/lib/company";
import { sendQuotePaymentReadyEmail, sendQuotePaymentStatusEmail, sendQuoteTransferProofAlertEmail } from "@/lib/notifications/quote-payment";
import { createFlowPayment, getFlowPaymentStatus, isFlowApproved, isFlowRejected, mapFlowStatusLabel } from "@/lib/payments/flow";
import {
  appendTransferProof,
  buildFlowCommerceOrder,
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
import { ZYTERON_PAYMENT_PROOF_BUCKET } from "@/lib/company";

type QuoteWithPayment = ReturnType<typeof enrichQuoteRecord> & {
  meta: QuoteMeta;
};

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
  const candidates = [
    process.env.FLOW_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.PUBLIC_SITE_URL,
    process.env.RENDER_EXTERNAL_URL,
    ZYTERON_COMPANY.website,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, "");
  }

  if (req) {
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    if (/^https?:\/\//i.test(origin)) return origin.replace(/\/+$/, "");
  }

  return ZYTERON_COMPANY.website.replace(/\/+$/, "");
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
  await prisma.quote.update({
    where: { id: input.quote.id },
    data: {
      message: serializeQuoteMessage(input.meta),
      status: (input.status || input.quote.status || "PENDING") as "PENDING" | "SENT" | "WON" | "LOST",
      total: input.meta.grandTotal,
      subtotal: input.meta.subtotal,
      discount: input.meta.totalDescuento,
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

async function notifyStageReady(quote: QuoteWithPayment, stage: QuotePaymentStage, baseUrl: string) {
  const portalUrl = `${baseUrl}/portal-clientes/panel/cotizaciones`;
  const channelLabel = stage.paymentChannel === "TRANSFER" ? "Transferencia bancaria" : "Pago online Flow";
  await createPortalNotification({
    userId: quote.userId,
    title: "Pago pendiente",
    body: `${stage.label}: ${new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(stage.amount)} disponible para tu cotización ${quote.displayNumber}.`,
    type: "ALERT",
    link: "/portal-clientes/panel/cotizaciones",
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
    link: "/portal-clientes/panel/cotizaciones",
  });

  if (input.quote.email) {
    await sendQuotePaymentStatusEmail({
      to: input.quote.email,
      fullName: input.quote.name || "Cliente",
      quoteNumber: input.quote.displayNumber,
      stage: input.stage,
      title: input.title,
      intro: input.intro,
      portalUrl: `${input.baseUrl}/portal-clientes/panel/cotizaciones`,
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

  const stage = getPayableQuoteStage(quote.meta.payment);
  if (!stage) {
    throw new Error("No hay un pago habilitado para esta cotización.");
  }
  if (stage.paymentChannel !== "FLOW") {
    throw new Error("Esta etapa está configurada para transferencia bancaria.");
  }

  const baseUrl = resolveBaseUrl(input.req);
  const commerceOrder = buildFlowCommerceOrder(quote.id, stage.key);
  const flow = await createFlowPayment({
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
    ...quote.meta,
    payment: setQuoteStageFlowMeta(quote.meta.payment || {}, stage.key, {
      commerceOrder,
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
    status: quote.status === "PENDING" ? "SENT" : (quote.status as "SENT" | "WON" | "LOST" | undefined) || "SENT",
  });

  return {
    quoteId: quote.id,
    stageKey: stage.key,
    amount: stage.amount,
    checkoutUrl: `${flow.url}?token=${encodeURIComponent(flow.token)}`,
  };
}

export async function processQuoteFlowPaymentToken(token: string, req?: Request) {
  const status = await getFlowPaymentStatus(token);
  const parsed = parseFlowCommerceOrder(String(status.commerceOrder || ""));
  if (!parsed) {
    throw new Error("Orden Flow no reconocida para cotización.");
  }

  const quote = await getQuoteWithPayment(parsed.quoteId);
  if (!quote) {
    throw new Error("Cotización asociada al pago no encontrada.");
  }

  const currentStage = (quote.meta.payment?.stages || []).find((stage) => stage.key === parsed.stageKey);
  if (!currentStage) {
    throw new Error("Etapa de pago no disponible en la cotización.");
  }

  const baseUrl = resolveBaseUrl(req);
  let payment = quote.meta.payment || {};

  if (isFlowApproved(status.status)) {
    const beforeFinalReady = Boolean(
      (payment.stages || []).find((stage) => stage.key === "FINAL" && stage.dueEnabled && stage.status === "READY"),
    );
    payment = markQuoteStagePaid(payment, parsed.stageKey, {
      approvedAt: new Date().toISOString(),
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

    if (allPaid) {
      await syncWonQuoteById(quote.id);
    }

    const paidStage = (payment.stages || []).find((stage) => stage.key === parsed.stageKey) || currentStage;
    await notifyStageStatus({
      quote,
      stage: paidStage,
      title: "Pago validado",
      intro: "tu pago fue confirmado correctamente y quedó aplicado a tu cotización.",
      type: "SUCCESS",
      baseUrl,
    });

    const afterFinalReady = (payment.stages || []).find(
      (stage) => stage.key === "FINAL" && stage.dueEnabled && stage.status === "READY",
    );
    if (!beforeFinalReady && afterFinalReady) {
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

  if (isFlowRejected(status.status)) {
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

    const rejectedStage = (payment.stages || []).find((stage) => stage.key === parsed.stageKey) || currentStage;
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

  const stage = (quote.meta.payment?.stages || []).find((item) => item.key === input.stageKey);
  if (!stage || !stage.dueEnabled) {
    throw new Error("La etapa indicada no está habilitada.");
  }
  if (stage.paymentChannel !== "TRANSFER") {
    throw new Error("Esta etapa no está configurada para transferencia.");
  }

  let fileUrl: string | undefined;
  let fileName: string | undefined;

  if (input.file && input.file.size > 0) {
    const { supabase } = createSupabaseServerClient();
    const uploadName = `${quote.id}/${Date.now()}-${input.file.name.replace(/[^\w.-]+/g, "-")}`;
    const bytes = Buffer.from(await input.file.arrayBuffer());

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = (buckets || []).some((bucket) => bucket.name === ZYTERON_PAYMENT_PROOF_BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(ZYTERON_PAYMENT_PROOF_BUCKET, {
        public: true,
        fileSizeLimit: "10485760",
      });
    }

    const upload = await supabase.storage.from(ZYTERON_PAYMENT_PROOF_BUCKET).upload(uploadName, bytes, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });
    if (upload.error) {
      throw new Error(`No se pudo subir el comprobante: ${upload.error.message}`);
    }

    const publicUrl = supabase.storage.from(ZYTERON_PAYMENT_PROOF_BUCKET).getPublicUrl(uploadName);
    fileUrl = publicUrl.data.publicUrl;
    fileName = input.file.name;
  }

  const proof: QuotePaymentProof = {
    id: randomUUID(),
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
    status: quote.status === "PENDING" ? "SENT" : (quote.status as "SENT" | "WON" | "LOST" | undefined) || "SENT",
  });

  await createPortalNotification({
    userId: quote.userId,
    title: "Comprobante recibido",
    body: `${quote.displayNumber} · ${stage.label} quedó pendiente de revisión.`,
    type: "INFO",
    link: "/portal-clientes/panel/cotizaciones",
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
  proofs[realIndex] = {
    ...proofs[realIndex],
    status: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.actorId || undefined,
    reviewNote: input.reviewNote,
  };

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
    status: quote.status === "PENDING" ? "SENT" : (quote.status as "SENT" | "WON" | "LOST" | undefined) || "SENT",
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

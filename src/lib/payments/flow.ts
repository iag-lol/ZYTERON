import {assertBusinessPaymentEnvironment} from "./payment-environment";
import { normalizeProviderPayment, providerClpAmount } from "./provider-money";
import { createHmac } from "node:crypto";

export type FlowPaymentCreateInput = {
  commerceOrder: string;
  quoteId?: string;
  stageKey?: "FULL" | "DELIVERY" | "INITIAL" | "FINAL";
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
  optional?: string;
  timeout?: number;
  paymentMethod?: number;
};

export type FlowPaymentCreateResult = {
  url: string;
  token: string;
  flowOrder?: number;
  commerceOrder?: string;
};

export type FlowStatusResult = {
  flowOrder?: number;
  commerceOrder: string;
  status: number;
  subject?: string;
  amount?: number;
  currency?: string;
  payer?: string;
  paymentData?: Record<string, unknown>;
  pending_info?: Record<string, unknown>;
  lastError?: Record<string, unknown>;
};

export type FlowCustomerCreateResult = {
  customerId: string;
  created?: string;
  email?: string;
  name?: string;
  externalId?: string;
  status?: string;
};

export type FlowCustomerRegisterResult = {
  url: string;
  token: string;
};

export type FlowCustomerRegisterStatus = {
  status: string;
  customerId?: string;
  creditCardType?: string;
  last4CardDigits?: string;
  cardNumber?: string;
  issuerBank?: string;
};

export type FlowSubscriptionCreateInput = {
  planId: string;
  customerId: string;
  subscriptionStart?: string;
  periodsNumber?: number;
};

export type FlowPlanCreateInput = {
  planId: string;
  name: string;
  amount: number;
  interval: 1 | 2 | 3 | 4;
  intervalCount?: number;
  urlCallback?: string;
  periodsNumber?: number;
  trialPeriodDays?: number;
  daysUntilDue?: number;
};

export type FlowPlanCreateResult = {
  planId: string;
  name: string;
  amount: number;
  interval: number;
  intervalCount?: number;
  created?: string;
};

export type FlowSubscriptionCreateResult = {
  subscriptionId: string;
  planId: string;
  customerId: string;
  status?: number;
  paymentLink?: string;
  nextInvoiceDate?: string;
};

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).trim();
    }

    return trimmed;
  }

  return "";
}

function getFlowConfig() {
  const apiKey = readEnv("FLOW_API_KEY", "FLOW_KEY");
  const secret = readEnv("FLOW_SECRET_KEY", "FLOW_SECRET", "FLOW_API_SECRET");

  if (!apiKey || !secret) {
    const debug = [
      `FLOW_API_KEY=${apiKey.length}`,
      `FLOW_SECRET_KEY=${secret.length}`,
      `FLOW_API_BASE=${readEnv("FLOW_API_BASE").length}`,
      `FLOW_USE_SANDBOX=${readEnv("FLOW_USE_SANDBOX").length}`,
    ].join(" | ");
    throw new Error(`Flow no configurado: faltan FLOW_API_KEY / FLOW_SECRET_KEY. Debug: ${debug}`);
  }

  const sandboxFlag = readEnv("FLOW_USE_SANDBOX").toLowerCase();
  const useSandbox = sandboxFlag === "1" || sandboxFlag === "true" || sandboxFlag === "yes";
  const base =
    readEnv("FLOW_API_BASE") ||
    (useSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api");
  const normalizedBase = base.replace(/\/+$/, "");
  if (!["https://sandbox.flow.cl/api", "https://www.flow.cl/api"].includes(normalizedBase)) {
    throw new Error("La conexión de pagos no tiene un origen autorizado.");
  }

  assertBusinessPaymentEnvironment(normalizedBase);
  return {
    apiKey,
    secret,
    base: normalizedBase,
  };
}

function requirePaymentActivation(base: string) {
  if (base === "https://www.flow.cl/api" && process.env.FLOW_LIVE_PAYMENTS_ENABLED !== "true") {
    throw new Error(
      "Los cobros reales requieren activar y validar la configuración de producción.",
    );
  }
}

function normalizeForSign(params: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (key === "s") continue;
    out[key] = String(value);
  }
  return out;
}

function signFlowParams(params: Record<string, unknown>, secret: string) {
  const normalized = normalizeForSign(params);
  const keys = Object.keys(normalized).sort((a, b) => a.localeCompare(b, "en"));
  const source = keys.map((key) => `${key}${normalized[key]}`).join("");
  return createHmac("sha256", secret).update(source).digest("hex");
}

function toFormBody(params: Record<string, unknown>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    body.set(key, String(value));
  }
  return body;
}

function flowError(status: number, body: unknown) {
  void body;
  return new Error(`La pasarela no pudo completar la operación (HTTP ${status}).`);
}

async function flowPost(path: string, payload: Record<string, unknown>) {
  const { apiKey, secret, base } = getFlowConfig();
  requirePaymentActivation(base);
  const bodyPayload: Record<string, unknown> = { apiKey, ...payload };
  bodyPayload.s = signFlowParams(bodyPayload, secret);

  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "zyteron-web/1.0",
    },
    body: toFormBody(bodyPayload),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !body) {
    throw flowError(response.status, body);
  }

  return body;
}

async function flowGet(path: string, query: Record<string, unknown>) {
  const { apiKey, secret, base } = getFlowConfig();
  const payload: Record<string, unknown> = { apiKey, ...query };
  payload.s = signFlowParams(payload, secret);

  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "zyteron-web/1.0",
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !body) {
    throw flowError(response.status, body);
  }

  return body;
}

export function mapFlowStatusLabel(status: number) {
  if (status === 2) return "PAGADA";
  if (status === 1) return "PENDIENTE";
  if (status === 3) return "RECHAZADA";
  if (status === 4) return "ANULADA";
  return "DESCONOCIDA";
}

export function isFlowApproved(status: number) {
  return status === 2;
}

export function isFlowRejected(status: number) {
  return status === 3 || status === 4;
}

export async function createFlowPayment(
  input: FlowPaymentCreateInput,
): Promise<FlowPaymentCreateResult> {
  const { apiKey, secret, base } = getFlowConfig();
  requirePaymentActivation(base);

  const payload: Record<string, unknown> = {
    apiKey,
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    amount: input.amount,
    email: input.email,
    currency: "CLP",
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
    optional: input.optional,
    timeout: input.timeout,
    paymentMethod: input.paymentMethod,
  };

  payload.s = signFlowParams(payload, secret);
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
    throw new Error("Importe de pago inválido.");

  for (const value of [input.urlConfirmation, input.urlReturn]) {
    let origin = "";
    try {
      origin = new URL(value).origin;
    } catch {}
    if (origin !== "https://www.zyteron.cl") throw new Error("PAYMENT_CALLBACK_ORIGIN_INVALID");
  }
  const { parseFlowCommerceOrder } = await import("./quote-payments");
  const parsed =
    input.quoteId && input.stageKey
      ? { quoteId: input.quoteId, stageKey: input.stageKey }
      : parseFlowCommerceOrder(input.commerceOrder);
  const callbackPath = new URL(input.urlConfirmation).pathname;
  const quoteId =
    callbackPath === "/api/checkout/flow/confirmation"
      ? input.commerceOrder
      : callbackPath === "/api/portal/payments/quotes/flow/confirmation"
        ? parsed?.quoteId
        : null;
  if (!quoteId) throw new Error("PAYMENT_PERSISTED_TARGET_REQUIRED");
  const { prisma } = await import("@/lib/prisma");
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("PAYMENT_PERSISTED_TARGET_REQUIRED");
  let generation = "initial";
  if (parsed) {
    const { enrichQuoteRecord } = await import("@/lib/admin/quote");
    const { normalizeQuoteMetaPayment } = await import("./quote-payments");
    const meta = normalizeQuoteMetaPayment(
      enrichQuoteRecord({ ...quote, createdAt: quote.createdAt.toISOString() }).meta,
    );
    const stage = meta.payment?.stages?.find((s) => s.key === parsed.stageKey);
    if (!stage || stage.amount !== input.amount || stage.status === "PAID")
      throw new Error("PAYMENT_STAGE_MISMATCH");
    if ([3, 4].includes(stage.flow?.status || 0)) generation = String(stage.flow?.flowOrder);
  } else {
    if (quote.total !== input.amount) throw new Error("PAYMENT_AMOUNT_MISMATCH");
    let m;
    try {
      m = JSON.parse(quote.message || "");
    } catch {
      throw new Error("PAYMENT_CHECKOUT_INVALID");
    }
    if (m.type !== "PRODUCT_CHECKOUT" || m.flow?.status === 2)
      throw new Error("PAYMENT_CHECKOUT_INVALID");
    if ([3, 4].includes(m.flow?.status)) throw new Error("PAYMENT_ATTEMPT_FINISHED");
  }

  const { onceProviderOperation } = await import("./provider-operation");
  const created = await onceProviderOperation(
    quoteId,
    "payment/" + (parsed?.stageKey || "checkout") + "/" + input.amount + "/" + generation,
    async () => {
      const response = await fetch(`${base}/payment/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "zyteron-web/1.0",
        },
        body: toFormBody(payload),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok || !body?.url || !body?.token) {
        throw flowError(response.status, body);
      }

      return {
        commerceOrder: input.commerceOrder,
        url: validatedProviderUrl(body.url, base),
        token: String(body.token),
        flowOrder: typeof body.flowOrder === "number" ? body.flowOrder : undefined,
      };
    },
  );
  const { persistPaymentAttempt } = await import("./payment-attempt");
  await persistPaymentAttempt({
    token: created.token,
    quoteId,
    clientId: quote.userId,
    kind: parsed ? "QUOTE" : "CHECKOUT",
    stageKey: parsed?.stageKey,
    commerceOrder: created.commerceOrder!,
    flowOrder: created.flowOrder,
    amount: input.amount,
  });
  const { enqueueCallback } = await import("./durable-callbacks");
  await enqueueCallback(parsed ? "QUOTE" : "CHECKOUT", created.token);
  return created;
}

export async function createFlowCustomer(input: {
  name: string;
  email: string;
  externalId: string;
}): Promise<FlowCustomerCreateResult> {
  const body = await flowPost("/customer/create", {
    name: input.name,
    email: input.email,
    externalId: input.externalId,
  });

  const customerId = String(body.customerId || "").trim();
  if (!customerId) {
    throw new Error("Flow no devolvió customerId al crear cliente.");
  }

  return {
    customerId,
    created: typeof body.created === "string" ? body.created : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    name: typeof body.name === "string" ? body.name : undefined,
    externalId: typeof body.externalId === "string" ? body.externalId : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
  };
}

export async function createFlowPlan(input: FlowPlanCreateInput): Promise<FlowPlanCreateResult> {
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    ![1, 2, 3, 4].includes(input.interval)
  ) {
    throw new Error("La configuración del plan mensual requiere revisión.");
  }
  const body = await flowPost("/plans/create", {
    planId: input.planId,
    name: input.name,
    currency: "CLP",
    amount: Math.max(0, Math.round(input.amount)),
    interval: input.interval,
    interval_count:
      typeof input.intervalCount === "number" && Number.isFinite(input.intervalCount)
        ? Math.max(1, Math.round(input.intervalCount))
        : 1,
    urlCallback: input.urlCallback,
    periods_number:
      typeof input.periodsNumber === "number" && Number.isFinite(input.periodsNumber)
        ? Math.max(0, Math.round(input.periodsNumber))
        : undefined,
    trial_period_days:
      typeof input.trialPeriodDays === "number" && Number.isFinite(input.trialPeriodDays)
        ? Math.max(0, Math.round(input.trialPeriodDays))
        : undefined,
    days_until_due:
      typeof input.daysUntilDue === "number" && Number.isFinite(input.daysUntilDue)
        ? Math.max(0, Math.round(input.daysUntilDue))
        : undefined,
  });

  const planId = String(body.planId || "").trim();
  const name = String(body.name || "").trim();
  if (!planId || !name) {
    throw new Error("Flow no devolvió datos completos del plan de suscripción.");
  }

  return {
    planId,
    name,
    amount: Number(body.amount || 0),
    interval: Number(body.interval || 0),
    intervalCount: typeof body.interval_count === "number" ? body.interval_count : undefined,
    created: typeof body.created === "string" ? body.created : undefined,
  };
}

export async function registerFlowCustomerCard(input: {
  customerId: string;
  urlReturn: string;
}): Promise<FlowCustomerRegisterResult> {
  const body = await flowPost("/customer/register", {
    customerId: input.customerId,
    url_return: input.urlReturn,
  });

  const url = String(body.url || "").trim();
  const token = String(body.token || "").trim();
  if (!url || !token) {
    throw new Error("Flow no devolvió URL/token para registro de tarjeta.");
  }

  return {
    url: validatedProviderUrl(url, getFlowConfig().base),
    token,
  };
}

export async function getFlowCustomerRegisterStatus(
  token: string,
): Promise<FlowCustomerRegisterStatus> {
  const body = await flowGet("/customer/getRegisterStatus", { token });

  return {
    status: String(body.status || "").trim(),
    customerId: typeof body.customerId === "string" ? body.customerId : undefined,
    creditCardType: typeof body.creditCardType === "string" ? body.creditCardType : undefined,
    last4CardDigits: typeof body.last4CardDigits === "string" ? body.last4CardDigits : undefined,
    cardNumber: typeof body.cardNumber === "string" ? body.cardNumber : undefined,
    issuerBank: typeof body.issuerBank === "string" ? body.issuerBank : undefined,
  };
}

export async function createFlowSubscription(
  input: FlowSubscriptionCreateInput,
): Promise<FlowSubscriptionCreateResult> {
  const body = await flowPost("/subscription/create", {
    planId: input.planId,
    customerId: input.customerId,
    subscription_start: input.subscriptionStart,
    periods_number:
      typeof input.periodsNumber === "number" && Number.isFinite(input.periodsNumber)
        ? Math.max(0, Math.round(input.periodsNumber))
        : undefined,
  });

  const subscriptionId = String(body.subscriptionId || "").trim();
  const planId = String(body.planId || "").trim();
  const customerId = String(body.customerId || "").trim();
  if (!subscriptionId || !planId || !customerId) {
    throw new Error("Flow no devolvió datos completos de suscripción.");
  }

  return {
    subscriptionId,
    planId,
    customerId,
    status: typeof body.status === "number" ? body.status : undefined,
    paymentLink: typeof body.paymentLink === "string" ? body.paymentLink : undefined,
    nextInvoiceDate:
      typeof body.next_invoice_date === "string" ? body.next_invoice_date : undefined,
  };
}

export async function getFlowPaymentStatus(token: string): Promise<FlowStatusResult> {
  const { apiKey, secret, base } = getFlowConfig();

  const query: Record<string, unknown> = { apiKey, token };
  query.s = signFlowParams(query, secret);

  const url = new URL(`${base}/payment/getStatusExtended`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "zyteron-web/1.0",
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !response.ok ||
    !body ||
    typeof body.commerceOrder !== "string" ||
    typeof body.status !== "number"
  ) {
    throw flowError(response.status, body);
  }

  return {
    flowOrder: typeof body.flowOrder === "number" ? body.flowOrder : undefined,
    commerceOrder: String(body.commerceOrder),
    status: Number(body.status),
    subject: typeof body.subject === "string" ? body.subject : undefined,
    amount: providerClpAmount(body.amount),
    currency: typeof body.currency === "string" ? body.currency : undefined,
    payer: typeof body.payer === "string" ? body.payer : undefined,
    paymentData:
      body.paymentData && typeof body.paymentData === "object"
        ? (normalizeProviderPayment(body).paymentData as Record<string, unknown>)
        : undefined,
    pending_info:
      body.pending_info && typeof body.pending_info === "object"
        ? (body.pending_info as Record<string, unknown>)
        : undefined,
    lastError:
      body.lastError && typeof body.lastError === "object"
        ? (body.lastError as Record<string, unknown>)
        : undefined,
  };
}

export async function getFlowSubscription(subscriptionId: string) {
  const data = await flowGet("/subscription/get", { subscriptionId });
  if (
    data.subscriptionId !== subscriptionId ||
    typeof data.customerId !== "string" ||
    typeof data.planId !== "string" ||
    ![0, 1, 2, 4].includes(Number(data.status))
  )
    throw new Error("SUBSCRIPTION_RESPONSE_INVALID");
  return data;
}
function normalizeInvoiceMoney(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("SUBSCRIPTION_INVOICE_INVALID");
  const v = value as Record<string, unknown>;
  return {
    ...v,
    amount: providerClpAmount(v.amount),
    ...(v.payment && typeof v.payment === "object"
      ? { payment: normalizeProviderPayment(v.payment as Record<string, unknown>) }
      : {}),
  };
}
export async function getFlowInvoice(invoiceId: number) {
  if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0)
    throw new Error("SUBSCRIPTION_INVOICE_INVALID");
  const data = await flowGet("/invoice/get", { invoiceId });
  if (data.id !== invoiceId) throw new Error("SUBSCRIPTION_INVOICE_MISMATCH");
  return normalizeInvoiceMoney(data);
}
export async function cancelFlowSubscription(subscriptionId: string) {
  await flowPost("/subscription/cancel", { subscriptionId, at_period_end: 1 });
  return getFlowSubscription(subscriptionId);
}
export async function getFlowPaymentByOrder(flowOrder: number): Promise<FlowStatusResult> {
  if (!Number.isSafeInteger(flowOrder) || flowOrder <= 0) throw new Error("PAYMENT_ORDER_INVALID");
  const data = await flowGet("/payment/getStatusByFlowOrderExtended", { flowOrder });
  if (
    data.flowOrder !== flowOrder ||
    typeof data.commerceOrder !== "string" ||
    typeof data.status !== "number"
  )
    throw new Error("PAYMENT_RESPONSE_INVALID");
  return normalizeProviderPayment(data) as unknown as FlowStatusResult;
}

function validatedProviderUrl(value: unknown, base: string) {
  let u: URL;
  try {
    u = new URL(String(value));
  } catch {
    throw new Error("PAYMENT_DESTINATION_INVALID");
  }
  const host = base.includes("sandbox") ? "sandbox.flow.cl" : "www.flow.cl";
  if (
    u.protocol !== "https:" ||
    u.hostname !== host ||
    u.port ||
    u.username ||
    u.password ||
    u.search ||
    u.hash
  )
    throw new Error("PAYMENT_DESTINATION_INVALID");
  return u.href;
}

export async function verifyFlowMonthlyPlan(planId: string, amount: number, callback: string) {
  const data = await flowGet("/plans/get", { planId });
  if (
    data.planId !== planId ||
    data.currency !== "CLP" ||
    providerClpAmount(data.amount) !== amount ||
    data.interval !== 3 ||
    data.interval_count !== 1 ||
    data.urlCallback !== callback
  )
    throw new Error("SUBSCRIPTION_PLAN_MISMATCH");
  return data;
}

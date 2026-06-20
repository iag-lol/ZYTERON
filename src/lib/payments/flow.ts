import { createHmac } from "node:crypto";

export type FlowPaymentCreateInput = {
  commerceOrder: string;
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
      (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
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
  const base = readEnv("FLOW_API_BASE") || (useSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api");
  const normalizedBase = base.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalizedBase)) {
    throw new Error("Flow mal configurado: FLOW_API_BASE debe iniciar con http:// o https://");
  }

  return {
    apiKey,
    secret,
    base: normalizedBase,
  };
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
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const msg = [b.message, b.error, b.code]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)[0];
    if (msg) return new Error(`Flow ${status}: ${msg}`);
  }

  return new Error(`Flow respondió con error ${status}.`);
}

async function flowPost(path: string, payload: Record<string, unknown>) {
  const { apiKey, secret, base } = getFlowConfig();
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

export async function createFlowPayment(input: FlowPaymentCreateInput): Promise<FlowPaymentCreateResult> {
  const { apiKey, secret, base } = getFlowConfig();

  const payload: Record<string, unknown> = {
    apiKey,
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    amount: Math.max(0, Math.round(input.amount)),
    email: input.email,
    currency: "CLP",
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
    optional: input.optional,
    timeout: input.timeout,
    paymentMethod: input.paymentMethod,
  };

  payload.s = signFlowParams(payload, secret);

  const response = await fetch(`${base}/payment/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "zyteron-web/1.0",
    },
    body: toFormBody(payload),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !body?.url || !body?.token) {
    throw flowError(response.status, body);
  }

  return {
    url: String(body.url),
    token: String(body.token),
    flowOrder: typeof body.flowOrder === "number" ? body.flowOrder : undefined,
  };
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
    url,
    token,
  };
}

export async function getFlowCustomerRegisterStatus(token: string): Promise<FlowCustomerRegisterStatus> {
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
    nextInvoiceDate: typeof body.next_invoice_date === "string" ? body.next_invoice_date : undefined,
  };
}

export async function getFlowPaymentStatus(token: string): Promise<FlowStatusResult> {
  const { apiKey, secret, base } = getFlowConfig();

  const query: Record<string, unknown> = { apiKey, token };
  query.s = signFlowParams(query, secret);

  const url = new URL(`${base}/payment/getStatus`);
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
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !body || typeof body.commerceOrder !== "string" || typeof body.status !== "number") {
    throw flowError(response.status, body);
  }

  return {
    flowOrder: typeof body.flowOrder === "number" ? body.flowOrder : undefined,
    commerceOrder: String(body.commerceOrder),
    status: Number(body.status),
    subject: typeof body.subject === "string" ? body.subject : undefined,
    amount: typeof body.amount === "number" ? body.amount : undefined,
    currency: typeof body.currency === "string" ? body.currency : undefined,
    payer: typeof body.payer === "string" ? body.payer : undefined,
    paymentData: body.paymentData && typeof body.paymentData === "object" ? (body.paymentData as Record<string, unknown>) : undefined,
    pending_info: body.pending_info && typeof body.pending_info === "object" ? (body.pending_info as Record<string, unknown>) : undefined,
    lastError: body.lastError && typeof body.lastError === "object" ? (body.lastError as Record<string, unknown>) : undefined,
  };
}

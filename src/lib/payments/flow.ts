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

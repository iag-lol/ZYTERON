import { NextResponse } from "next/server";
import { processQuoteFlowPaymentToken } from "@/lib/payments/quote-payment-workflow";
import { ZYTERON_COMPANY } from "@/lib/company";

function resolveBaseUrl(req: Request) {
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

  return new URL(req.url).origin.replace(/\/+$/, "");
}

function buildRedirect(req: Request, params: Record<string, string>) {
  const url = new URL("/portal-clientes/panel/cotizaciones", resolveBaseUrl(req));
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, { status: 303 });
}

async function readToken(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const token = form?.get("token");
    if (typeof token === "string" && token.trim()) return token.trim();
  }

  const raw = await req.text().catch(() => "");
  if (raw) {
    const params = new URLSearchParams(raw);
    const token = params.get("token");
    if (token?.trim()) return token.trim();
  }

  return "";
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() || "";
  if (!token) {
    return buildRedirect(req, {
      payment_result: "error",
      payment_message: "No se recibió token de pago.",
    });
  }

  try {
    const result = await processQuoteFlowPaymentToken(token, req);
    return buildRedirect(req, {
      payment_result: result.flowStatus === 2 ? "paid" : "pending",
      payment_quote: result.quoteId,
      payment_status: String(result.flowStatus),
      payment_label: result.flowLabel,
    });
  } catch (error) {
    return buildRedirect(req, {
      payment_result: "error",
      payment_message: error instanceof Error ? error.message : "No se pudo validar el pago.",
    });
  }
}

export async function POST(req: Request) {
  const token = await readToken(req);
  if (!token) {
    return buildRedirect(req, {
      payment_result: "error",
      payment_message: "No se recibió token de pago.",
    });
  }

  try {
    const result = await processQuoteFlowPaymentToken(token, req);
    return buildRedirect(req, {
      payment_result: result.flowStatus === 2 ? "paid" : "pending",
      payment_quote: result.quoteId,
      payment_status: String(result.flowStatus),
      payment_label: result.flowLabel,
    });
  } catch (error) {
    return buildRedirect(req, {
      payment_result: "error",
      payment_message: error instanceof Error ? error.message : "No se pudo validar el pago.",
    });
  }
}

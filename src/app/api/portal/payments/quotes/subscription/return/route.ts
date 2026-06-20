import { NextResponse } from "next/server";
import { activateQuoteFlowSubscriptionFromToken } from "@/lib/payments/quote-payment-workflow";

function buildFallbackRedirect(req: Request, message: string) {
  const base =
    (process.env.FLOW_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || "https://www.zyteron.cl")
      .trim()
      .replace(/\/+$/, "");

  const url = /^https?:\/\//i.test(base)
    ? new URL("/portal-clientes/panel/cotizaciones", base)
    : new URL("/portal-clientes/panel/cotizaciones", req.url);

  url.searchParams.set("payment_result", "error");
  url.searchParams.set("payment_message", message);
  url.searchParams.set("payment_label", "Suscripción mensual");
  return url;
}

async function extractToken(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = form?.get("token");
  if (typeof token === "string" && token.trim()) return token.trim();

  const urlToken = new URL(req.url).searchParams.get("token");
  if (urlToken?.trim()) return urlToken.trim();

  const raw = await req.text().catch(() => "");
  if (raw) {
    const params = new URLSearchParams(raw);
    const bodyToken = params.get("token");
    if (bodyToken?.trim()) return bodyToken.trim();
  }

  return "";
}

async function handle(req: Request, token: string) {
  const quoteId = new URL(req.url).searchParams.get("quoteId")?.trim() || "";
  if (!quoteId) {
    return NextResponse.redirect(
      buildFallbackRedirect(req, "No se identificó la cotización de la suscripción."),
      { status: 303 },
    );
  }

  try {
    const result = await activateQuoteFlowSubscriptionFromToken({
      quoteId,
      token,
      req,
    });

    return NextResponse.redirect(result.redirectUrl, { status: 303 });
  } catch (error) {
    return NextResponse.redirect(
      buildFallbackRedirect(req, error instanceof Error ? error.message : "No se pudo activar la suscripción mensual."),
      { status: 303 },
    );
  }
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() || "";
  if (!token) {
    return NextResponse.redirect(
      buildFallbackRedirect(req, "No se recibió token de suscripción."),
      { status: 303 },
    );
  }
  return handle(req, token);
}

export async function POST(req: Request) {
  const token = await extractToken(req);
  if (!token) {
    return NextResponse.redirect(
      buildFallbackRedirect(req, "No se recibió token de suscripción."),
      { status: 303 },
    );
  }
  return handle(req, token);
}

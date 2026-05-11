import { NextResponse } from "next/server";
import { getFlowPaymentStatus, mapFlowStatusLabel } from "@/lib/payments/flow";

async function readTokenFromPost(req: Request) {
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

function buildFinalUrl(req: Request, params: Record<string, string>) {
  const base =
    (process.env.FLOW_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || "https://www.zyteron.cl")
      .trim()
      .replace(/\/+$/, "");

  const url = /^https?:\/\//i.test(base)
    ? new URL("/pagos/finalizado", base)
    : new URL("/pagos/finalizado", req.url);

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }

  return url;
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        flowStatus: "0",
        flowLabel: "TOKEN_INVALIDO",
        message: "No se recibió token de pago.",
        mode: "service",
      }),
      { status: 303 },
    );
  }

  try {
    const status = await getFlowPaymentStatus(token);
    return NextResponse.redirect(
      buildFinalUrl(req, {
        flowStatus: String(status.status),
        flowLabel: mapFlowStatusLabel(status.status),
        order: status.commerceOrder,
        token,
        mode: "service",
      }),
      { status: 303 },
    );
  } catch (error) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        flowStatus: "0",
        flowLabel: "ERROR_VALIDACION",
        message: error instanceof Error ? error.message : "No se pudo validar el pago.",
        mode: "service",
      }),
      { status: 303 },
    );
  }
}

export async function POST(req: Request) {
  const token = await readTokenFromPost(req);

  if (!token) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        flowStatus: "0",
        flowLabel: "TOKEN_INVALIDO",
        message: "No se recibió token de pago.",
        mode: "service",
      }),
      { status: 303 },
    );
  }

  try {
    const status = await getFlowPaymentStatus(token);
    return NextResponse.redirect(
      buildFinalUrl(req, {
        flowStatus: String(status.status),
        flowLabel: mapFlowStatusLabel(status.status),
        order: status.commerceOrder,
        token,
        mode: "service",
      }),
      { status: 303 },
    );
  } catch (error) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        flowStatus: "0",
        flowLabel: "ERROR_VALIDACION",
        message: error instanceof Error ? error.message : "No se pudo validar el pago.",
        mode: "service",
      }),
      { status: 303 },
    );
  }
}

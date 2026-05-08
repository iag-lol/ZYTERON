import { NextResponse } from "next/server";
import { processFlowToken } from "@/lib/checkout/process-flow";

function redirectToSummary(req: Request, params: Record<string, string>) {
  const url = new URL("/checkout/finalizado", req.url);
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, { status: 303 });
}

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

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() || "";
  if (!token) {
    return redirectToSummary(req, {
      flowStatus: "0",
      flowLabel: "TOKEN_INVALIDO",
      message: "No se recibió token de pago.",
    });
  }

  try {
    const result = await processFlowToken(token);
    return redirectToSummary(req, {
      order: result.orderId,
      token,
      flowStatus: String(result.flowStatus),
      flowLabel: result.flowLabel,
      quoteStatus: result.quoteStatus,
      message:
        result.flowStatus === 2
          ? "Pago confirmado. Estamos procesando tu pedido, documento y actualización de stock."
          : "",
    });
  } catch (error) {
    return redirectToSummary(req, {
      flowStatus: "0",
      flowLabel: "ERROR_VALIDACION",
      message: error instanceof Error ? error.message : "No se pudo validar el pago.",
    });
  }
}

export async function POST(req: Request) {
  const token = await readTokenFromPost(req);
  if (!token) {
    return redirectToSummary(req, {
      flowStatus: "0",
      flowLabel: "TOKEN_INVALIDO",
      message: "No se recibió token de pago.",
    });
  }

  try {
    const result = await processFlowToken(token);
    return redirectToSummary(req, {
      order: result.orderId,
      token,
      flowStatus: String(result.flowStatus),
      flowLabel: result.flowLabel,
      quoteStatus: result.quoteStatus,
      message:
        result.flowStatus === 2
          ? "Pago confirmado. Estamos procesando tu pedido, documento y actualización de stock."
          : "",
    });
  } catch (error) {
    return redirectToSummary(req, {
      flowStatus: "0",
      flowLabel: "ERROR_VALIDACION",
      message: error instanceof Error ? error.message : "No se pudo validar el pago.",
    });
  }
}

import { NextResponse } from "next/server";
import { createFlowSubscription, getFlowCustomerRegisterStatus } from "@/lib/payments/flow";

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

async function extractToken(req: Request) {
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

async function handle(req: Request, token: string) {
  const url = new URL(req.url);
  const planId = url.searchParams.get("planId")?.trim() || "";
  const serviceKey = url.searchParams.get("serviceKey")?.trim() || "";

  if (!planId) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        mode: "subscription",
        flowStatus: "0",
        flowLabel: "PLAN_INVALIDO",
        message: "No se encontró plan de suscripción para completar el proceso.",
      }),
      { status: 303 },
    );
  }

  const registerStatus = await getFlowCustomerRegisterStatus(token);
  const customerId = String(registerStatus.customerId || "").trim();
  const registerCode = Number.parseInt(String(registerStatus.status || "0"), 10);

  if (!customerId || registerCode !== 1) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        mode: "subscription",
        flowStatus: "0",
        flowLabel: "REGISTRO_TARJETA_NO_CONFIRMADO",
        message: "No se confirmó el registro de tarjeta. Puedes intentarlo nuevamente.",
      }),
      { status: 303 },
    );
  }

  const subscription = await createFlowSubscription({
    planId,
    customerId,
  });

  return NextResponse.redirect(
    buildFinalUrl(req, {
      mode: "subscription",
      flowStatus: String(subscription.status ?? 1),
      flowLabel: "SUSCRIPCION_ACTIVADA",
      order: subscription.subscriptionId,
      message: "Suscripción creada correctamente. Te enviaremos confirmación y próximos pasos.",
      serviceKey,
    }),
    { status: 303 },
  );
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        mode: "subscription",
        flowStatus: "0",
        flowLabel: "TOKEN_INVALIDO",
        message: "No se recibió token de registro.",
      }),
      { status: 303 },
    );
  }

  try {
    return await handle(req, token);
  } catch (error) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        mode: "subscription",
        flowStatus: "0",
        flowLabel: "ERROR_SUSCRIPCION",
        message: error instanceof Error ? error.message : "No se pudo completar la suscripción.",
      }),
      { status: 303 },
    );
  }
}

export async function POST(req: Request) {
  const token = await extractToken(req);

  if (!token) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        mode: "subscription",
        flowStatus: "0",
        flowLabel: "TOKEN_INVALIDO",
        message: "No se recibió token de registro.",
      }),
      { status: 303 },
    );
  }

  try {
    return await handle(req, token);
  } catch (error) {
    return NextResponse.redirect(
      buildFinalUrl(req, {
        mode: "subscription",
        flowStatus: "0",
        flowLabel: "ERROR_SUSCRIPCION",
        message: error instanceof Error ? error.message : "No se pudo completar la suscripción.",
      }),
      { status: 303 },
    );
  }
}

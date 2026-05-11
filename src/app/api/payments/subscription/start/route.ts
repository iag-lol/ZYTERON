import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createFlowCustomer,
  registerFlowCustomerCard,
} from "@/lib/payments/flow";
import { getServicePaymentItem } from "@/lib/payments/service-catalog";
import { insertRow } from "@/lib/admin/repository";

const payloadSchema = z.object({
  serviceKey: z.string().trim().min(2),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().trim().email().max(160),
  buyerPhone: z.string().trim().max(32).optional().or(z.literal("")),
});

function resolveBaseUrl(req: Request) {
  const fallback = "https://www.zyteron.cl";
  const fromEnv = String(
    process.env.FLOW_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.PUBLIC_SITE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      fallback,
  )
    .trim()
    .replace(/\/+$/, "");

  if (/^https?:\/\//i.test(fromEnv)) return fromEnv;

  const origin = req.headers.get("origin") || "";
  if (/^https?:\/\//i.test(origin)) return origin.replace(/\/+$/, "");

  return fallback;
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message || "Datos inválidos" }, { status: 400 });
    }

    const data = parsed.data;
    const service = getServicePaymentItem(data.serviceKey);

    if (!service || service.mode !== "subscription") {
      return NextResponse.json({ error: "Servicio de suscripción no disponible." }, { status: 400 });
    }

    const planId = String(process.env.FLOW_SUBSCRIPTION_PLAN_ID || "").trim();
    if (!planId) {
      return NextResponse.json(
        {
          error:
            "No hay plan de suscripción configurado. Define FLOW_SUBSCRIPTION_PLAN_ID para activar pagos recurrentes.",
        },
        { status: 500 },
      );
    }

    const baseUrl = resolveBaseUrl(req);
    const externalId = `zy-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const customer = await createFlowCustomer({
      name: data.buyerName,
      email: data.buyerEmail,
      externalId,
    });

    const returnUrl = `${baseUrl}/api/payments/subscription/return?planId=${encodeURIComponent(
      planId,
    )}&serviceKey=${encodeURIComponent(service.key)}&buyerName=${encodeURIComponent(data.buyerName)}&buyerEmail=${encodeURIComponent(data.buyerEmail)}&buyerPhone=${encodeURIComponent(data.buyerPhone || "")}`;

    const register = await registerFlowCustomerCard({
      customerId: customer.customerId,
      urlReturn: returnUrl,
    });

    try {
      await insertRow(
        "Lead",
        {
          id: randomUUID(),
          name: data.buyerName,
          email: data.buyerEmail,
          phone: normalizeOptional(data.buyerPhone),
          source: "FLOW_SUBSCRIPTION_START",
          message: `Servicio: ${service.title}\nPlanId: ${planId}\nCustomerId: ${customer.customerId}\nExternalId: ${externalId}`,
          type: "QUOTE",
          createdAt: new Date().toISOString(),
        },
        "id",
      );
    } catch {
      // Registro auxiliar opcional.
    }

    return NextResponse.json({
      ok: true,
      redirectUrl: `${register.url}?token=${encodeURIComponent(register.token)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar la suscripción.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

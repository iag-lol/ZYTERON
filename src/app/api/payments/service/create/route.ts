import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createFlowPayment } from "@/lib/payments/flow";
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

    if (!service) {
      return NextResponse.json({ error: "Servicio de pago no disponible." }, { status: 404 });
    }

    if (service.mode !== "checkout") {
      return NextResponse.json({ error: "Este servicio no usa pago checkout directo." }, { status: 400 });
    }

    const orderId = `SRV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const reference = randomUUID().slice(0, 8).toUpperCase();
    const baseUrl = resolveBaseUrl(req);

    const flow = await createFlowPayment({
      commerceOrder: orderId,
      subject: `${service.title} (${reference})`,
      amount: service.amount,
      email: data.buyerEmail,
      urlConfirmation: `${baseUrl}/api/payments/service/confirmation`,
      urlReturn: `${baseUrl}/api/payments/service/return`,
      paymentMethod: 9,
      timeout: 3600,
      optional: JSON.stringify({
        paymentType: "SERVICE_CHECKOUT",
        serviceKey: service.key,
        serviceTitle: service.title,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone: data.buyerPhone,
        reference,
      }),
    });

    try {
      await insertRow(
        "Lead",
        {
          id: randomUUID(),
          name: data.buyerName,
          email: data.buyerEmail,
          phone: normalizeOptional(data.buyerPhone),
          source: "FLOW_SERVICE_CHECKOUT",
          message: `Servicio: ${service.title}\nReferencia: ${reference}\nOrden: ${orderId}\nMonto: ${service.amount}`,
          type: "QUOTE",
          createdAt: new Date().toISOString(),
        },
        "id",
      );
    } catch {
      // No bloquea el flujo de pago si falla el registro auxiliar.
    }

    return NextResponse.json({
      ok: true,
      checkoutUrl: `${flow.url}?token=${encodeURIComponent(flow.token)}`,
      reference,
      orderId,
      amount: service.amount,
      service: service.title,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar el pago.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

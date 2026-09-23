import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CLIENT_PAYMENT_METHODS,
  ClientFinanceError,
  getClientFinanceSummary,
  recordClientPayment,
} from "@/lib/admin/client-finance";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const optionalText = (maxLength: number) =>
  z.preprocess((value) => {
    const text = typeof value === "string" ? value.trim() : value;
    return text === "" ? undefined : text;
  }, z.string().max(maxLength).optional());

const paymentSchema = z
  .object({
    amount: z.coerce.number().int().positive().max(2_147_483_647),
    method: z.enum(CLIENT_PAYMENT_METHODS).default("BANK_TRANSFER"),
    receivedAt: optionalText(80),
    reference: optionalText(180),
    notes: optionalText(2_000),
    receivableId: optionalText(100),
    quoteId: optionalText(100),
    taxDocumentId: optionalText(100),
    idempotencyKey: optionalText(180),
  })
  .superRefine((value, context) => {
    const targets = [value.receivableId, value.quoteId, value.taxDocumentId].filter(Boolean);
    if (targets.length > 1) {
      context.addIssue({
        code: "custom",
        message: "Selecciona solo una cuenta por cobrar, cotización o documento tributario.",
      });
    }
    if (value.receivedAt && Number.isNaN(new Date(value.receivedAt).getTime())) {
      context.addIssue({
        code: "custom",
        path: ["receivedAt"],
        message: "La fecha del pago no es válida.",
      });
    }
  });

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }
  return request.json();
}

function errorResponse(error: unknown) {
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_JSON",
        error: "El cuerpo de la solicitud no contiene JSON válido.",
      },
      { status: 400 },
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_PAYMENT",
        error: error.issues[0]?.message || "Los datos del pago no son válidos.",
        issues: error.issues,
      },
      { status: 400 },
    );
  }
  if (error instanceof ClientFinanceError) {
    return NextResponse.json(
      { ok: false, code: error.code, error: error.message },
      { status: error.status },
    );
  }
  console.error("[admin/client-finance] payment request failed", error);
  return NextResponse.json(
    { ok: false, code: "PAYMENT_ERROR", error: "No se pudo registrar el pago." },
    { status: 500 },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const summary = await getClientFinanceSummary(id);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ id }, raw] = await Promise.all([context.params, readPayload(request)]);
    const input = paymentSchema.parse(raw);
    const idempotencyKey =
      request.headers.get("idempotency-key")?.trim() ||
      input.idempotencyKey ||
      `manual:${id}:${randomUUID()}`;

    const result = await recordClientPayment({
      clientId: id,
      amount: input.amount,
      method: input.method,
      source: "MANUAL",
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : undefined,
      reference: input.reference,
      notes: input.notes,
      receivableId: input.receivableId,
      quoteId: input.quoteId,
      taxDocumentId: input.taxDocumentId,
      idempotencyKey,
      metadata: { origin: "ADMIN_CLIENT_PAYMENT" },
    });

    const summary = await getClientFinanceSummary(id);
    return NextResponse.json(
      {
        ok: true,
        payment: result,
        summary,
        message: !result.created
          ? "El pago ya había sido registrado; no se duplicó."
          : result.creditAmount > 0
            ? `Pago registrado. $${result.creditAmount.toLocaleString("es-CL")} quedó como crédito disponible.`
            : "Pago registrado y conciliado correctamente.",
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

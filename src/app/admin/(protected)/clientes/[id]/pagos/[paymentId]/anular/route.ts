import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ClientFinanceError,
  getClientFinanceSummary,
  voidClientPayment,
} from "@/lib/admin/client-finance";

type RouteContext = {
  params: Promise<{ id: string; paymentId: string }>;
};

const voidSchema = z.object({
  reason: z.string().trim().min(5, "Explica el motivo de la anulación.").max(500),
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ id, paymentId }, raw] = await Promise.all([context.params, readPayload(request)]);
    const { reason } = voidSchema.parse(raw);
    const result = await voidClientPayment({ clientId: id, paymentId, reason });
    const summary = await getClientFinanceSummary(id);

    return NextResponse.json({
      ok: true,
      payment: result,
      summary,
      message: result.alreadyVoided
        ? "El pago ya estaba anulado."
        : "Pago anulado de forma auditable; sus asignaciones dejaron de afectar el saldo.",
    });
  } catch (error) {
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
          code: "INVALID_VOID_REQUEST",
          error: error.issues[0]?.message || "Solicitud inválida.",
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
    console.error("[admin/client-finance] void payment failed", error);
    return NextResponse.json(
      { ok: false, code: "PAYMENT_VOID_ERROR", error: "No se pudo anular el pago." },
      { status: 500 },
    );
  }
}

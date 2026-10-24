import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { portalModuleEnabled } from "@/lib/portal/module-access";
import { limitedJson } from "@/lib/payments/request-body";
import { PaymentTargetError } from "@/lib/payments/invoice-payment-option";
import { createReceivableCheckout } from "@/lib/payments/receivable-flow";
import { accountingPortalCheckout } from "@/lib/payments/accounting-portal-flow";
const schema = z
  .object({
    source: z.enum(["commercial", "accounting"]),
    expectedAmount: z.number().int().positive().max(2147483647),
  })
  .strict();
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(portalAuthOptions);
  if (
    !session?.user?.id ||
    !session.user.email ||
    session.user.accountStatus !== "ACTIVE" ||
    !session.user.emailVerifiedAt
  )
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin)
      return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    if (!(await portalModuleEnabled(session.user.id, "invoices")))
      return NextResponse.json({ error: "Acceso no disponible." }, { status: 403 });
    const input = schema.safeParse(await limitedJson(req)),
      { id } = await params,
      key = req.headers.get("idempotency-key") || "";
    if (!input.success || !id || id.length > 100 || !/^[a-f0-9-]{36}$/i.test(key))
      return NextResponse.json(
        { error: "Actualiza el documento y revisa el importe." },
        { status: 400 },
      );
    const result =
      input.data.source === "accounting"
        ? await accountingPortalCheckout(session.user.id, id, input.data.expectedAmount, key)
        : await createReceivableCheckout({
            userId: session.user.id,
            id,
            amount: input.data.expectedAmount,
            email: session.user.email,
          });
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof PaymentTargetError
            ? error.message
            : "No se pudo preparar el pago. Verifica el estado del intento antes de volver a intentarlo.",
      },
      { status: error instanceof PaymentTargetError ? 409 : 503 },
    );
  }
}

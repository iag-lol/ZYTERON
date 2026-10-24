import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { clientDatabase } from "@/lib/portal/scoped-db";
import { assertCheckoutAmount, PaymentTargetError } from "./invoice-payment-option";
export async function accountingPortalCheckout(
  userId: string,
  invoiceId: string,
  amount: number,
  key: string,
) {
  await clientDatabase(userId, async (db) => {
    const rows = await db.$queryRaw<
      Array<{ balance_due: number; currency: string; status: string }>
    >`SELECT balance_due,currency,status FROM invoices WHERE id::text=${invoiceId}`;
    const row = rows[0];
    if (!row || row.currency.trim() !== "CLP" || !["ISSUED", "PARTIALLY_PAID"].includes(row.status))
      throw new PaymentTargetError("Este cobro no está disponible para pagar.");
    assertCheckoutAmount(amount, Number(row.balance_due));
  });
  const secret = process.env.CONTROL_BRIDGE_KEY;
  if (!secret) throw new Error("PAYMENT_BRIDGE_UNAVAILABLE");
  const port = process.env.CONTROL_INTERNAL_PORT || "4010";
  if (!/^\d{4,5}$/.test(port)) throw new Error("PAYMENT_BRIDGE_UNAVAILABLE");
  const body = JSON.stringify({ userId, invoiceId, amount, key }),
    time = String(Date.now()),
    nonce = randomUUID();
  const signature = createHmac("sha256", secret)
    .update(`portal-invoice-flow\n${time}\n${nonce}\n${body}`)
    .digest("hex");
  const result = await fetch(`http://127.0.0.1:${port}/api/internal/portal-invoice-flow`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-zyteron-time": time,
      "x-zyteron-nonce": nonce,
      "x-zyteron-signature": signature,
    },
    body,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  const value = await result.json();
  if (!result.ok)
    throw new Error(
      "No se pudo preparar el pago de este documento. Actualiza el saldo y vuelve a intentarlo.",
    );
  return value as { checkoutUrl: string; amount: number };
}

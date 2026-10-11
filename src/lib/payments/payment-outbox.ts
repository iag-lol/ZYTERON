import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { clientPaymentReceipt, checkoutReceipt } from "./payment-receipt";
export async function queueReceipt(input: {
  quoteId: string;
  paymentId: string;
  recipient: string;
  amount: number;
}) {
  await prisma.$executeRaw`INSERT INTO zyteron_payment_mail(dedupe,quote_id,recipient,kind,payment_id,amount) VALUES(${"payment/" + input.paymentId},${input.quoteId},${input.recipient},'QUOTE_RECEIPT',${input.paymentId},${input.amount}) ON CONFLICT(dedupe) DO NOTHING`;
}
export async function runPaymentMail() {
  const key = process.env.RESEND_API_KEY,
    from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw new Error("PAYMENT_EMAIL_CONFIGURATION_REQUIRED");
  const lease = randomUUID();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      dedupe: string;
      quote_id: string;
      payment_id: string | null;
      recipient: string;
      kind: string;
      amount: number;
      payload: { message?: string };
      first_attempt_at: Date;
    }>
  >`
 UPDATE zyteron_payment_mail SET state='PROCESSING',lease=${lease}::uuid,lease_until=now()+interval '2 minutes',first_attempt_at=coalesce(first_attempt_at,now()) WHERE id IN(SELECT id FROM zyteron_payment_mail WHERE ((state='PENDING' AND available_at<=now()) OR (state='PROCESSING' AND lease_until<now())) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 3) RETURNING *`;
  for (const row of rows) {
    let accepted: string | null = null;
    let review = false;
    try {
      // Provider idempotency expires after 24h. Ambiguous older sends require reconciliation.
      if (Date.now() - new Date(row.first_attempt_at).getTime() > 23 * 3600000) {
        review = true;
        throw new Error("EMAIL_MANUAL_REVIEW");
      }
      let attachments: Array<{ filename: string; content: string }> = [];
      if (row.kind !== "SUBSCRIPTION_CANCELLED") {
        const receipt =
          row.kind === "CHECKOUT_RECEIPT"
            ? await checkoutReceipt(row.quote_id)
            : await clientPaymentReceipt(row.payment_id || "");
        if (
          receipt.amount !== row.amount ||
          receipt.recipient.toLowerCase() !== row.recipient.toLowerCase()
        )
          throw new Error("EMAIL_RECEIPT_OWNER_MISMATCH");
        attachments = [
          { filename: "comprobante-zyteron.pdf", content: receipt.bytes.toString("base64") },
        ];
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "Idempotency-Key": "zyteron/" + row.id,
        },
        body: JSON.stringify({
          from,
          to: [row.recipient],
          subject:
            row.kind === "SUBSCRIPTION_CANCELLED"
              ? "Zyteron · cancelación de suscripción"
              : "Zyteron · pago confirmado",
          text:
            row.kind === "SUBSCRIPTION_CANCELLED"
              ? row.payload.message || "La cancelación de la suscripción quedó solicitada."
              : "Tu pago fue confirmado. Adjuntamos su comprobante de pago. Este documento no es una boleta ni factura tributaria.",
          attachments,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.id !== "string") throw new Error("EMAIL_NOT_ACCEPTED");
      accepted = data.id;
    } catch {
      /* durable retry without secrets or an unsupported claim of delivery */
    }
    await prisma.$executeRaw`UPDATE zyteron_payment_mail SET state=${accepted ? "ACCEPTED" : review ? "REVIEW_REQUIRED" : "PENDING"},provider_id=${accepted},available_at=now()+interval '2 minutes',lease=NULL,lease_until=NULL WHERE id=${row.id}::uuid AND lease=${lease}::uuid`;
  }
}

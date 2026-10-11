import "server-only";
import { prisma } from "@/lib/prisma";
import { digest, sealToken, openToken } from "./pilot-protocol";
export type PaymentAttempt = {
  token_hash: string;
  token_cipher: string;
  quote_id: string;
  client_id: string | null;
  kind: "CHECKOUT" | "QUOTE";
  stage_key: string | null;
  commerce_order: string;
  flow_order: bigint;
  amount: number;
  review_required: boolean;
};
function key() {
  const v = process.env.PAYMENT_TOKEN_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(v)) throw new Error("PAYMENT_TOKEN_KEY_REQUIRED");
  return v;
}
export async function persistPaymentAttempt(input: {
  token: string;
  quoteId: string;
  clientId: string | null;
  kind: "CHECKOUT" | "QUOTE";
  stageKey?: string;
  commerceOrder: string;
  flowOrder?: number;
  amount: number;
}) {
  if (
    !Number.isSafeInteger(input.flowOrder) ||
    !input.flowOrder ||
    !/^[A-Za-z0-9_-]{12,200}$/.test(input.token)
  )
    throw new Error("PAYMENT_PROVIDER_REFERENCE_REQUIRED");
  const hash = digest(input.token),
    cipher = sealToken(input.token, hash, key());
  await prisma.$executeRaw`INSERT INTO zyteron_payment_attempt(token_hash,token_cipher,quote_id,client_id,kind,stage_key,commerce_order,flow_order,amount) VALUES(${hash},${cipher},${input.quoteId},${input.clientId},${input.kind},${input.stageKey || null},${input.commerceOrder},${input.flowOrder}::bigint,${input.amount}) ON CONFLICT(token_hash) DO NOTHING`;
  const saved = await paymentAttempt(input.token);
  if (
    !saved ||
    saved.quote_id !== input.quoteId ||
    saved.commerce_order !== input.commerceOrder ||
    Number(saved.flow_order) !== input.flowOrder ||
    saved.amount !== input.amount
  )
    throw new Error("PAYMENT_ATTEMPT_CONFLICT");
}
export async function paymentAttempt(token: string) {
  const rows = await prisma.$queryRaw<
    PaymentAttempt[]
  >`SELECT * FROM zyteron_payment_attempt WHERE token_hash=${digest(token)}`;
  return rows[0] || null;
}
export function attemptToken(attempt: PaymentAttempt) {
  return openToken(attempt.token_cipher, attempt.token_hash, key());
}
export async function flagAttemptReview(token: string) {
  await prisma.$executeRaw`UPDATE zyteron_payment_attempt SET review_required=true WHERE token_hash=${digest(token)}`;
}

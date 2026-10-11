import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { digest, sealToken, openToken } from "./pilot-protocol";
import { samePaymentToken } from "./verified-payment";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment } from "./quote-payments";
export type CallbackKind = "CHECKOUT" | "QUOTE" | "SUBSCRIPTION";
function tokenKey() {
  const key = process.env.PAYMENT_TOKEN_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error("PAYMENT_TOKEN_KEY_REQUIRED");
  return key;
}
export async function readCallbackToken(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))
    throw new Error("CALLBACK_FORMAT_INVALID");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("CALLBACK_BODY_REQUIRED");
  let text = "",
    size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 2048) throw new Error("CALLBACK_BODY_LIMIT");
      text += decoder.decode(r.value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const p = new URLSearchParams(text);
  if ([...p.keys()].some((k) => k !== "token") || p.getAll("token").length !== 1)
    throw new Error("CALLBACK_INVALID");
  const token = p.get("token") || "";
  if (!/^[A-Za-z0-9_-]{12,200}$/.test(token)) throw new Error("CALLBACK_TOKEN_INVALID");
  return token;
}
export async function enqueueCallback(kind: CallbackKind, token: string, quoteId?: string) {
  const key = tokenKey();
  const { paymentAttempt } = await import("./payment-attempt");
  const attempt = kind === "SUBSCRIPTION" ? null : await paymentAttempt(token);
  if (attempt && attempt.kind !== kind) throw new Error("CALLBACK_TARGET_MISMATCH");
  const q = attempt
    ? await prisma.quote.findUnique({ where: { id: attempt.quote_id } })
    : quoteId
      ? await prisma.quote.findUnique({ where: { id: quoteId } })
      : await prisma.quote.findFirst({ where: { message: { contains: token } } });
  if (!q) throw new Error("CALLBACK_UNKNOWN");
  if (!attempt && kind === "CHECKOUT") {
    let m;
    try {
      m = JSON.parse(q.message || "");
    } catch {
      throw new Error("CALLBACK_UNKNOWN");
    }
    if (m.type !== "PRODUCT_CHECKOUT" || !samePaymentToken(m.flow?.token, token))
      throw new Error("CALLBACK_UNKNOWN");
  } else if (!attempt) {
    const m = normalizeQuoteMetaPayment(
      enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() }).meta,
    );
    if (kind === "QUOTE" && !m.payment?.stages?.some((s) => samePaymentToken(s.flow?.token, token)))
      throw new Error("CALLBACK_UNKNOWN");
    if (kind === "SUBSCRIPTION" && !m.payment?.subscription?.subscriptionId)
      throw new Error("CALLBACK_UNKNOWN");
  }
  const dedupe = digest(kind + "/" + token),
    id = randomUUID(),
    cipher = sealToken(token, id, key);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${q.id} FOR UPDATE`;
    const existing = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM zyteron_payment_inbox WHERE dedupe=${dedupe}`;
    if (existing.length) {
      await tx.$executeRaw`UPDATE zyteron_payment_inbox SET state='PENDING',available_at=now() WHERE dedupe=${dedupe} AND state IN ('DONE','REVIEW_REQUIRED')`;
      return;
    }
    const count = await tx.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(*) FROM zyteron_payment_inbox WHERE quote_id=${q.id} AND state IN ('PENDING','PROCESSING')`;
    if (Number(count[0].count) >= 10) throw new Error("CALLBACK_QUEUE_LIMIT");
    await tx.$executeRaw`INSERT INTO zyteron_payment_inbox(id,dedupe,kind,quote_id,token_cipher) VALUES(${id}::uuid,${dedupe},${kind},${q.id},${cipher})`;
  });
}
export async function runPaymentInbox() {
  const key = tokenKey();
  const lease = randomUUID();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      kind: CallbackKind;
      quote_id: string;
      token_cipher: string;
      attempts: number;
      created_at: Date;
    }>
  >`
 UPDATE zyteron_payment_inbox SET state='PROCESSING',lease=${lease}::uuid,lease_until=now()+interval '2 minutes',attempts=attempts+1
 WHERE id IN(SELECT id FROM zyteron_payment_inbox WHERE (state='PENDING' AND available_at<=now()) OR (state='PROCESSING' AND lease_until<now()) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 3) RETURNING id,kind,quote_id,token_cipher,attempts,created_at`;
  for (const row of rows) {
    let done = false;
    let pending = false;
    try {
      const token = openToken(row.token_cipher, row.id, key);
      if (row.kind === "CHECKOUT") {
        const { processFlowToken } = await import("@/lib/checkout/process-flow");
        const result = await processFlowToken(token);
        if (result.flowStatus === 1) throw new Error("PAYMENT_PENDING");
      } else {
        const w = await import("./quote-payment-workflow");
        const result =
          row.kind === "QUOTE"
            ? await w.processQuoteFlowPaymentToken(token)
            : await w.processQuoteSubscriptionChargeConfirmation({ quoteId: row.quote_id, token });
        if (result?.flowStatus === 1) throw new Error("PAYMENT_PENDING");
      }
      done = true;
    } catch (error) {
      pending =
        error instanceof Error &&
        error.message === "PAYMENT_PENDING" &&
        Date.now() - new Date(row.created_at).getTime() < 48 * 3600000;
      /* Only codes/state are exposed. Tokens, credentials and provider payloads stay private. */
    }
    await prisma.$executeRaw`UPDATE zyteron_payment_inbox SET state=${done ? "DONE" : row.attempts >= 8 && !pending ? "REVIEW_REQUIRED" : "PENDING"},available_at=now()+interval '1 minute',completed_at=CASE WHEN ${done} THEN now() ELSE NULL END,lease=NULL,lease_until=NULL WHERE id=${row.id}::uuid AND lease=${lease}::uuid`;
  }
}

import "server-only";
import { randomInt, randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { digest } from "./pilot-protocol";
import type { Prisma } from "@prisma/client";
type Purpose = "CANCEL_SUBSCRIPTION" | "START_SUBSCRIPTION";
function codeHash(id: string, userId: string, quoteId: string, purpose: Purpose, code: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("FINANCIAL_AUTH_CONFIGURATION_REQUIRED");
  return createHmac("sha256", secret)
    .update([id, userId, quoteId, purpose, code].join("|"))
    .digest("hex");
}
export async function sendFinancialCode(userId: string, quoteId: string, purpose: Purpose) {
  const challenge = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const u = await tx.user.findFirst({
      where: { id: userId, accountStatus: "ACTIVE", emailVerifiedAt: { not: null } },
    });
    if (!u) throw new Error("FINANCIAL_OWNER_REQUIRED");
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${quoteId} FOR UPDATE`;
    const q = await tx.quote.findFirst({
      where: {
        id: quoteId,
        OR: [{ userId }, { userId: null, email: { equals: u.email, mode: "insensitive" } }],
      },
    });
    if (!q) throw new Error("FINANCIAL_OWNER_REQUIRED");
    if (!q.userId) await tx.quote.update({ where: { id: quoteId }, data: { userId } });
    const contextHash = digest(JSON.stringify([q.message, q.total, userId, purpose]));
    const recent = await tx.$queryRaw<
      Array<{ created_at: Date }>
    >`SELECT created_at FROM zyteron_financial_challenge WHERE client_id=${userId} AND created_at>now()-interval '15 minutes' ORDER BY created_at DESC LIMIT 4`;
    if (
      recent.length >= 4 ||
      (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60000)
    )
      throw new Error("FINANCIAL_CODE_RATE_LIMIT");
    const id = randomUUID(),
      code = String(randomInt(100000, 1000000)),
      hash = codeHash(id, userId, quoteId, purpose, code);
    await tx.$executeRaw`UPDATE zyteron_financial_challenge SET consumed_at=now() WHERE client_id=${userId} AND quote_id=${quoteId} AND purpose=${purpose} AND consumed_at IS NULL`;
    await tx.$executeRaw`INSERT INTO zyteron_financial_challenge(id,client_id,quote_id,purpose,code_hash,context_hash,expires_at) VALUES(${id}::uuid,${userId},${quoteId},${purpose},${hash},${contextHash},now()+interval '5 minutes')`;
    return { id, code, email: u.email };
  });
  try {
    const key = process.env.RESEND_API_KEY,
      from = process.env.RESEND_FROM_EMAIL;
    if (!key || !from) throw new Error("EMAIL_CONFIGURATION_REQUIRED");
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        "Idempotency-Key": "zyteron-security/" + challenge.id,
      },
      body: JSON.stringify({
        from,
        to: [challenge.email],
        subject: "Zyteron · confirma tu solicitud",
        text: `Tu código para ${purpose === "CANCEL_SUBSCRIPTION" ? "cancelar" : "activar"} la suscripción es ${challenge.code}. Expira en 5 minutos. Sólo autoriza esta acción en tu cuenta.`,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("EMAIL_NOT_ACCEPTED");
  } catch {
    await prisma.$executeRaw`UPDATE zyteron_financial_challenge SET consumed_at=now() WHERE id=${challenge.id}::uuid`;
    throw new Error("FINANCIAL_CODE_SEND_UNAVAILABLE");
  }
  return { challengeId: challenge.id };
}
export async function consumeFinancialCode(
  tx: Prisma.TransactionClient,
  input: { id: string; userId: string; quoteId: string; purpose: Purpose; code: string },
) {
  if (!/^[0-9a-f-]{36}$/i.test(input.id) || !/^\d{6}$/.test(input.code)) return false;
  const rows = await tx.$queryRaw<
    Array<{
      code_hash: string;
      context_hash: string;
      attempts: number;
      expires_at: Date;
      consumed_at: Date | null;
    }>
  >`SELECT * FROM zyteron_financial_challenge WHERE id=${input.id}::uuid AND client_id=${input.userId} AND quote_id=${input.quoteId} AND purpose=${input.purpose} FOR UPDATE`;
  const r = rows[0];
  if (!r || r.consumed_at || r.attempts >= 5 || new Date(r.expires_at).getTime() <= Date.now())
    return false;
  const q = await tx.quote.findFirst({ where: { id: input.quoteId, userId: input.userId } });
  if (
    !q ||
    digest(JSON.stringify([q.message, q.total, input.userId, input.purpose])) !== r.context_hash
  )
    return false;
  const matches = timingSafeEqual(
    Buffer.from(r.code_hash, "hex"),
    Buffer.from(codeHash(input.id, input.userId, input.quoteId, input.purpose, input.code), "hex"),
  );
  await tx.$executeRaw`UPDATE zyteron_financial_challenge SET attempts=attempts+1,consumed_at=CASE WHEN ${matches} THEN now() ELSE consumed_at END WHERE id=${input.id}::uuid`;
  return matches;
}

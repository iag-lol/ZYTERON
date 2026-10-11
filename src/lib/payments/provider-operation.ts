import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sealToken, openToken, digest } from "./pilot-protocol";
export async function onceProviderOperation<T>(
  quoteId: string,
  scope: string,
  perform: () => Promise<T>,
): Promise<T> {
  const key = process.env.PAYMENT_TOKEN_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error("PAYMENT_TOKEN_KEY_REQUIRED");
  const account = digest(
      (process.env.FLOW_API_BASE ||
        (["true", "1", "yes"].includes((process.env.FLOW_USE_SANDBOX || "").toLowerCase())
          ? "https://sandbox.flow.cl/api"
          : "https://www.flow.cl/api")) +
        "/" +
        process.env.FLOW_API_KEY,
    ),
    dedupe = account + "/" + quoteId + "/" + scope;
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${quoteId} FOR UPDATE`;
    const rows = await tx.$queryRaw<
      Array<{ id: string; state: string; result_cipher: string | null }>
    >`SELECT * FROM zyteron_provider_operation WHERE dedupe=${dedupe}`;
    if (rows[0]) {
      if (rows[0].state === "READY" && rows[0].result_cipher)
        return { existing: JSON.parse(openToken(rows[0].result_cipher, rows[0].id, key)) as T };
      throw new Error("PAYMENT_CREATION_REQUIRES_RECONCILIATION");
    }
    const id = randomUUID();
    await tx.$executeRaw`INSERT INTO zyteron_provider_operation(dedupe,quote_id,id,state) VALUES(${dedupe},${quoteId},${id}::uuid,'CREATING')`;
    return { id };
  });
  if ("existing" in result) return result.existing!;
  try {
    const value = await perform(),
      cipher = sealToken(JSON.stringify(value), result.id!, key);
    await prisma.$executeRaw`UPDATE zyteron_provider_operation SET state='READY',result_cipher=${cipher} WHERE dedupe=${dedupe} AND id=${result.id}::uuid`;
    return value;
  } catch {
    await prisma.$executeRaw`UPDATE zyteron_provider_operation SET state='UNKNOWN' WHERE dedupe=${dedupe} AND state='CREATING'`;
    throw new Error("PAYMENT_CREATION_REQUIRES_RECONCILIATION");
  }
}

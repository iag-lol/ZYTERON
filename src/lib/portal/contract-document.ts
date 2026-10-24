import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { clientDatabase } from "./scoped-db";

export async function customerContractDocument(userId: string, contractId: string) {
  const visible = await clientDatabase(userId, async (db) => {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM public.client_contracts WHERE id=${contractId}::uuid`;
    return Boolean(rows.length);
  });
  if (!visible) return null;
  const secret = process.env.CONTROL_BRIDGE_KEY;
  const port = process.env.CONTROL_INTERNAL_PORT || "4010";
  if (!secret || !/^\d{4,5}$/.test(port)) throw new Error("CONTRACT_DOCUMENT_UNAVAILABLE");
  const body = JSON.stringify({ userId, contractId });
  const time = String(Date.now()),
    nonce = randomUUID();
  const signature = createHmac("sha256", secret)
    .update(`portal-contract-document\n${time}\n${nonce}\n${body}`)
    .digest("hex");
  const response = await fetch(`http://127.0.0.1:${port}/api/internal/portal-contract-document`, {
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
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("CONTRACT_DOCUMENT_UNAVAILABLE");
  const result = (await response.json()) as { contentBase64: string; filename: string };
  return { bytes: Buffer.from(result.contentBase64, "base64"), filename: result.filename };
}

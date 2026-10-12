import "server-only";
import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function boundedJson(req: Request, max = 65536): Promise<unknown> {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("REQUEST_FORMAT");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("REQUEST_FORMAT");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > max) {
        await reader.cancel();
        throw new Error("REQUEST_TOO_LARGE");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
}
function fingerprint(value: string) {
  const key = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!key) throw new Error("REQUEST_CONFIGURATION");
  return createHmac("sha256", key).update(value).digest("hex");
}
export async function publicRateLimit(req: Request, namespace: string, max: number) {
  // Render appends the source address; caller-supplied earlier entries are ignored.
  const addresses = (
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
    .slice(-1024)
    .split(",");
  const key = fingerprint(namespace + "/" + addresses.at(-1)?.trim().slice(0, 100));
  return prisma.$transaction(async (db) => {
    for (const [bucket, limit] of [
      [key, max],
      [fingerprint(namespace + "/global"), max * 30],
    ] as const) {
      const rows = await db.$queryRaw<
        Array<{ hits: number }>
      >`INSERT INTO zyteron_request_rate(key) VALUES(${bucket}) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN zyteron_request_rate.window_at<now()-interval '1 minute' THEN 1 ELSE zyteron_request_rate.hits+1 END,window_at=CASE WHEN zyteron_request_rate.window_at<now()-interval '1 minute' THEN now() ELSE zyteron_request_rate.window_at END RETURNING hits`;
      if (rows[0].hits > limit) return { allowed: false, retryAfterSec: 60 };
    }
    await db.$executeRaw`DELETE FROM zyteron_request_rate WHERE window_at<now()-interval '1 day'`;
    return { allowed: true, retryAfterSec: 0 };
  });
}
export async function withPublicSubmission<T extends Prisma.InputJsonObject>(
  namespace: string,
  key: string,
  body: unknown,
  work: (db: Prisma.TransactionClient) => Promise<T>,
) {
  if (!key || key.length > 100) throw new Error("REQUEST_KEY");
  const keyHash = fingerprint(namespace + "/" + key),
    bodyHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return prisma.$transaction(
    async (db) => {
      await db.$executeRaw`INSERT INTO zyteron_public_submission(namespace,key_hash,body_hash,state,lease_until) VALUES(${namespace},${keyHash},${bodyHash},'PROCESSING',now()+interval '2 minutes') ON CONFLICT DO NOTHING`;
      const rows = await db.$queryRaw<
        Array<{ body_hash: string; state: string; response: T | null }>
      >`SELECT body_hash,state,response FROM zyteron_public_submission WHERE namespace=${namespace} AND key_hash=${keyHash} FOR UPDATE`;
      const row = rows[0];
      if (!row || row.body_hash !== bodyHash) throw new Error("REQUEST_KEY_CONFLICT");
      if (row.state === "COMPLETE" && row.response) return { value: row.response, created: false };
      const value = await work(db);
      await db.$executeRaw`UPDATE zyteron_public_submission SET state='COMPLETE',response=${JSON.stringify(value)}::jsonb WHERE namespace=${namespace} AND key_hash=${keyHash}`;
      return { value, created: true };
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
export function intakeFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const status =
    code === "REQUEST_TOO_LARGE"
      ? 413
      : code === "REQUEST_KEY_CONFLICT"
        ? 409
        : code === "REQUEST_FORMAT" || error instanceof SyntaxError
          ? 400
          : 503;
  return NextResponse.json(
    {
      error:
        status === 409
          ? "Este intento cambió. Vuelve a enviar el formulario con una nueva referencia."
          : "No pudimos guardar tu solicitud. Intenta nuevamente en unos momentos.",
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export function portalAuthFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    /^(El código|Código de recuperación|Solicita un código|La cuenta requiere|Has superado el límite|Espera \d+s|No hay un código|Demasiados intentos)/.test(
      message,
    )
  )
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  return intakeFailure(error);
}

import { NextResponse } from "next/server";
import { boundedJson, publicRateLimit } from "@/lib/security/public-intake";
import { configuredRequestOrigins, isAllowedMutationOrigin } from "@/lib/security/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "no-referrer",
};
const failure = (status: number, message: string) =>
  NextResponse.json({ error: message }, { status, headers });
export async function POST(request: Request) {
  if (
    !isAllowedMutationOrigin({
      requestOrigin: new URL(request.url).origin,
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      allowedOrigins: configuredRequestOrigins(),
    })
  )
    return failure(403, "Origen no autorizado.");
  try {
    const limit = await publicRateLimit(request, "boleta-lookup", 30);
    if (!limit.allowed)
      return new NextResponse(
        JSON.stringify({ error: "Espera un minuto antes de volver a consultar." }),
        {
          status: 429,
          headers: { ...headers, "content-type": "application/json", "retry-after": "60" },
        },
      );
    const body = (await boundedJson(request, 512)) as Record<string, unknown>;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      typeof body.token !== "string" ||
      !/^v[12]\.[A-Za-z0-9_-]{20,150}\.[A-Za-z0-9_-]{43}$/.test(body.token)
    )
      return failure(400, "Revisa el código de consulta impreso en tu boleta.");
    const port = process.env.CONTROL_INTERNAL_PORT || "4010";
    if (!/^\d{4,5}$/.test(port) || Number(port) > 65535)
      return failure(503, "La consulta no está disponible en este momento.");
    const result = await fetch(`http://127.0.0.1:${port}/api/public/boletas/consulta`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!result.ok || !result.headers.get("content-type")?.startsWith("application/pdf"))
      return failure(
        result.status >= 500 ? 503 : 404,
        "No encontramos una boleta disponible con ese código.",
      );
    const reader = result.body?.getReader();
    if (!reader) return failure(503, "La consulta no está disponible en este momento.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 512 * 1024) {
          await reader.cancel();
          throw Error("BOLETA_RESPONSE_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.subarray(0, 5).toString() !== "%PDF-") throw Error("BOLETA_RESPONSE_INVALID");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="boleta.pdf"',
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return failure(
      code === "REQUEST_TOO_LARGE"
        ? 413
        : code === "REQUEST_FORMAT" || error instanceof SyntaxError
          ? 400
          : 503,
      "No pudimos consultar la boleta. Revisa el código o inténtalo nuevamente.",
    );
  }
}

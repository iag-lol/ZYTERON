import {
  nativePortalSettings,
  ensureNativePortalAccount,
} from "@/lib/full-control/portal-enrollment";
import {
  handleLegacyDetail,
  legacyReadPath,
  mergeLegacyRead,
} from "@/lib/full-control/legacy-adapter";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { prisma } from "@/lib/prisma";
import { websiteProposalAccepted } from "@/lib/full-control/website-quote-actions";
import { ADMIN_COOKIE } from "@/lib/auth/admin-session";
import {
  configuredRequestOrigins,
  isAllowedMutationOrigin,
  isUnsafeHttpMethod,
} from "@/lib/security/request-origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Namespace for an administrative authority, never an invented human employee.
function authorityId(id: string) {
  const h = createHash("sha256")
    .update(`zyteron:native-administrative-authority:${id}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
async function boundedBody(request: Request) {
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 25_000_000) {
        await reader.cancel();
        throw new Error("BODY_LIMIT");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks, length);
  } finally {
    reader.releaseLock();
  }
}
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  if (
    isUnsafeHttpMethod(request.method) &&
    !isAllowedMutationOrigin({
      requestOrigin: url.origin,
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      allowedOrigins: configuredRequestOrigins(),
    })
  )
    return NextResponse.json({ message: "Origen no autorizado." }, { status: 403 });
  const segments = (await params).path ?? [];
  if (
    segments[0] !== "api" ||
    segments.some((x) => !x || x === "." || x === ".." || /[\\\/%?#\u0000-\u001f]/.test(x))
  )
    return NextResponse.json({ message: "Ruta inválida." }, { status: 400 });
  const key = process.env.CONTROL_BRIDGE_KEY;
  if (!key)
    return NextResponse.json(
      { message: "La conexión administrativa no está disponible." },
      { status: 503 },
    );
  if (Number(request.headers.get("content-length") || 0) > 25_000_000)
    return NextResponse.json({ message: "Archivo demasiado grande." }, { status: 413 });
  let body: Buffer;
  try {
    body = ["GET", "HEAD"].includes(request.method) ? Buffer.alloc(0) : await boundedBody(request);
  } catch {
    return NextResponse.json({ message: "Archivo demasiado grande." }, { status: 413 });
  }
  if (body.length > 25_000_000)
    return NextResponse.json({ message: "Archivo demasiado grande." }, { status: 413 });
  const path = "/" + segments.slice(1).join("/");
  const sourceWebsiteQuoteId =
    path === "/clients" && request.method === "POST"
      ? url.searchParams.get("sourceWebsiteQuoteId")
      : null;
  if (sourceWebsiteQuoteId) {
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(body.toString());
    } catch {
      return NextResponse.json({ message: "Datos de cliente inválidos." }, { status: 400 });
    }
    const source = await prisma.quote.findUnique({ where: { id: sourceWebsiteQuoteId } });
    if (
      !source ||
      !websiteProposalAccepted(source) ||
      source.userId ||
      source.email.trim().toLowerCase() !==
        String(input.generalEmail || "")
          .trim()
          .toLowerCase()
    )
      return NextResponse.json(
        {
          message:
            "No se puede vincular esta cotización con los datos indicados. Revisa el cliente y el correo.",
        },
        { status: 409 },
      );
  }
  let legacy: NextResponse | null;
  try {
    legacy =
      (await nativePortalSettings(path, request, body)) ||
      (await handleLegacyDetail(request, path, body));
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida o no fue posible guardar la operación." },
      { status: 400 },
    );
  }
  if (legacy) return legacy;
  const target = "/" + segments.map(encodeURIComponent).join("/") + url.search;
  const cookieStore = await cookies();
  const sessionSource = auth.legacy
    ? cookieStore.get(ADMIN_COOKIE)?.value
    : cookieStore.get("__Secure-next-auth.session-token")?.value ||
      cookieStore.get("next-auth.session-token")?.value;
  if (!sessionSource) return NextResponse.json({ message: "Sesión inválida." }, { status: 401 });
  const context = Buffer.from(
    JSON.stringify({
      role: "GERENTE_GENERAL",
      userId: authorityId(auth.session.user.id),
      sessionId: "native:" + createHash("sha256").update(sessionSource).digest("hex"),
      time: Date.now(),
      nonce: randomUUID(),
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(
      [request.method, target, createHash("sha256").update(body).digest("hex"), context].join("\n"),
    )
    .digest("hex");
  const headers = new Headers({
    "x-zyteron-native-context": context,
    "x-zyteron-native-signature": signature,
    "content-type": request.headers.get("content-type") || "application/json",
    "x-request-id": randomUUID(),
  });
  const idem = request.headers.get("idempotency-key");
  if (idem && /^[A-Za-z0-9._:-]{8,128}$/.test(idem)) headers.set("idempotency-key", idem);
  try {
    const result = await fetch(
      `http://127.0.0.1:${process.env.CONTROL_INTERNAL_PORT || "4010"}${target}`,
      {
        method: request.method,
        headers,
        body: body.length
          ? (body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer)
          : undefined,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (result.ok && request.method === "POST" && path === "/clients") {
      const client = await result.json();
      let portalPreparation = "PREPARED";
      try {
        const userId = await ensureNativePortalAccount(client.id);
        if (sourceWebsiteQuoteId) {
          const updated = await prisma.quote.updateMany({
            where: { id: sourceWebsiteQuoteId, userId: null },
            data: { userId },
          });
          if (updated.count !== 1) throw Error("QUOTE_CLIENT_LINK_REQUIRES_REVIEW");
          await prisma.clientAuditLog.create({
            data: {
              actorId: auth.legacy ? null : auth.session.user.id,
              targetUserId: userId,
              action: "CONTROL_QUOTE_CLIENT_LINKED",
              entityType: "Quote",
              entityId: sourceWebsiteQuoteId,
              details: { clientId: client.id },
            },
          });
        }
      } catch {
        portalPreparation = "REVIEW_REQUIRED";
      }
      return NextResponse.json(
        { ...client, portalPreparation },
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (result.ok && request.method === "GET" && legacyReadPath(path)) {
      const merged = await mergeLegacyRead(path, url.searchParams, await result.json());
      return NextResponse.json(merged, { headers: { "cache-control": "no-store" } });
    }
    const out = new Headers({ "cache-control": "no-store", "x-content-type-options": "nosniff" });
    for (const h of ["content-type", "content-disposition"]) {
      const v = result.headers.get(h);
      if (v) out.set(h, v);
    }
    return new NextResponse(await result.arrayBuffer(), { status: result.status, headers: out });
  } catch {
    return NextResponse.json(
      { message: "No fue posible conectar con el servicio administrativo. Vuelve a intentarlo." },
      { status: 503 },
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };

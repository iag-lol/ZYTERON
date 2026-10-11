import "server-only";
import { prisma } from "@/lib/prisma";
import {
  parseSiteBindings,
  validSiteSignature,
  siteSignature,
  decideSiteAccess,
} from "./site-access-policy";
import { limitedJson } from "./request-body";
export async function siteAccessResponse(req: Request) {
  const b = (await limitedJson(req).catch(() => null)) as {
    siteId?: string;
    timestamp?: number;
    nonce?: string;
    ack?: string;
  } | null;
  if (
    !b ||
    typeof b.siteId !== "string" ||
    typeof b.timestamp !== "number" ||
    Math.abs(Date.now() - b.timestamp) > 60000 ||
    typeof b.nonce !== "string" ||
    !/^[a-z0-9-]{16,80}$/i.test(b.nonce) ||
    Object.keys(b).some((k) => !["siteId", "timestamp", "nonce", "ack"].includes(k))
  )
    return new Response("Unauthorized", { status: 401 });
  const binding = parseSiteBindings(process.env.PAYMENT_SITE_BINDINGS).find(
    (s) => s.siteId === b.siteId,
  );
  if (!binding) return new Response("Unauthorized", { status: 401 });
  const body = JSON.stringify(b);
  if (!validSiteSignature(binding.secret, body, req.headers.get("x-zyteron-signature") || ""))
    return new Response("Unauthorized", { status: 401 });
  const rows = await prisma.$queryRaw<
    Array<{ state: string; verified_at: Date | null; client_id: string; paid_through: Date | null }>
  >`SELECT state,verified_at,client_id,paid_through FROM zyteron_recurring_lifecycle WHERE quote_id=${binding.quoteId}`;
  const life = rows[0];
  let mode: "ACTIVE" | "MAINTENANCE" | "REVIEW_REQUIRED" = "ACTIVE";
  let paidThrough: Date | null = null;
  if (life) {
    // Read the ledger on each request; a late confirmed payment invalidates an older suspension decision.
    const p = await prisma.payment.findMany({
      where: {
        clientId: life.client_id,
        status: "CONFIRMED",
        source: "SUBSCRIPTION",
        provider: "FLOW",
      },
      select: { metadata: true },
    });
    const ends = p
      .map((x) => x.metadata as { quoteId?: string; periodEnd?: string } | null)
      .filter((x) => x?.quoteId === binding.quoteId && x.periodEnd)
      .map((x) => new Date(x!.periodEnd!))
      .filter((d) => Number.isFinite(d.getTime()))
      .sort((a, c) => a.getTime() - c.getTime());
    paidThrough = ends.at(-1) || null;
    mode = decideSiteAccess({
      state: life.state,
      verifiedAt: life.verified_at,
      paidThrough,
      now: new Date(),
    });
  }
  const version = siteSignature(
    binding.secret,
    JSON.stringify([binding.siteId, life?.state, paidThrough?.toISOString(), mode]),
  );
  if (b.ack === version && mode === "MAINTENANCE")
    await prisma.$executeRaw`UPDATE zyteron_recurring_lifecycle SET maintenance_ack_at=now(),maintenance_version=${version} WHERE quote_id=${binding.quoteId} AND state='CANCELLED'`;
  const response = JSON.stringify({
    siteId: binding.siteId,
    origin: binding.origin,
    mode,
    paidThrough: paidThrough?.toISOString() || null,
    version,
    nonce: b.nonce,
    expiresAt: Date.now() + 15000,
  });
  return new Response(response, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "x-zyteron-signature": siteSignature(binding.secret, response),
    },
  });
}

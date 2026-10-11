// Integrate into the specific client's existing Next.js proxy; do not replace its auth rules.
// Server-only SITE_ID / SITE_ORIGIN / SITE_SHARED_SECRET. Never NEXT_PUBLIC_*.
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
const sign = (body: string) =>
  createHmac("sha256", process.env.SITE_SHARED_SECRET || "")
    .update(body)
    .digest("hex");
export async function subscriptionSiteGate(req: NextRequest) {
  void req;
  if (process.env.SITE_MAINTENANCE_ENABLED !== "true") return NextResponse.next();
  const siteId = process.env.SITE_ID,
    origin = process.env.SITE_ORIGIN,
    key = process.env.SITE_SHARED_SECRET;
  if (!siteId || !origin || !key || !/^[a-f0-9]{64}$/i.test(key))
    return new NextResponse("Servicio temporalmente no disponible", { status: 503 });
  const nonce = randomUUID(),
    body = JSON.stringify({ siteId, timestamp: Date.now(), nonce });
  try {
    const r = await fetch("https://www.zyteron.cl/api/site-access", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-zyteron-signature": sign(body) },
      body,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const text = await r.text(),
      signature = r.headers.get("x-zyteron-signature") || "";
    if (
      !r.ok ||
      text.length > 4096 ||
      !/^[a-f0-9]{64}$/i.test(signature) ||
      !timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(sign(text), "hex"))
    )
      throw new Error("INVALID_DECISION");
    const d = JSON.parse(text);
    if (
      d.siteId !== siteId ||
      d.origin !== origin ||
      d.nonce !== nonce ||
      d.expiresAt < Date.now() ||
      d.expiresAt > Date.now() + 30000
    )
      throw new Error("INVALID_DECISION");
    if (d.mode === "ACTIVE") return NextResponse.next();
    if (d.mode !== "MAINTENANCE") throw new Error("REVIEW_REQUIRED");
    // The decision is fresh from the confirmed-payment ledger. Retain existing auth/API exemptions.
    const ack = JSON.stringify({
      siteId,
      timestamp: Date.now(),
      nonce: randomUUID(),
      ack: d.version,
    });
    const ackResponse = await fetch("https://www.zyteron.cl/api/site-access", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-zyteron-signature": sign(ack) },
      body: ack,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    const ackText = await ackResponse.text(),
      ackSignature = ackResponse.headers.get("x-zyteron-signature") || "";
    if (
      !ackResponse.ok ||
      ackText.length > 4096 ||
      !/^[a-f0-9]{64}$/i.test(ackSignature) ||
      !timingSafeEqual(Buffer.from(ackSignature, "hex"), Buffer.from(sign(ackText), "hex"))
    )
      throw new Error("INVALID_ACK");
    const effective = JSON.parse(ackText);
    if (
      effective.siteId !== siteId ||
      effective.origin !== origin ||
      effective.nonce !== JSON.parse(ack).nonce ||
      effective.expiresAt < Date.now()
    )
      throw new Error("INVALID_ACK");
    if (effective.mode === "ACTIVE") return NextResponse.next();
    if (effective.mode !== "MAINTENANCE" || effective.version !== d.version)
      throw new Error("DECISION_CHANGED");
    return new NextResponse(
      '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sitio en mantención</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f5ed;color:#203c2f;font-family:Arial,sans-serif"><main style="max-width:540px;padding:40px"><p style="font-size:12px;letter-spacing:2px">MANTENCIÓN DEL SITIO</p><h1 style="font-size:38px;line-height:1.1">Volvemos cuando el servicio se reactive.</h1><p>Contacta al responsable del sitio para conocer el estado de su servicio.</p></main></body></html>',
      {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex,nofollow",
          "Retry-After": "3600",
        },
      },
    );
  } catch {
    return new NextResponse("Servicio temporalmente no disponible", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}

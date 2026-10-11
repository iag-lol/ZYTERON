import { createHmac, timingSafeEqual } from "node:crypto";
export const CHECKOUT_GRANT_COOKIE = "__Host-zyteron-checkout";
function sign(payload: string) {
  const key = process.env.NEXTAUTH_SECRET || "";
  if (key.length < 32) throw new Error("PAYMENT_SESSION_SECRET_REQUIRED");
  return createHmac("sha256", key)
    .update("checkout-read/" + payload)
    .digest("hex");
}
export function createCheckoutGrant(orderId: string, tokenHash: string, now = Date.now()) {
  const p = Buffer.from(
    JSON.stringify({ orderId, tokenHash, expiresAt: now + 30 * 60000 }),
  ).toString("base64url");
  return p + "." + sign(p);
}
export function readCheckoutGrant(
  cookie: string | undefined,
  now = Date.now(),
): { orderId: string; tokenHash: string } | null {
  if (!cookie || cookie.length > 1024) return null;
  const [p, s, ...extra] = cookie.split(".");
  if (!p || extra.length || !/^[a-f0-9]{64}$/.test(s || "")) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sign(p), "hex"), Buffer.from(s, "hex"))) return null;
    const b = JSON.parse(Buffer.from(p, "base64url").toString());
    if (
      typeof b.orderId !== "string" ||
      b.orderId.length > 100 ||
      !/^[a-f0-9]{64}$/.test(b.tokenHash) ||
      !Number.isSafeInteger(b.expiresAt) ||
      b.expiresAt <= now ||
      b.expiresAt > now + 30 * 60000
    )
      return null;
    return { orderId: b.orderId, tokenHash: b.tokenHash };
  } catch {
    return null;
  }
}

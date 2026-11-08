import { createHmac, timingSafeEqual } from "node:crypto";
export const MANUAL_COOKIE = "zyteron-manual-quote";
export const MANUAL_TTL = 7 * 24 * 60 * 60;
function signature(value: string) {
  const key = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
  if (key.length < 32) throw new Error("MANUAL_SECRET_REQUIRED");
  return createHmac("sha256", key)
    .update("manual-quote/" + value)
    .digest("hex");
}
export function createManualGrant(id: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id, expires: now + MANUAL_TTL * 1000 })).toString(
    "base64url",
  );
  return payload + "." + signature(payload);
}
export function readManualGrant(value?: string, now = Date.now()): string | null {
  if (!value || value.length > 1024) return null;
  try {
    const [payload, sig, ...rest] = value.split(".");
    if (
      rest.length ||
      !/^[a-f0-9]{64}$/.test(sig) ||
      !timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(signature(payload), "hex"))
    )
      return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return /^[a-f0-9-]{36}$/.test(data.id) &&
      Number.isSafeInteger(data.expires) &&
      data.expires > now &&
      data.expires <= now + MANUAL_TTL * 1000
      ? data.id
      : null;
  } catch {
    return null;
  }
}

import { createHmac, timingSafeEqual } from "node:crypto";
export type SiteBinding = { siteId: string; quoteId: string; origin: string; secret: string };
export function siteSignature(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}
export function validSiteSignature(secret: string, body: string, supplied: string) {
  return (
    /^[a-f0-9]{64}$/i.test(supplied) &&
    timingSafeEqual(Buffer.from(siteSignature(secret, body), "hex"), Buffer.from(supplied, "hex"))
  );
}
export function parseSiteBindings(raw: string | undefined): SiteBinding[] {
  if (!raw) return [];
  let values: unknown;
  try {
    values = JSON.parse(raw);
  } catch {
    throw new Error("SITE_BINDING_CONFIGURATION_INVALID");
  }
  if (!Array.isArray(values) || values.length > 100)
    throw new Error("SITE_BINDING_CONFIGURATION_INVALID");
  const result: SiteBinding[] = [];
  for (const v of values) {
    if (typeof v !== "object" || v === null) throw new Error("SITE_BINDING_CONFIGURATION_INVALID");
    const b = v as SiteBinding;
    let u: URL;
    try {
      u = new URL(b.origin);
    } catch {
      throw new Error("SITE_BINDING_ORIGIN_INVALID");
    }
    if (
      !/^[a-z0-9_-]{8,80}$/i.test(b.siteId) ||
      !b.quoteId ||
      !/^[a-f0-9]{64}$/i.test(b.secret) ||
      u.protocol !== "https:" ||
      ["www.zyteron.cl", "zyteron.cl", "zyteron.onrender.com"].includes(u.hostname) ||
      u.port ||
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash ||
      result.some((x) => x.siteId === b.siteId || x.quoteId === b.quoteId || x.secret === b.secret)
    )
      throw new Error("SITE_BINDING_CONFIGURATION_INVALID");
    result.push({ ...b, origin: u.origin });
  }
  return result;
}
export function decideSiteAccess(input: {
  state: string;
  verifiedAt: Date | null;
  paidThrough: Date | null;
  now: Date;
}) {
  // Absence of reconciled coverage is a review state, never proof that a paid site should be suspended.
  if (input.state !== "CANCELLED" || !input.verifiedAt || !input.paidThrough)
    return "ACTIVE" as const;
  if (input.paidThrough.getTime() > input.now.getTime()) return "ACTIVE" as const;
  if (input.now.getTime() - input.verifiedAt.getTime() > 5 * 60000)
    return "REVIEW_REQUIRED" as const;
  return input.paidThrough.getTime() <= input.now.getTime()
    ? ("MAINTENANCE" as const)
    : ("ACTIVE" as const);
}

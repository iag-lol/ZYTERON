// Expiration closes new test charges. An already confirmed payment remains
// readable by its original private capability, with a fresh short-lived grant.
export function pilotAccessScope(state: string, expiresAt: string, now = Date.now()): "PAY" | "READ" {
  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry)) throw new Error("PILOT_ACCESS_DENIED");
  if (expiry > now) return "PAY";
  if (state === "CONFIRMED") return "READ";
  throw new Error("PILOT_ACCESS_DENIED");
}

export function pilotReadAllowed(scope: "PAY" | "READ", state: string) {
  return scope === "READ" && state === "CONFIRMED";
}

import { createHmac, timingSafeEqual } from "node:crypto";

export const CREDENTIAL_CODE_MINUTES = 5;
export const CREDENTIAL_MAX_ATTEMPTS = 5;
export const CREDENTIAL_CODE_PREFIX = "credential-reveal:";

// A non-email namespace keeps these records isolated from account verification.
export function credentialCodeScope(credentialId: string, factor: "owner" | "approval") {
  return `${CREDENTIAL_CODE_PREFIX}${factor}:${credentialId}`;
}

export function hashCredentialCode(input: {
  challengeId: string;
  userId: string;
  credentialId: string;
  recipient: string;
  factor: "owner" | "approval";
  code: string;
  sessionBinding?: string;
  credentialVersion?: string;
}) {
  const key =
    process.env.PORTAL_CODE_PEPPER || process.env.PORTAL_SECRET_KEY || process.env.NEXTAUTH_SECRET;
  if (!key?.trim()) throw new Error("Credential verification secret is not configured.");
  return createHmac("sha256", key)
    .update(
      JSON.stringify([
        "credential-reveal-v2",
        input.challengeId,
        input.userId,
        input.credentialId,
        input.recipient.trim().toLowerCase(),
        input.factor,
        input.code,
        input.sessionBinding || "",
        input.credentialVersion || "",
      ]),
    )
    .digest("hex");
}

export function credentialSessionBinding(userId: string, sessionId: string) {
  if (!userId || !sessionId) throw new Error("Credential session is unavailable.");
  const key =
    process.env.PORTAL_CODE_PEPPER || process.env.PORTAL_SECRET_KEY || process.env.NEXTAUTH_SECRET;
  if (!key) throw new Error("Credential verification secret is not configured.");
  return createHmac("sha256", key)
    .update(JSON.stringify(["credential-session-v1", userId, sessionId]))
    .digest("hex");
}

export function credentialHashesEqual(actual: string, expected: string) {
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === 32 && b.length === 32 && timingSafeEqual(a, b);
}

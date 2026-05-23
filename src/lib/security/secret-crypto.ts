import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getSecretKey() {
  const raw = String(process.env.PORTAL_SECRET_KEY || process.env.NEXTAUTH_SECRET || "").trim();
  if (!raw) {
    throw new Error("Falta PORTAL_SECRET_KEY o NEXTAUTH_SECRET para cifrar datos sensibles.");
  }
  return createHash("sha256").update(raw).digest();
}

export function hashOtpCode(code: string) {
  const pepper = String(process.env.PORTAL_CODE_PEPPER || "").trim();
  return createHash("sha256").update(`${pepper}:${code}`).digest("hex");
}

export function encryptSecret(plain: string) {
  const key = getSecretKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret(payload: { ciphertext?: string | null; iv?: string | null; tag?: string | null }) {
  if (!payload.ciphertext || !payload.iv || !payload.tag) return null;
  try {
    const key = getSecretKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function maskSecret(value: string, keep = 3) {
  const trimmed = value.trim();
  if (trimmed.length <= keep) return "•".repeat(Math.max(trimmed.length, 4));
  return `${"•".repeat(Math.max(6, trimmed.length - keep))}${trimmed.slice(-keep)}`;
}

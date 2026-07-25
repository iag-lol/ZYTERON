import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado en reposo (AES-256-GCM) para secretos tributarios como la contraseña
 * del certificado. La llave viene de SII_ENCRYPTION_KEY (se deriva a 32 bytes con
 * SHA-256). SOLO backend. Nunca se registra el texto plano ni la llave.
 */

function getKey(): Buffer {
  const raw = String(process.env.SII_ENCRYPTION_KEY || "").trim();
  if (!raw) throw new Error("SII_ENCRYPTION_KEY no está configurada.");
  return createHash("sha256").update(raw).digest(); // 32 bytes
}

export type Encrypted = { ciphertext: string; iv: string; tag: string };

export function encryptSecret(plaintext: string): Encrypted {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret(payload: Encrypted): string {
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

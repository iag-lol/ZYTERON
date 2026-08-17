import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado de tokens de Microsoft Graph antes de guardarlos en Supabase.
 * Nunca se almacenan ni se envían al navegador en texto plano.
 *
 * Formato: v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 */

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function getKey(): Buffer {
  const secret = process.env.SALES_AI_ENCRYPTION_KEY?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "SALES_AI_ENCRYPTION_KEY no está configurada o es demasiado corta (mínimo 32 caracteres).",
    );
  }
  // Derivamos 32 bytes exactos con SHA-256 para aceptar claves de cualquier largo.
  return createHash("sha256").update(secret).digest();
}

export function isEncryptionConfigured(): boolean {
  const secret = process.env.SALES_AI_ENCRYPTION_KEY?.trim();
  return Boolean(secret && secret.length >= 32);
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Formato de token cifrado no reconocido.");
  }

  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Comparación en tiempo constante para validar el clientState del webhook. */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

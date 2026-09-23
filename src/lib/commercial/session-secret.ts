type Environment = Record<string, string | undefined>;

const MIN_SECRET_BYTES = 32;

function clean(value?: string) {
  return String(value || "").trim();
}

function hasSecureLength(value: string) {
  return new TextEncoder().encode(value).byteLength >= MIN_SECRET_BYTES;
}

/**
 * La clave dedicada tiene precedencia. Si está presente pero es insegura, la
 * configuración se considera inválida y no se oculta el error usando otra
 * variable como fallback.
 */
export function resolveCommercialSessionSecret(env: Environment = process.env) {
  const dedicated = clean(env.COMMERCIAL_SESSION_SECRET);
  if (dedicated) return hasSecureLength(dedicated) ? dedicated : null;

  const sharedAuthSecret = clean(env.NEXTAUTH_SECRET);
  return sharedAuthSecret && hasSecureLength(sharedAuthSecret) ? sharedAuthSecret : null;
}

export function requireCommercialSessionSecret(env: Environment = process.env) {
  const secret = resolveCommercialSessionSecret(env);
  if (!secret) {
    throw new Error(
      "Falta COMMERCIAL_SESSION_SECRET (mínimo 32 bytes) para emitir sesiones comerciales.",
    );
  }
  return secret;
}

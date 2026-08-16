/**
 * Sesión administrativa firmada.
 *
 * Antes la cookie guardaba un texto fijo escrito en el código: cualquiera que
 * leyera el repositorio podía escribirlo en su navegador y entrar como
 * administrador. Ahora la cookie contiene un token firmado con HMAC-SHA256
 * que solo el servidor puede producir, con caducidad propia y un valor
 * aleatorio distinto en cada inicio de sesión.
 *
 * Se usa Web Crypto (no `node:crypto`) porque el middleware corre en el
 * runtime Edge y debe poder verificar el token allí.
 */

export const ADMIN_COOKIE = "zyteron_admin_token";

/** Duración de la sesión administrativa. */
const MAX_AGE_SECONDS = 60 * 60 * 12;

type AdminSessionPayload = {
  /** Momento de expiración, en segundos. */
  exp: number;
  /** Valor aleatorio: hace que dos sesiones nunca compartan token. */
  jti: string;
};

/**
 * Secreto de firma. Sin secreto configurado no se emite ni se acepta ninguna
 * sesión: es preferible que el panel quede inaccesible a que quede abierto.
 */
function secret(): string | null {
  const value = (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  ).trim();
  return value.length >= 16 ? value : null;
}

export function isAdminAuthConfigured(): boolean {
  return secret() !== null && Boolean(process.env.ADMIN_PASSWORD?.trim());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

const encoder = new TextEncoder();

async function hmac(data: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

/** Comparación en tiempo constante: no filtra información por la duración. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Emite un token nuevo. Devuelve null si falta el secreto de firma. */
export async function createAdminSessionToken(): Promise<string | null> {
  const key = secret();
  if (!key) return null;

  const random = new Uint8Array(16);
  crypto.getRandomValues(random);

  const payload: AdminSessionPayload = {
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    jti: toBase64Url(random),
  };
  const data = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${data}.${await hmac(data, key)}`;
}

/**
 * Verifica firma y vigencia. Cualquier token manipulado, caducado o emitido
 * con otro secreto se rechaza.
 */
export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  const key = secret();
  if (!key || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [data, signature] = parts;
  if (!data || !signature) return false;

  const expected = await hmac(data, key);
  if (!timingSafeEqual(expected, signature)) return false;

  try {
    const decoded = new TextDecoder().decode(fromBase64Url(data));
    const payload = JSON.parse(decoded) as AdminSessionPayload;
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/** Atributos de la cookie de sesión administrativa. */
export function adminCookieOptions(value: string) {
  return {
    name: ADMIN_COOKIE,
    value,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearedAdminCookie() {
  return { name: ADMIN_COOKIE, value: "", path: "/", maxAge: 0 };
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCommercialUserById, type CommercialUser } from "@/lib/commercial/store";

/**
 * Sesión firmada (HMAC-SHA256) para usuarios comerciales. Cookie httpOnly,
 * separada del admin y del portal de clientes. No usa base de datos para
 * validar el token (rápido), pero sí verifica el usuario al requerirlo.
 */

export const COMMERCIAL_COOKIE = "zyteron_comercial";
const MAX_AGE = 60 * 60 * 12; // 12 horas

type SessionPayload = { id: string; role: string; rut: string; exp: number };

function secret(): string {
  return (
    process.env.COMMERCIAL_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "zyteron-comercial-dev-secret"
  ).trim();
}

function b64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}
function fromB64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}
function sign(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(user: Pick<CommercialUser, "id" | "role" | "rut">): string {
  const payload: SessionPayload = {
    id: user.id,
    role: user.role,
    rut: user.rut,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
  const data = b64url(JSON.stringify(payload));
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = sign(data);
  try {
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(data)) as SessionPayload;
    if (!payload?.id || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function commercialSessionCookieOptions(value: string) {
  return {
    name: COMMERCIAL_COOKIE,
    value,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Lee la sesión actual (payload) sin tocar la base de datos. */
export async function getCommercialSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(COMMERCIAL_COOKIE)?.value);
}

/**
 * Exige un usuario comercial válido y activo. Redirige al login si no lo hay.
 * Opcionalmente restringe por roles permitidos.
 */
export async function requireCommercialUser(allowedRoles?: string[]): Promise<CommercialUser> {
  const session = await getCommercialSession();
  if (!session) redirect("/admin/login?portal=comercial");
  const user = await getCommercialUserById(session!.id);
  if (!user || user.status !== "active") redirect("/admin/login?portal=comercial&e=1");
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user!.role)) {
    redirect("/portal-comercial");
  }
  return user!;
}

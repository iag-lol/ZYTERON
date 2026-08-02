import { NextResponse } from "next/server";
import { adminCookieOptions, createAdminSessionToken } from "@/lib/auth/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Acceso administrativo.
 *
 * La contraseña se compara en tiempo constante y solo contra la variable de
 * entorno: ya no existe una contraseña por defecto escrita en el código. Si
 * falta la configuración, el acceso se rechaza en vez de caer a un valor
 * conocido.
 */

// Límite de intentos por IP: sin esto la contraseña se puede probar sin freno.
type Attempt = { hits: number; first: number };
declare global {
  var zyteronAdminLoginRL: Map<string, Attempt> | undefined;
}
const attempts = globalThis.zyteronAdminLoginRL ?? new Map<string, Attempt>();
globalThis.zyteronAdminLoginRL = attempts;
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function isRateLimited(addr: string): boolean {
  const now = Date.now();
  const entry = attempts.get(addr);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(addr, { hits: 1, first: now });
    return false;
  }
  if (entry.hits >= MAX_ATTEMPTS) return true;
  entry.hits += 1;
  return false;
}

/** Comparación que no revela por su duración cuántos caracteres coinciden. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function parsePwd(req: Request) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    return { pwd: body?.pwd as string | undefined, isJson: true };
  }
  const formData = await req.formData().catch(() => null);
  const raw = formData?.get("pwd");
  return { pwd: typeof raw === "string" ? raw : undefined, isJson: false };
}

function deny(req: Request, isJson: boolean, status = 401, message = "Credenciales incorrectas.") {
  if (isJson) return NextResponse.json({ ok: false, error: message }, { status });
  return NextResponse.redirect(new URL("/admin/login?error=1", req.url), { status: 303 });
}

export async function POST(req: Request) {
  const { pwd, isJson } = await parsePwd(req);

  if (isRateLimited(clientIp(req))) {
    return deny(req, isJson, 429, "Demasiados intentos. Espera unos minutos.");
  }

  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected) {
    // Fallar cerrado: sin contraseña configurada no entra nadie.
    console.error("[admin/login] ADMIN_PASSWORD no está configurada en el servidor.");
    return deny(req, isJson, 503, "El acceso administrativo no está configurado.");
  }

  if (!pwd || !timingSafeEqual(pwd, expected)) {
    return deny(req, isJson);
  }

  const token = await createAdminSessionToken();
  if (!token) {
    console.error("[admin/login] Falta ADMIN_SESSION_SECRET o NEXTAUTH_SECRET para firmar la sesión.");
    return deny(req, isJson, 503, "El acceso administrativo no está configurado.");
  }

  const res = isJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
  res.cookies.set(adminCookieOptions(token));
  return res;
}

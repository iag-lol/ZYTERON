import { NextResponse } from "next/server";
import { COOKIE_KEY } from "@/lib/auth/admin-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearAdminSession(req: Request) {
  // 303 obliga al navegador a pedir /admin/login con GET, sin reenviar el POST.
  const res = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  res.cookies.set({ name: COOKIE_KEY, value: "", path: "/", maxAge: 0 });
  return res;
}

/**
 * Cierre de sesión. Va por POST porque cambia estado: así el router no lo
 * precarga, no se dispara desde una etiqueta <img> ajena y no depende de la
 * negociación RSC de una navegación cliente.
 */
export function POST(req: Request) {
  return clearAdminSession(req);
}

/**
 * Compatibilidad con marcadores o enlaces antiguos que apuntan aquí por GET.
 *
 * El router precarga los enlaces, y una precarga que borrara la cookie cerraría
 * la sesión sola. Next 16 marca esas peticiones con varias cabeceras según el
 * tipo de precarga (clásica, por segmento o de navegador), así que se
 * contemplan todas y se responde sin tocar la sesión.
 */
export function GET(req: Request) {
  const headers = req.headers;
  const isPrefetch =
    headers.get("purpose") === "prefetch" ||
    headers.get("sec-purpose")?.includes("prefetch") ||
    headers.has("next-router-prefetch") ||
    headers.has("next-router-segment-prefetch") ||
    headers.has("x-middleware-prefetch");

  if (isPrefetch) return new NextResponse(null, { status: 204 });
  return clearAdminSession(req);
}

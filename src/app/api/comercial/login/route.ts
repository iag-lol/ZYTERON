import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCommercialCredentials } from "@/lib/commercial/store";
import { createSessionToken, commercialSessionCookieOptions } from "@/lib/commercial/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit básico por IP (memoria).
type Entry = { hits: number; first: number };
declare global {
  var zyteronComercialLoginRL: Map<string, Entry> | undefined;
}
const rl = globalThis.zyteronComercialLoginRL ?? new Map<string, Entry>();
globalThis.zyteronComercialLoginRL = rl;
const WINDOW = 60_000;
const MAX = 8;

function ip(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown";
}
function limited(addr: string) {
  const now = Date.now();
  const e = rl.get(addr);
  if (!e || now - e.first > WINDOW) {
    rl.set(addr, { hits: 1, first: now });
    return false;
  }
  if (e.hits >= MAX) return true;
  e.hits += 1;
  return false;
}

const schema = z.object({ rut: z.string().min(3).max(20), password: z.string().min(1).max(200) });

const PORTAL_BY_ROLE: Record<string, string> = {
  executive: "/portal-comercial",
  portfolio: "/portal-comercial",
  partner: "/portal-comercial",
};

export async function POST(req: Request) {
  if (limited(ip(req))) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const user = await verifyCommercialCredentials(parsed.data.rut, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "RUT o contraseña incorrectos." }, { status: 401 });
  }

  const token = createSessionToken(user);
  const res = NextResponse.json({ ok: true, redirect: PORTAL_BY_ROLE[user.role] ?? "/portal-comercial" });
  res.cookies.set(commercialSessionCookieOptions(token));
  return res;
}

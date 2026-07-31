import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createWidgetSession,
  isWidgetAuthConfigured,
  verifyWidgetAdminPassword,
  verifyWidgetSession,
  widgetBearerToken,
} from "@/lib/widget/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({ password: z.string().min(1).max(512) });
type Attempt = { count: number; windowStartedAt: number };
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

declare global {
  var zyteronWidgetLoginAttempts: Map<string, Attempt> | undefined;
}
const attempts = globalThis.zyteronWidgetLoginAttempts ?? new Map<string, Attempt>();
globalThis.zyteronWidgetLoginAttempts = attempts;

function requestIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || now - current.windowStartedAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStartedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

function privateJson(body: object, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export async function POST(req: Request) {
  if (!isWidgetAuthConfigured()) {
    return privateJson({ error: "El acceso del widget no está configurado en el servidor." }, { status: 503 });
  }

  const ip = requestIp(req);
  if (isRateLimited(ip)) {
    return privateJson({ error: "Demasiados intentos. Intenta nuevamente más tarde." }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !verifyWidgetAdminPassword(parsed.data.password)) {
    return privateJson({ error: "Credenciales administrativas inválidas." }, { status: 401 });
  }

  attempts.delete(ip);
  return privateJson({ ok: true, role: "ADMIN", ...createWidgetSession() });
}

export async function GET(req: Request) {
  const session = verifyWidgetSession(widgetBearerToken(req));
  if (!session) return privateJson({ ok: false, error: "Sesión vencida." }, { status: 401 });
  return privateJson({ ok: true, role: session.role, expiresAt: new Date(session.exp * 1000).toISOString() });
}

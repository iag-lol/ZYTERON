import { createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { insertRow } from "@/lib/admin/repository";
import {
  isExcludedWebVisitPath,
  normalizeWebVisitPath,
  sanitizeWebVisitReferrer,
} from "@/lib/analytics/visit-privacy";

type VisitBody = {
  path?: unknown;
  pageTitle?: unknown;
  referrer?: unknown;
  sessionId?: unknown;
};

function text(value: unknown, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function readRequestIp(request: Request) {
  const cloudflare = request.headers.get("cf-connecting-ip");
  const real = request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  const candidate = cloudflare || real || firstForwarded || "";

  if (!candidate) return "unknown";
  // quita puerto en formato ipv4:port
  const withoutPort = candidate.includes(":") && candidate.includes(".")
    ? candidate.split(":")[0]
    : candidate;
  return withoutPort.slice(0, 120);
}

let loggedSupabaseTrackingWarning = false;
let loggedMissingIpHashSecret = false;

function hashRequestIp(request: Request) {
  const ip = readRequestIp(request);
  if (!ip || ip === "unknown") return null;

  const secret = String(
    process.env.ANALYTICS_IP_HASH_SALT ||
      process.env.NEXTAUTH_SECRET ||
      process.env.AUTH_SECRET ||
      process.env.JWT_SECRET ||
      process.env.ADMIN_SESSION_SECRET ||
      process.env.SESSION_SECRET ||
      "",
  ).trim();

  if (!secret) {
    if (!loggedMissingIpHashSecret) {
      console.warn(
        "[web-visit-track] No server secret is configured; unique IP hashing is disabled.",
      );
      loggedMissingIpHashSecret = true;
    }
    return null;
  }

  return createHmac("sha256", secret).update(`web-visit-ip:${ip}`).digest("hex");
}

function isSupabaseConfigError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("supabase_url o keys válidas de supabase no configuradas") ||
    normalized.includes("supabase_service_role_key inválida")
  );
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as VisitBody;
    const path = normalizeWebVisitPath(payload.path);
    if (!path || isExcludedWebVisitPath(path)) {
      return NextResponse.json({ ok: true });
    }

    const ipHash = hashRequestIp(request);

    await insertRow(
      "WebVisit",
      {
        id: randomUUID(),
        path,
        pageTitle: text(payload.pageTitle, 220) || null,
        referrer: sanitizeWebVisitReferrer(payload.referrer) || null,
        userAgent: text(request.headers.get("user-agent"), 500) || null,
        ipHash,
        sessionId: text(payload.sessionId, 120) || null,
        createdAt: new Date().toISOString(),
      },
      "id",
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    // No romper navegación pública si falla tracking.
    const message = error instanceof Error ? error.message : String(error || "unknown error");
    const usingLocalSupabase = String(process.env.SUPABASE_URL || "").trim().toLowerCase().startsWith("http://localhost:54321");
    const isConnectionError = message.toLowerCase().includes("fetch failed");
    const localOrInvalidConfig = (usingLocalSupabase && isConnectionError) || isSupabaseConfigError(message);

    if (localOrInvalidConfig) {
      if (!loggedSupabaseTrackingWarning) {
        console.warn(
          "[web-visit-track] Supabase no disponible o mal configurado. Tracking de visitas desactivado temporalmente.",
        );
        loggedSupabaseTrackingWarning = true;
      }
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    console.error("[web-visit-track] failed:", error);
    return NextResponse.json({ ok: true }, { status: 202 });
  }
}

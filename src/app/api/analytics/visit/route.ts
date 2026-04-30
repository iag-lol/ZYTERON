import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { insertRow } from "@/lib/admin/repository";

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

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as VisitBody;
    const path = text(payload.path, 300);
    if (!path || path.startsWith("/admin")) {
      return NextResponse.json({ ok: true });
    }

    const ip = readRequestIp(request);
    const ipHash = createHash("sha256").update(ip).digest("hex");

    await insertRow(
      "WebVisit",
      {
        id: randomUUID(),
        path,
        pageTitle: text(payload.pageTitle, 220) || null,
        referrer: text(payload.referrer, 500) || null,
        userAgent: text(request.headers.get("user-agent"), 500) || null,
        ip,
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

    if (usingLocalSupabase && isConnectionError) {
      if (!loggedSupabaseTrackingWarning) {
        console.warn(
          "[web-visit-track] Supabase local no responde en http://localhost:54321. Tracking de visitas desactivado temporalmente.",
        );
        loggedSupabaseTrackingWarning = true;
      }
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    console.error("[web-visit-track] failed:", error);
    return NextResponse.json({ ok: true }, { status: 202 });
  }
}

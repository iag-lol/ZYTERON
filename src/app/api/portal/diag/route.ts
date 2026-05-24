import { NextResponse } from "next/server";

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function summarizeDatabaseUrl(rawUrl: string) {
  const value = safeString(rawUrl);
  if (!value) {
    return { configured: false, host: "", port: "", hasPlaceholder: false };
  }
  const hasPlaceholder = value.includes("YOUR-PASSWORD") || value.includes("[YOUR-PASSWORD]");
  try {
    const parsed = new URL(value);
    return {
      configured: true,
      host: parsed.hostname,
      port: parsed.port || "(default)",
      hasPlaceholder,
    };
  } catch {
    return { configured: true, host: "(invalid-url)", port: "", hasPlaceholder };
  }
}

export async function GET() {
  const dbSummary = summarizeDatabaseUrl(process.env.DATABASE_URL);
  const result: Record<string, unknown> = {
    ok: true,
    ts: new Date().toISOString(),
    runtime: {
      nodeEnv: safeString(process.env.NODE_ENV),
      renderService: safeString(process.env.RENDER_SERVICE_NAME),
      renderCommit: safeString(process.env.RENDER_GIT_COMMIT),
    },
    env: {
      DATABASE_URL: dbSummary,
      NEXTAUTH_SECRET: safeString(process.env.NEXTAUTH_SECRET).length > 0,
      NEXTAUTH_URL: safeString(process.env.NEXTAUTH_URL),
      GOOGLE_CLIENT_ID: safeString(process.env.GOOGLE_CLIENT_ID).length > 0,
      GOOGLE_CLIENT_SECRET: safeString(process.env.GOOGLE_CLIENT_SECRET).length > 0,
    },
    db: {
      connected: false,
      errorName: "",
      errorCode: "",
      errorMessage: "",
    },
  };

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    result.db = { connected: true, errorName: "", errorCode: "", errorMessage: "" };
  } catch (error) {
    const name = typeof error === "object" && error && "name" in error ? String((error as { name?: unknown }).name) : "";
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    const message = error instanceof Error ? error.message : "Unknown DB error";
    result.ok = false;
    result.db = {
      connected: false,
      errorName: name,
      errorCode: code,
      errorMessage: message.slice(0, 500),
    };
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json(result);
}

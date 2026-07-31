import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const AUDIENCE = "zyteron-macos-widget";
const DEFAULT_TTL_HOURS = 24 * 7;
const MAX_TTL_HOURS = 24 * 30;

type WidgetSessionPayload = {
  aud: typeof AUDIENCE;
  role: "ADMIN";
  iat: number;
  exp: number;
};

function readEnv(name: string) {
  return String(process.env[name] ?? "").trim();
}

function sessionSecret() {
  return readEnv("WIDGET_SESSION_SECRET") || readEnv("NEXTAUTH_SECRET");
}

function tokenTtlSeconds() {
  const configured = Number(readEnv("WIDGET_SESSION_TTL_HOURS"));
  const hours = Number.isFinite(configured) && configured > 0
    ? Math.min(Math.max(Math.round(configured), 1), MAX_TTL_HOURS)
    : DEFAULT_TTL_HOURS;
  return hours * 60 * 60;
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isWidgetAuthConfigured() {
  return Boolean(readEnv("ADMIN_PASSWORD") && sessionSecret());
}

export function verifyWidgetAdminPassword(password: string) {
  const configured = readEnv("ADMIN_PASSWORD");
  if (!configured || !password) return false;
  const suppliedHash = createHash("sha256").update(password).digest("base64url");
  const configuredHash = createHash("sha256").update(configured).digest("base64url");
  return safeEqual(suppliedHash, configuredHash);
}

export function createWidgetSession() {
  const secret = sessionSecret();
  if (!secret) throw new Error("WIDGET_SESSION_SECRET o NEXTAUTH_SECRET no está configurado.");

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: WidgetSessionPayload = {
    aud: AUDIENCE,
    role: "ADMIN",
    iat: issuedAt,
    exp: issuedAt + tokenTtlSeconds(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return {
    token: `${encodedPayload}.${sign(encodedPayload, secret)}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export function verifyWidgetSession(token?: string | null): WidgetSessionPayload | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;
  if (!safeEqual(signature, sign(encodedPayload, secret))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as WidgetSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== AUDIENCE || payload.role !== "ADMIN" || payload.iat > now + 60 || payload.exp <= now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function widgetBearerToken(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

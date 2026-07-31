import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export type AdminPushPayload = {
  title: string;
  body: string;
  href: string;
  tag: string;
  badgeCount?: number;
  kind?: "contact" | "quote" | "whatsapp" | "web" | "partner" | "executive" | "system";
  createdAt?: string;
  eventId?: string;
};

export type StoredAdminPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel: string | null;
  userAgent: string | null;
  active: boolean;
  updatedAt: string;
};

const VAPID_SETTING_KEY = "admin_push_vapid_config";
const SUBSCRIPTION_PREFIX = "admin_push_subscription_";

function env(name: string) {
  return String(process.env[name] ?? "").trim().replace(/^['"]|['"]$/g, "").trim();
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

type SealedValue = { v: 1; iv: string; tag: string; data: string };

function storageKey() {
  const secret = env("NEXTAUTH_SECRET") || env("WIDGET_SESSION_SECRET") || env("ADMIN_PASSWORD");
  return secret ? createHash("sha256").update(secret).digest() : null;
}

function sealJson(value: unknown) {
  const key = storageKey();
  if (!key) throw new Error("Falta NEXTAUTH_SECRET para proteger la configuración Push.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: encrypted.toString("base64url"),
  } satisfies SealedValue);
}

function unsealJson<T>(value: string | null | undefined): T | null {
  const parsed = parseJson<unknown>(value);
  const sealed = parsed as Partial<SealedValue> | null;
  if (!sealed || sealed.v !== 1 || !sealed.iv || !sealed.tag || !sealed.data) {
    // Compatibilidad con configuraciones anteriores sin cifrar.
    return parsed as T | null;
  }
  const key = storageKey();
  if (!key) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64url"));
    decipher.setAuthTag(Buffer.from(sealed.tag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(sealed.data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}

function validVapidConfig(value: unknown): value is { publicKey: string; privateKey: string; subject: string } {
  const config = value as { publicKey?: unknown; privateKey?: unknown; subject?: unknown } | null;
  return Boolean(
    config &&
    typeof config.publicKey === "string" && config.publicKey.length > 20 &&
    typeof config.privateKey === "string" && config.privateKey.length > 20 &&
    typeof config.subject === "string" && config.subject.length > 5
  );
}

/**
 * Usa las claves del entorno cuando existen. Si no, crea un par una sola vez y
 * lo guarda como configuración privada del backend. Así un despliegue
 * nuevo queda operativo sin depender de una migración o configuración manual.
 */
export async function getOrCreateAdminPushConfig() {
  const fallbackSubject = env("VAPID_SUBJECT") || "mailto:contacto@zyteron.cl";
  const fromEnvironment = {
    publicKey: env("VAPID_PUBLIC_KEY") || env("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    privateKey: env("VAPID_PRIVATE_KEY"),
    subject: fallbackSubject,
  };
  if (fromEnvironment.publicKey.length > 20 && fromEnvironment.privateKey.length > 20) {
    return { ...fromEnvironment, configured: true as const };
  }

  try {
    const existing = await prisma.setting.findUnique({ where: { key: VAPID_SETTING_KEY }, select: { value: true } });
    const stored = unsealJson<unknown>(existing?.value);
    if (validVapidConfig(stored)) return { ...stored, configured: true as const };

    const generated = webpush.generateVAPIDKeys();
    const next = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      subject: fallbackSubject,
    };
    await prisma.setting.upsert({
      where: { key: VAPID_SETTING_KEY },
      create: { key: VAPID_SETTING_KEY, value: sealJson(next), type: "JSON" },
      update: { value: sealJson(next), type: "JSON" },
    });
    // Releer evita devolver un par distinto si dos instancias lo crean a la vez.
    const definitive = await prisma.setting.findUnique({ where: { key: VAPID_SETTING_KEY }, select: { value: true } });
    const persisted = unsealJson<unknown>(definitive?.value);
    if (validVapidConfig(persisted)) return { ...persisted, configured: true as const };
  } catch (error) {
    console.error("[admin-push] no se pudo preparar VAPID:", error);
  }

  return { publicKey: "", privateKey: "", subject: fallbackSubject, configured: false as const };
}

function subscriptionSettingKey(endpoint: string) {
  const digest = createHash("sha256").update(endpoint).digest("hex");
  return `${SUBSCRIPTION_PREFIX}${digest}`;
}

function validSubscription(value: unknown): value is StoredAdminPushSubscription {
  const subscription = value as Partial<StoredAdminPushSubscription> | null;
  return Boolean(
    subscription &&
    typeof subscription.endpoint === "string" &&
    typeof subscription.p256dh === "string" &&
    typeof subscription.auth === "string" &&
    typeof subscription.active === "boolean"
  );
}

export async function listAdminPushSubscriptions() {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: SUBSCRIPTION_PREFIX } },
    select: { key: true, value: true },
  });
  return rows.flatMap((row) => {
    const subscription = unsealJson<unknown>(row.value);
    return validSubscription(subscription) ? [{ key: row.key, ...subscription }] : [];
  });
}

export async function saveAdminPushSubscription(subscription: Omit<StoredAdminPushSubscription, "active" | "updatedAt">) {
  const value: StoredAdminPushSubscription = {
    ...subscription,
    active: true,
    updatedAt: new Date().toISOString(),
  };
  const key = subscriptionSettingKey(subscription.endpoint);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: sealJson(value), type: "JSON" },
    update: { value: sealJson(value), type: "JSON" },
  });
}

export async function removeAdminPushSubscription(endpoint: string) {
  await prisma.setting.deleteMany({ where: { key: subscriptionSettingKey(endpoint) } });
}

async function configureWebPush() {
  const config = await getOrCreateAdminPushConfig();
  if (!config.configured) return null;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return config;
}

/** Envía el aviso sin interrumpir el flujo que originó el evento. */
export async function sendAdminPushNotification(payload: AdminPushPayload) {
  if (!(await configureWebPush())) {
    return { sent: 0, failed: 0, skipped: "missing_vapid" as const };
  }

  let subscriptions;
  try {
    subscriptions = (await listAdminPushSubscriptions()).filter((subscription) => subscription.active);
  } catch (error) {
    console.error("[admin-push] no se pudieron leer las suscripciones:", error);
    return { sent: 0, failed: 1, skipped: "storage_unavailable" as const };
  }

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12, urgency: "high", topic: payload.tag.slice(0, 32) },
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeAdminPushSubscription(subscription.endpoint).catch(() => {});
        } else {
          console.error("[admin-push] envío fallido:", statusCode || error);
        }
      }
    }),
  );
  return { sent, failed, skipped: null };
}

export function leadPushPayload(input: {
  leadId: string;
  source: "CONTACTO_WEB" | "COTIZADOR_WEB" | "CHAT_IA";
  name: string;
  email?: string | null;
  phone?: string | null;
  service?: string | null;
}): AdminPushPayload {
  const isQuote = input.source === "COTIZADOR_WEB";
  const fromChat = input.source === "CHAT_IA";
  const details = [input.service, input.email, input.phone].map((value) => String(value ?? "").trim()).filter(Boolean);
  return {
    title: isQuote ? `Nueva cotización: ${input.name}` : fromChat ? `Nuevo mensaje web: ${input.name}` : `Nuevo contacto: ${input.name}`,
    body: details.join(" · ").slice(0, 180) || "Hay una nueva oportunidad en Zyteron.",
    href: isQuote ? "/admin/cotizaciones" : "/admin/contactos",
    tag: `${isQuote ? "quote" : fromChat ? "web" : "lead"}-${input.leadId}`,
    kind: isQuote ? "quote" : fromChat ? "web" : "contact",
    createdAt: new Date().toISOString(),
    eventId: `${isQuote ? "quote" : "lead"}:${input.leadId}`,
  };
}

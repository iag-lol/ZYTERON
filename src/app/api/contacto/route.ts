import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { insertRow } from "@/lib/admin/repository";
import { serializeContactLeadDetails } from "@/lib/admin/contact-lead";

type RateLimitEntry = {
  hits: number;
  firstHitAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_HITS = 6;

declare global {
  var zyteronContactRateLimit: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = globalThis.zyteronContactRateLimit ?? new Map<string, RateLimitEntry>();
globalThis.zyteronContactRateLimit = rateLimitStore;

const contactSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120, "Nombre demasiado largo"),
  email: z.string().trim().email("Email inválido").max(160, "Email demasiado largo"),
  phone: z.string().trim().max(32, "Teléfono demasiado largo").optional().or(z.literal("")),
  company: z.string().trim().max(140, "Empresa demasiado larga").optional().or(z.literal("")),
  service: z.string().trim().max(140, "Servicio demasiado largo").optional().or(z.literal("")),
  message: z.string().trim().max(3000, "Mensaje demasiado largo").optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
});

function extractRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    return firstIp.trim();
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const previous = rateLimitStore.get(ip);

  if (!previous) {
    rateLimitStore.set(ip, { hits: 1, firstHitAt: now });
    return { allowed: true };
  }

  if (now - previous.firstHitAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { hits: 1, firstHitAt: now });
    return { allowed: true };
  }

  if (previous.hits >= RATE_LIMIT_MAX_HITS) {
    return { allowed: false, retryAfterSec: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - previous.firstHitAt)) / 1000) };
  }

  previous.hits += 1;
  rateLimitStore.set(ip, previous);
  return { allowed: true };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message || "Datos inválidos" }, { status: 400 });
    }

    const data = parsed.data;

    // Honeypot anti-bot: respond success but discard.
    if (data.website && data.website.trim().length > 0) {
      return NextResponse.json({ ok: true, reference: "filtered" });
    }

    const ip = extractRequestIp(req);
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Has enviado demasiadas solicitudes. Intenta nuevamente en unos segundos.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec ?? 60),
          },
        }
      );
    }

    const referer = req.headers.get("referer") || undefined;
    const leadMessage = serializeContactLeadDetails({
      company: data.company,
      service: data.service,
      brief: data.message,
      submittedFrom: referer,
    });

    const leadId = randomUUID();
    await insertRow(
      "Lead",
      {
        id: leadId,
        name: data.name,
        email: data.email,
        phone: normalizeOptional(data.phone),
        source: "CONTACTO_WEB",
        message: leadMessage,
        type: "CONTACT",
        createdAt: new Date().toISOString(),
      },
      "id"
    );

    return NextResponse.json({ ok: true, reference: leadId.slice(0, 8).toUpperCase() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar la solicitud.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

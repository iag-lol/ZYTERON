import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { insertRow, updateRowsWithFallback } from "@/lib/admin/repository";
import { prisma } from "@/lib/prisma";
import {
  appendQuoteRequestError,
  buildQuoteRequestMeta,
  budgetRangeToEstimate,
  generateQuoteCode,
  quoteRequestSchema,
  sendQuoteRequestEmail,
  sendQuoteRequestWhatsapp,
  serializeQuoteRequestMeta,
  type QuoteRequestMeta,
} from "@/lib/quote-requests";

type RateLimitEntry = {
  hits: number;
  firstHitAt: number;
};

type IdempotencyEntry = {
  createdAt: number;
  response: {
    ok: true;
    reference: string;
    quoteId: string;
    whatsappUrl: string;
  };
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_HITS = 6;
const IDEMPOTENCY_TTL_MS = 10 * 60_000;

declare global {
  var zyteronQuoteRequestRateLimit: Map<string, RateLimitEntry> | undefined;
  var zyteronQuoteRequestIdempotency: Map<string, IdempotencyEntry> | undefined;
}

const rateLimitStore = globalThis.zyteronQuoteRequestRateLimit ?? new Map<string, RateLimitEntry>();
const idempotencyStore = globalThis.zyteronQuoteRequestIdempotency ?? new Map<string, IdempotencyEntry>();
globalThis.zyteronQuoteRequestRateLimit = rateLimitStore;
globalThis.zyteronQuoteRequestIdempotency = idempotencyStore;

function normalizeSupabaseUrl(rawUrl: string) {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  const suffixes = ["/rest/v1", "/auth/v1", "/storage/v1"];
  const lowered = trimmed.toLowerCase();

  for (const suffix of suffixes) {
    if (lowered.endsWith(suffix)) return trimmed.slice(0, -suffix.length);
  }

  return trimmed;
}

function createSupabaseAnonServerClient() {
  const rawUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!rawUrl || !anonKey) {
    throw new Error("Faltan variables de Supabase para fallback de cotizaciones.");
  }

  return createClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    global: { headers: { "X-Client-Info": "zyteron-quote-request-fallback" } },
  });
}

function isRlsInsertError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("row-level security") ||
    normalized.includes("42501") ||
    normalized.includes("supabase_url o keys válidas") ||
    normalized.includes("supabase_url o keys validas") ||
    normalized.includes("no configuradas en el servidor")
  );
}

function extractRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    return firstIp.trim();
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const previous = rateLimitStore.get(ip);

  if (!previous || now - previous.firstHitAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { hits: 1, firstHitAt: now });
    return { allowed: true as const };
  }

  if (previous.hits >= RATE_LIMIT_MAX_HITS) {
    return {
      allowed: false as const,
      retryAfterSec: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - previous.firstHitAt)) / 1000),
    };
  }

  previous.hits += 1;
  rateLimitStore.set(ip, previous);
  return { allowed: true as const };
}

function cleanExpiredIdempotencyEntries() {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}

async function insertQuoteWithFallback(payload: {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  subtotal: number;
  discount: number;
  total: number;
  status: "PENDING" | "SENT" | "WON" | "LOST";
  createdAt: string;
}) {
  try {
    await insertRow("Quote", payload, "id");
    return payload.id;
  } catch (error) {
    if (isRlsInsertError(error)) {
      try {
        const supabase = createSupabaseAnonServerClient();
        const { data, error: insertError } = await supabase
          .from("Quote")
          .insert(payload)
          .select("id")
          .single();

        if (!insertError) {
          return String(data?.id || payload.id);
        }
      } catch (fallbackError) {
        console.error("[quote-request] supabase anon quote fallback failed:", fallbackError);
      }
    }

    const record = await prisma.quote.create({
      data: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        company: payload.company,
        message: payload.message,
        subtotal: payload.subtotal,
        discount: payload.discount,
        total: payload.total,
        status: payload.status,
        createdAt: new Date(payload.createdAt),
      },
      select: { id: true },
    });

    return record.id;
  }
}

async function insertLeadWithFallback(payload: {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  message: string;
  type: "QUOTE";
  createdAt: string;
}) {
  try {
    await insertRow("Lead", payload, "id");
    return payload.id;
  } catch (error) {
    if (isRlsInsertError(error)) {
      try {
        const supabase = createSupabaseAnonServerClient();
        const { data, error: insertError } = await supabase
          .from("Lead")
          .insert(payload)
          .select("id")
          .single();

        if (!insertError) {
          return String(data?.id || payload.id);
        }
      } catch (fallbackError) {
        console.error("[quote-request] supabase anon lead fallback failed:", fallbackError);
      }
    }

    const record = await prisma.lead.create({
      data: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        source: payload.source,
        message: payload.message,
        type: payload.type,
        createdAt: new Date(payload.createdAt),
      },
      select: { id: true },
    });

    return record.id;
  }
}

async function persistMeta(quoteId: string, meta: QuoteRequestMeta) {
  try {
    await updateRowsWithFallback("Quote", { message: serializeQuoteRequestMeta(meta) }, { id: quoteId });
    return;
  } catch (error) {
    console.error("[quote-request] supabase meta update failed, using prisma:", error);
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { message: serializeQuoteRequestMeta(meta) },
  });
}

export async function POST(req: Request) {
  cleanExpiredIdempotencyEntries();

  try {
    const body = await req.json();
    const parsed = quoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message || "Datos invalidos." }, { status: 400 });
    }

    const data = parsed.data;

    if (data.honeypot && data.honeypot.trim().length > 0) {
      return NextResponse.json({
        ok: true,
        reference: "filtered",
        quoteId: "filtered",
        whatsappUrl: "https://wa.me/56939526626",
      });
    }

    const idempotencyKey = data.clientSubmissionId.trim();
    const existing = idempotencyStore.get(idempotencyKey);
    if (existing) {
      return NextResponse.json(existing.response);
    }

    const ip = extractRequestIp(req);
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Has enviado demasiadas solicitudes. Intenta nuevamente en unos segundos.",
          retryAfterSec: rateLimit.retryAfterSec,
          whatsappUrl: "https://wa.me/56939526626",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSec ?? 60) },
        },
      );
    }

    const quoteId = randomUUID();
    const quoteCode = await generateQuoteCode();
    const submittedAt = new Date().toISOString();
    const submittedFrom = req.headers.get("referer") || undefined;
    let meta = buildQuoteRequestMeta({
      ...data,
      quoteCode,
      submittedAt,
      submittedFrom,
    });

    const estimatedValue = budgetRangeToEstimate(data.budgetRange);

    await insertQuoteWithFallback({
      id: quoteId,
      name: data.contactName.trim(),
      email: data.contactEmail.trim(),
      phone: meta.contactWhatsappE164 || data.contactWhatsapp.trim(),
      company: (data.contactCompany || data.businessName).trim(),
      message: serializeQuoteRequestMeta(meta),
      subtotal: estimatedValue,
      discount: 0,
      total: estimatedValue,
      status: "PENDING",
      createdAt: submittedAt,
    });

    try {
      const leadMessage = [
        `${meta.projectTypeLabel || "Solicitud"} · ${meta.businessName || ""}`,
        `Presupuesto: ${meta.budgetRangeLabel || "No definido"}`,
        `Urgencia: ${meta.urgencyLabel || "No definida"}`,
        meta.shortSummary || "",
      ]
        .filter(Boolean)
        .join("\n");

      await insertLeadWithFallback({
        id: randomUUID(),
        name: data.contactName.trim(),
        email: data.contactEmail.trim(),
        phone: meta.contactWhatsappE164 || data.contactWhatsapp.trim(),
        source: "QUOTE_REQUEST",
        message: leadMessage,
        type: "QUOTE",
        createdAt: submittedAt,
      });
    } catch (leadError) {
      console.error("[quote-request] lead insert failed:", leadError);
    }

    const successResponse = {
      ok: true as const,
      reference: quoteCode,
      quoteId,
      whatsappUrl: "https://wa.me/56939526626",
    };
    idempotencyStore.set(idempotencyKey, {
      createdAt: Date.now(),
      response: successResponse,
    });

    try {
      const emailResult = await sendQuoteRequestEmail(meta, quoteId);
      if (emailResult.sent) {
        meta = {
          ...meta,
          emailStatus: "sent",
          resendMessageId: emailResult.messageId,
        };
      } else {
        meta = appendQuoteRequestError(
          {
            ...meta,
            emailStatus: "failed",
          },
          "email",
          emailResult.error,
        );
      }
      await persistMeta(quoteId, meta);
    } catch (emailError) {
      meta = appendQuoteRequestError(
        {
          ...meta,
          emailStatus: "failed",
        },
        "email",
        emailError instanceof Error ? emailError.message : "No se pudo enviar el correo interno.",
      );
      try {
        await persistMeta(quoteId, meta);
      } catch (persistError) {
        console.error("[quote-request] persist email failure failed:", persistError);
      }
    }

    try {
      const whatsappResult = await sendQuoteRequestWhatsapp(meta, quoteId);
      if (whatsappResult.sent) {
        meta = {
          ...meta,
          whatsappStatus: "sent",
          twilioMessageId: whatsappResult.messageId,
        };
      } else {
        meta = appendQuoteRequestError(
          {
            ...meta,
            whatsappStatus: "failed",
          },
          "whatsapp",
          whatsappResult.error,
        );
      }
      await persistMeta(quoteId, meta);
    } catch (whatsappError) {
      meta = appendQuoteRequestError(
        {
          ...meta,
          whatsappStatus: "failed",
        },
        "whatsapp",
        whatsappError instanceof Error ? whatsappError.message : "No se pudo enviar el aviso por WhatsApp.",
      );
      try {
        await persistMeta(quoteId, meta);
      } catch (persistError) {
        console.error("[quote-request] persist whatsapp failure failed:", persistError);
      }
    }

    return NextResponse.json(successResponse);
  } catch (error) {
    console.error("[quote-request] save failed:", error);
    return NextResponse.json(
      {
        error: "No pudimos registrar tu solicitud. Intenta nuevamente o escribenos por WhatsApp.",
        whatsappUrl: "https://wa.me/56939526626",
      },
      { status: 500 },
    );
  }
}

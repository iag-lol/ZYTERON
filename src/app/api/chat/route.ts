import { NextResponse } from "next/server";
import { z } from "zod";
import { buildZyteronSystemPrompt } from "@/lib/ai/zyteron-knowledge";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -- Configuración ----------------------------------------------------------

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_MESSAGES = 24; // últimos turnos que enviamos al modelo
const MAX_CONTENT = 4000; // caracteres por mensaje

// -- Rate limit en memoria (mismo patrón que /api/contacto) -----------------

type RateLimitEntry = { hits: number; firstHitAt: number };
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_HITS = 20;

declare global {
  var zyteronChatRateLimit: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = globalThis.zyteronChatRateLimit ?? new Map<string, RateLimitEntry>();
globalThis.zyteronChatRateLimit = rateLimitStore;

function extractRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const previous = rateLimitStore.get(ip);
  if (!previous || now - previous.firstHitAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { hits: 1, firstHitAt: now });
    return true;
  }
  if (previous.hits >= RATE_LIMIT_MAX_HITS) return false;
  previous.hits += 1;
  return true;
}

// -- Validación -------------------------------------------------------------

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_CONTENT),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES * 2),
});

function readEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

// -- Utilidades de streaming ------------------------------------------------

/** Devuelve un stream de texto plano a partir de un string fijo. */
function textStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function streamingResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

const FALLBACK_NO_KEY =
  `Gracias por escribir a ${siteConfig.name}. En este momento el asistente automático no está disponible, ` +
  `pero nuestro equipo te puede ayudar de inmediato. Escríbenos por WhatsApp al ${siteConfig.contact.phoneDisplay} ` +
  `o al correo ${siteConfig.contact.email} y con gusto te cotizamos tu proyecto.`;

const FALLBACK_ERROR =
  `Disculpa, tuve un problema para responder en este momento. Puedes intentarlo nuevamente en unos segundos ` +
  `o escribirnos por WhatsApp al ${siteConfig.contact.phoneDisplay}. Nuestro equipo te responde a la brevedad.`;

// -- Handler ----------------------------------------------------------------

export async function POST(req: Request) {
  // 1) Rate limit
  const ip = extractRequestIp(req);
  if (!checkRateLimit(ip)) {
    return streamingResponse(
      textStream(
        "Estás enviando mensajes muy rápido. Espera unos segundos e inténtalo nuevamente, por favor.",
      ),
    );
  }

  // 2) Parseo y validación (nunca lanzamos: devolvemos texto amable)
  let messages: z.infer<typeof messageSchema>[];
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return streamingResponse(
        textStream("No pude leer tu mensaje. ¿Puedes escribirlo nuevamente, por favor?"),
      );
    }
    messages = parsed.data.messages.slice(-MAX_MESSAGES);
  } catch {
    return streamingResponse(
      textStream("No pude leer tu mensaje. ¿Puedes escribirlo nuevamente, por favor?"),
    );
  }

  // 3) Sin API key configurada: fallback amable (no es un error para el usuario)
  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey) {
    return streamingResponse(textStream(FALLBACK_NO_KEY));
  }

  const model = readEnv("OPENAI_MODEL") || DEFAULT_MODEL;
  const systemPrompt = buildZyteronSystemPrompt();

  // 4) Llamada a OpenAI con streaming
  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.6,
        max_tokens: 600,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
  } catch {
    return streamingResponse(textStream(FALLBACK_ERROR));
  }

  if (!upstream.ok || !upstream.body) {
    // No exponemos detalles del proveedor; respondemos amablemente.
    return streamingResponse(textStream(FALLBACK_ERROR));
  }

  // 5) Transformamos el SSE de OpenAI en texto plano incremental
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // fragmento incompleto: se completará en la próxima iteración
            }
          }
        }
      } catch {
        controller.enqueue(encoder.encode("\n" + FALLBACK_ERROR));
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return streamingResponse(stream);
}

export function GET() {
  return NextResponse.json({ ok: true, assistant: "zyteron-ai" });
}

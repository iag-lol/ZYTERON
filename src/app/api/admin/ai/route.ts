import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import {
  buildAdminSystemPrompt,
  CREATE_QUOTE_TOOL,
  executeCreateQuoteDraft,
} from "@/lib/ai/admin-assistant";
import { createOpenAIToolStream, type OpenAIMessage } from "@/lib/ai/openai-runtime";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "gpt-4o";
const MAX_MESSAGES = 30;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(8000),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES * 2),
});

function readEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

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

export async function POST(req: Request) {
  // Solo administradores.
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  let messages: z.infer<typeof bodySchema>["messages"];
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return streamingResponse(textStream("No pude leer el mensaje. Intenta nuevamente."));
    }
    messages = parsed.data.messages.slice(-MAX_MESSAGES);
  } catch {
    return streamingResponse(textStream("No pude leer el mensaje. Intenta nuevamente."));
  }

  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey) {
    return streamingResponse(
      textStream(
        "El asistente interno no está disponible: falta configurar OPENAI_API_KEY en el servidor (Render).",
      ),
    );
  }

  const model = readEnv("OPENAI_ADMIN_MODEL") || readEnv("OPENAI_MODEL") || DEFAULT_MODEL;

  const convo: OpenAIMessage[] = [
    { role: "system", content: buildAdminSystemPrompt() },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const fallback =
    `Tuve un problema para responder en este momento. Intenta nuevamente en unos segundos. ` +
    `Si persiste, revisa la configuración de OpenAI. Contacto interno: ${siteConfig.contact.email}.`;

  const stream = createOpenAIToolStream({
    apiKey,
    model,
    messages: convo,
    tools: [CREATE_QUOTE_TOOL],
    temperature: 0.4,
    maxTokens: 1400,
    fallbackText: fallback,
    executeTool: async (name, argsJson) => {
      if (name === "crear_borrador_cotizacion") {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(argsJson || "{}");
        } catch {
          parsed = {};
        }
        const result = await executeCreateQuoteDraft(parsed);
        return result.message;
      }
      return "Acción no reconocida.";
    },
  });

  return streamingResponse(stream);
}

export function GET() {
  return NextResponse.json({ ok: true, assistant: "zyteron-admin-ai" });
}

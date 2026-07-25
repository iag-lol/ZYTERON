import { NextResponse } from "next/server";
import { z } from "zod";
import { runOpenAIToolCompletion } from "@/lib/ai/openai-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

function readEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

const FALLBACK =
  "Hola, vengo del sitio web de Zyteron. Me gustaría cotizar un proyecto para mi empresa. ¿Me pueden ayudar?";

/**
 * Redacta, a partir de la conversación del chat, un ÚNICO mensaje en primera
 * persona (como si el cliente lo escribiera) para iniciar la conversación por
 * WhatsApp. Al ser el cliente quien inicia, la conversación en Meta es la más
 * económica.
 */
export async function POST(req: Request) {
  let messages: z.infer<typeof bodySchema>["messages"];
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ text: FALLBACK });
    messages = parsed.data.messages;
  } catch {
    return NextResponse.json({ text: FALLBACK });
  }

  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey) return NextResponse.json({ text: FALLBACK });

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Cliente" : "Asistente"}: ${m.content}`)
    .join("\n")
    .slice(0, 6000);

  const model = readEnv("OPENAI_MODEL") || "gpt-4o-mini";

  const text = await runOpenAIToolCompletion({
    apiKey,
    model,
    temperature: 0.4,
    maxTokens: 220,
    messages: [
      {
        role: "system",
        content:
          "A partir de la conversación entregada, redacta UN SOLO mensaje breve en primera persona, " +
          "como si el CLIENTE lo escribiera para iniciar una conversación por WhatsApp con Zyteron. " +
          "Incluye su nombre si lo dio, qué necesita y los datos clave que se mencionaron (tipo de proyecto, " +
          "presupuesto si lo hay). Empieza exactamente con 'Hola, vengo del sitio web de Zyteron.'. " +
          "Máximo 480 caracteres. Español de Chile, natural y cordial. No uses comillas ni emojis. " +
          "Devuelve solo el mensaje, sin explicaciones.",
      },
      { role: "user", content: transcript },
    ],
  });

  const clean = text.trim().replace(/^["']|["']$/g, "");
  return NextResponse.json({ text: clean || FALLBACK });
}

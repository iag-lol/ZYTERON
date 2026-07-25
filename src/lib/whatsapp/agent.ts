import { buildZyteronSystemPrompt } from "@/lib/ai/zyteron-knowledge";
import { LEAD_CAPTURE_TOOL, executeLeadCapture } from "@/lib/ai/lead-capture";
import { runOpenAIToolCompletion, type OpenAIMessage } from "@/lib/ai/openai-runtime";
import { listRecentMessages, type WaConversation } from "@/lib/whatsapp/store";

function readEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

const WHATSAPP_ADDENDUM = `

## CANAL: WHATSAPP
Conversas por WhatsApp con un cliente real, como un vendedor humano del equipo de Zyteron. Reglas:
- Mensajes CORTOS y naturales (1 a 4 frases). Nada de textos largos ni listas con viñetas.
- No digas que eres un bot ni una IA. Conversa con cercanía y profesionalismo.
- Una pregunta a la vez para avanzar la venta.
- Cuando tengas nombre + contacto + necesidad, registra al cliente con la herramienta.`;

/**
 * Genera la respuesta de la IA para una conversación a partir del historial
 * de mensajes almacenado. Devuelve "" si no hay API key.
 */
export async function generateAiReply(conversation: WaConversation): Promise<string> {
  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey) return "";

  const history = await listRecentMessages(conversation.id, 24);
  const model = readEnv("OPENAI_MODEL") || "gpt-4o-mini";

  const systemPrompt =
    buildZyteronSystemPrompt() +
    WHATSAPP_ADDENDUM +
    (conversation.profile_name
      ? `\n\nEl cliente se identifica en WhatsApp como "${conversation.profile_name}".`
      : "");

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history
      .filter((m) => m.content && m.message_type === "text")
      .map((m) => ({
        role: (m.direction === "in" ? "user" : "assistant") as "user" | "assistant",
        content: m.content as string,
      })),
  ];

  const reply = await runOpenAIToolCompletion({
    apiKey,
    model,
    messages,
    tools: [LEAD_CAPTURE_TOOL],
    temperature: 0.6,
    maxTokens: 500,
    executeTool: async (name, argsJson) => {
      if (name === "registrar_interes_cliente") {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(argsJson || "{}");
        } catch {
          parsed = {};
        }
        if (!parsed.contacto || String(parsed.contacto).trim() === "") {
          parsed.contacto = `WhatsApp: +${conversation.phone}`;
        }
        const result = await executeLeadCapture(parsed);
        return result.message;
      }
      return "Solicitud recibida.";
    },
  });

  return reply.trim();
}

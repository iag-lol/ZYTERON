import { buildZyteronSystemPrompt } from "@/lib/ai/zyteron-knowledge";
import { LEAD_CAPTURE_TOOL, executeLeadCapture } from "@/lib/ai/lead-capture";
import { runOpenAIToolCompletion, type OpenAIMessage } from "@/lib/ai/openai-runtime";

/**
 * Agente de WhatsApp con IA: responde a los clientes como un vendedor humano de
 * Zyteron, califica, cotiza y registra el lead (que te llega por correo/panel).
 *
 * La memoria de conversación vive en el proceso (Render corre un server Node
 * persistente). Se limpia sola tras inactividad y al redeploy. Suficiente y
 * económico para un MVP; se puede migrar a base de datos si se necesita.
 */

type Turn = { role: "user" | "assistant"; content: string };
type Conversation = { turns: Turn[]; updatedAt: number };

const CONVERSATION_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
const MAX_TURNS = 20;

declare global {
  var zyteronWhatsappConversations: Map<string, Conversation> | undefined;
}

const store = globalThis.zyteronWhatsappConversations ?? new Map<string, Conversation>();
globalThis.zyteronWhatsappConversations = store;

function pruneOld() {
  const now = Date.now();
  for (const [key, convo] of store) {
    if (now - convo.updatedAt > CONVERSATION_TTL_MS) store.delete(key);
  }
}

function readEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

const WHATSAPP_ADDENDUM = `

## CANAL: WHATSAPP
Estás conversando por WhatsApp con un cliente real, como un vendedor humano del equipo de Zyteron. Reglas del canal:
- Mensajes CORTOS y naturales, estilo WhatsApp (1 a 4 frases). Nada de textos largos.
- No digas que eres un bot ni una IA; conversa con cercanía y profesionalismo, como una persona del equipo.
- Haz una pregunta a la vez para avanzar la venta.
- Cuando tengas nombre + contacto + necesidad, registra al cliente con la herramienta.
- No uses formato markdown ni listas con viñetas raras; escribe como en un chat.`;

/**
 * Procesa un mensaje entrante de WhatsApp y devuelve la respuesta del agente.
 * Devuelve "" si no hay API key (el webhook decide qué hacer).
 */
export async function respondToWhatsappMessage(input: {
  waId: string;
  profileName?: string;
  text: string;
}): Promise<string> {
  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey) return "";

  pruneOld();

  const convo = store.get(input.waId) ?? { turns: [], updatedAt: Date.now() };
  convo.turns.push({ role: "user", content: input.text.slice(0, 2000) });
  convo.turns = convo.turns.slice(-MAX_TURNS);

  const model = readEnv("OPENAI_MODEL") || "gpt-4o-mini";
  const systemPrompt =
    buildZyteronSystemPrompt() +
    WHATSAPP_ADDENDUM +
    (input.profileName ? `\n\nEl cliente se identifica en WhatsApp como "${input.profileName}".` : "");

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...convo.turns.map((t) => ({ role: t.role, content: t.content })),
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
        // Aseguramos que el contacto incluya el número de WhatsApp del cliente.
        if (!parsed.contacto || String(parsed.contacto).trim() === "") {
          parsed.contacto = `WhatsApp: +${input.waId}`;
        }
        const result = await executeLeadCapture(parsed);
        return result.message;
      }
      return "Solicitud recibida.";
    },
  });

  const finalReply =
    reply.trim() ||
    "Gracias por tu mensaje. Un ejecutivo de Zyteron te responde a la brevedad.";

  convo.turns.push({ role: "assistant", content: finalReply });
  convo.updatedAt = Date.now();
  store.set(input.waId, convo);

  return finalReply;
}

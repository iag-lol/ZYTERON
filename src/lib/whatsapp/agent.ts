import { buildZyteronSystemPrompt } from "@/lib/ai/zyteron-knowledge";
import { runOpenAIToolCompletion, type OpenAIMessage, type OpenAITool } from "@/lib/ai/openai-runtime";
import { listRecentMessages, updateConversation, getConversation, type WaConversation } from "@/lib/whatsapp/store";
import { executeCreateQuoteDraft } from "@/lib/ai/admin-assistant";
import { sendQuoteAlertEmail } from "@/lib/notifications/quote-alert";

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

## CALIFICAR Y PEDIR DATOS (MUY IMPORTANTE)
Primero RESPONDE la pregunta del cliente. Luego, de forma natural y de a UNA pregunta por vez, ve
recopilando los datos de la ficha para poder cotizar bien:
1) nombre, 2) correo, 3) empresa (si aplica), 4) rubro, 5) qué servicio/producto necesita exactamente,
6) presupuesto aproximado, 7) plazo deseado.
Usa "registrar_datos_cliente" APENAS obtengas cualquiera de estos datos (aunque sea uno solo).
No hagas un interrogatorio: intercala las preguntas con respuestas útiles y cercanas.

## CUÁNDO GENERAR LA COTIZACIÓN (MUY IMPORTANTE — NO ANTES DE TIEMPO)
NO generes la cotización solo porque el cliente pregunte un precio. Primero responde y sigue calificando.
Genera la cotización ("generar_cotizacion") SOLO cuando se cumplan TODAS estas condiciones:
- El cliente CONFIRMÓ explícitamente que quiere la cotización formal ("sí, cotízame", "quiero la
  cotización final", "hagámoslo").
- Ya tienes al menos: nombre, una forma de contacto (correo o WhatsApp) y el servicio/producto claro.
- Ya intentaste preguntar por empresa, presupuesto y plazo (si el cliente no los da, continúa igual).
- El cliente NO está pidiendo más información ni tiene dudas pendientes.
Reglas:
- Llama "generar_cotizacion" UNA SOLA VEZ por conversación, con los ítems y precios NETOS reales de
  Zyteron (los publicados son "desde", sin IVA). No inventes precios.
- Si ya la generaste (o la herramienta dice que ya existe), NO la repitas: confirma con calma que la
  cotización YA está registrada.
- Al generarla, informa al cliente que su cotización quedó disponible y que el equipo lo contactará.

## SIEMPRE RESPONDE
Después de usar cualquier herramienta, SIEMPRE responde al cliente con un mensaje en lenguaje natural,
breve y claro. Nunca dejes al cliente sin respuesta.`;

const FICHA_TOOL: OpenAITool = {
  type: "function",
  function: {
    name: "registrar_datos_cliente",
    description:
      "Actualiza la ficha del cliente en el panel con los datos que va entregando en la conversación. " +
      "Llámala apenas conozcas o actualices cualquiera de estos datos, aunque sea uno solo.",
    parameters: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        correo: { type: "string" },
        empresa: { type: "string" },
        rubro: { type: "string" },
        servicio_solicitado: { type: "string" },
        presupuesto_estimado: { type: "number", description: "Monto en CLP si el cliente lo menciona." },
        plazo: { type: "string" },
      },
    },
  },
};

const QUOTE_TOOL: OpenAITool = {
  type: "function",
  function: {
    name: "generar_cotizacion",
    description:
      "Genera una cotización formal para el cliente cuando CONFIRMA que quiere avanzar. Usa los precios " +
      "NETOS reales de Zyteron (sin IVA). Llama esto solo cuando el cliente confirma explícitamente.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Ítems de la cotización con su precio NETO por unidad.",
          items: {
            type: "object",
            properties: {
              descripcion: { type: "string" },
              precio_neto: { type: "number" },
              cantidad: { type: "number" },
            },
            required: ["descripcion", "precio_neto"],
          },
        },
      },
      required: ["items"],
    },
  },
};

function str(v: unknown, max = 300) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

/**
 * Genera la respuesta de la IA para una conversación a partir del historial.
 * Además, la IA rellena la ficha del cliente y puede crear una cotización al
 * confirmar. Devuelve "" si no hay API key.
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
    tools: [FICHA_TOOL, QUOTE_TOOL],
    temperature: 0.6,
    maxTokens: 500,
    executeTool: async (name, argsJson) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(argsJson || "{}");
      } catch {
        args = {};
      }

      if (name === "registrar_datos_cliente") {
        const patch: Record<string, unknown> = {};
        if (str(args.nombre)) patch.customer_name = str(args.nombre, 140);
        if (str(args.correo)) patch.email = str(args.correo, 160);
        if (str(args.empresa)) patch.company = str(args.empresa, 140);
        if (str(args.rubro)) patch.industry = str(args.rubro, 120);
        if (str(args.servicio_solicitado)) patch.requested_service = str(args.servicio_solicitado, 200);
        if (str(args.plazo)) patch.deadline = str(args.plazo, 80);
        const budget = Number(args.presupuesto_estimado);
        if (Number.isFinite(budget) && budget > 0) patch.estimated_budget = Math.round(budget);
        // Avanza el estado del lead si ya hay nombre + contacto.
        const willHaveContact = patch.email || conversation.email;
        const willHaveName = patch.customer_name || conversation.customer_name;
        if (willHaveContact && willHaveName && conversation.lead_status === "nuevo") {
          patch.lead_status = "contactado";
        }
        if (Object.keys(patch).length > 0) await updateConversation(conversation.id, patch);
        return "Ficha actualizada.";
      }

      if (name === "generar_cotizacion") {
        const fresh = (await getConversation(conversation.id)) ?? conversation;

        // Anti-duplicado: si ya se generó una cotización en esta conversación,
        // NO crear otra. Solo informar que ya está registrada.
        if (fresh.lead_status === "cotizacion_enviada" || fresh.lead_id) {
          return "Ya existe una cotización registrada para este cliente en esta conversación. NO generes otra: confírmale al cliente que su cotización ya está registrada y que el equipo lo contactará.";
        }

        const rawItems = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : [];
        const items = rawItems
          .map((it) => ({
            descripcion: str(it.descripcion, 200),
            precio_neto: Number(it.precio_neto),
            cantidad: Number(it.cantidad) || 1,
          }))
          .filter((it) => it.descripcion && Number.isFinite(it.precio_neto) && it.precio_neto > 0);
        if (items.length === 0) return "No se pudo generar la cotización: faltan ítems con precio.";

        const result = await executeCreateQuoteDraft({
          cliente_nombre: fresh.customer_name || fresh.profile_name || "Cliente WhatsApp",
          cliente_email: fresh.email || "",
          cliente_empresa: fresh.company || "",
          cliente_telefono: `+${fresh.phone}`,
          items,
          notas: `Cotización generada automáticamente desde WhatsApp (+${fresh.phone}).`,
        });
        if (result.ok) {
          // Guardamos el id de la cotización para evitar duplicados futuros.
          await updateConversation(conversation.id, {
            lead_status: "cotizacion_enviada",
            lead_id: result.quoteId,
          });
          // AVISO AL VENDEDOR: correo "vendiste esto" (no bloquea la respuesta).
          const net = items.reduce((a, it) => a + it.precio_neto * it.cantidad, 0);
          const iva = Math.round(net * 0.19);
          void sendQuoteAlertEmail({
            clientName: fresh.customer_name || fresh.profile_name || "Cliente",
            clientContact: [fresh.email, `+${fresh.phone}`].filter(Boolean).join(" · "),
            channel: "WhatsApp",
            items: items.map((it) => ({ descripcion: it.descripcion, cantidad: it.cantidad, precioNeto: it.precio_neto })),
            net,
            iva,
            total: net + iva,
            quoteId: result.quoteId,
          }).catch(() => {});
        }
        return result.message;
      }

      return "Solicitud recibida.";
    },
  });

  // Garantiza SIEMPRE una respuesta al cliente (evita silencios cuando la IA
  // solo ejecutó herramientas sin redactar texto).
  return (
    reply.trim() ||
    "Perfecto, ya tomé tu solicitud. El equipo de Zyteron te contactará muy pronto. ¿Te ayudo con algo más mientras tanto?"
  );
}

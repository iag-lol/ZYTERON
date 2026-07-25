/**
 * Runtime reutilizable de OpenAI: streaming de texto + loop de function-calling.
 * Usado por el asistente interno del admin. Devuelve un ReadableStream de texto
 * plano incremental. Diseñado para no lanzar nunca hacia el cliente.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type OpenAIMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCallPayload[] }
  | { role: "tool"; tool_call_id: string; content: string };

type OpenAIToolCallPayload = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type AccumulatedToolCall = { id: string; name: string; args: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenAITool = { type: "function"; function: Record<string, any> };

export type ToolExecutor = (name: string, argsJson: string) => Promise<string>;

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  emit: (text: string) => void,
): Promise<{ content: string; toolCalls: AccumulatedToolCall[] }> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";
  let content = "";
  const toolMap = new Map<number, AccumulatedToolCall>();

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
          const delta = parsed?.choices?.[0]?.delta;
          if (!delta) continue;
          if (typeof delta.content === "string" && delta.content.length > 0) {
            content += delta.content;
            emit(delta.content);
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const call of delta.tool_calls) {
              const index = typeof call.index === "number" ? call.index : 0;
              const existing = toolMap.get(index) ?? { id: "", name: "", args: "" };
              if (call.id) existing.id = call.id;
              if (call.function?.name) existing.name = call.function.name;
              if (typeof call.function?.arguments === "string") existing.args += call.function.arguments;
              toolMap.set(index, existing);
            }
          }
        } catch {
          /* fragmento incompleto */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const toolCalls = Array.from(toolMap.values()).filter((tc) => tc.id && tc.name);
  return { content, toolCalls };
}

export function createOpenAIToolStream(options: {
  apiKey: string;
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  executeTool?: ToolExecutor;
  temperature?: number;
  maxTokens?: number;
  fallbackText: string;
}): ReadableStream<Uint8Array> {
  const { apiKey, model, tools, executeTool, fallbackText } = options;
  const convo = [...options.messages];
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (text: string) => controller.enqueue(encoder.encode(text));
      const MAX_TURNS = 4;
      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          let upstream: Response;
          try {
            upstream = await fetch(OPENAI_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model,
                stream: true,
                temperature: options.temperature ?? 0.4,
                max_tokens: options.maxTokens ?? 1200,
                ...(tools && tools.length ? { tools, tool_choice: "auto" } : {}),
                messages: convo,
              }),
            });
          } catch {
            emit(fallbackText);
            break;
          }

          if (!upstream.ok || !upstream.body) {
            emit(fallbackText);
            break;
          }

          const { content, toolCalls } = await consumeStream(upstream.body, emit);
          if (toolCalls.length === 0 || !executeTool) break;

          convo.push({
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: tc.args || "{}" },
            })),
          });

          for (const tc of toolCalls) {
            let result = "Solicitud recibida.";
            try {
              result = await executeTool(tc.name, tc.args || "{}");
            } catch {
              result = "No se pudo ejecutar la acción.";
            }
            convo.push({ role: "tool", tool_call_id: tc.id, content: result });
          }
        }
      } catch {
        emit("\n" + fallbackText);
      } finally {
        controller.close();
      }
    },
  });
}

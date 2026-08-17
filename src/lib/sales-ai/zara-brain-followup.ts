import "server-only";

import { z } from "zod";

import { siteConfig } from "@/config/site";
import { canRunAiTask, recordAiUsage } from "./budget";
import { getSalesSettings } from "./settings";
import { HONESTY_RULE } from "./zara-identity";

/**
 * Personalización de seguimientos. Se separa del cerebro principal porque es
 * una tarea de prioridad BULK: si el presupuesto está ajustado, se omite y el
 * seguimiento sale igual con el texto base construido por código.
 */

const followupSchema = z.object({
  subject: z.string().min(1).max(160),
  body: z.string().min(1).max(1500),
});

export type PersonalizedFollowup = z.infer<typeof followupSchema>;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function personalizeFollowup(input: {
  companyId: string;
  step: number;
  context: string;
}): Promise<PersonalizedFollowup | null> {
  const budget = await canRunAiTask("BULK");
  if (!budget.allowed) return null;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const settings = await getSalesSettings();
  const model = process.env.SALES_AI_MODEL?.trim() || settings.ai_model;

  const tone =
    input.step === 1
      ? "Primer seguimiento: recuerda el contacto anterior de forma breve y aporta un motivo concreto para retomar."
      : input.step === 2
        ? "Segundo seguimiento: ofrece algo útil (un ejemplo, una alternativa acotada) y facilita responder con una sola línea."
        : "Último seguimiento: despedida cordial, sin presión, dejando la puerta abierta.";

  const systemPrompt = `Eres ${settings.zara_name}, ${settings.zara_role} de ${siteConfig.legalName}.

Redactas un correo de seguimiento comercial breve, en español de Chile.

REGLAS
- Máximo 90 palabras. Nada de introducciones largas.
- Prohibido empezar con "Espero que se encuentre muy bien" o fórmulas equivalentes.
- Prohibido usar "Solo quería dar seguimiento a mi correo anterior".
- Varía la redacción: este es el seguimiento número ${input.step}.
- No inventes precios, plazos, descuentos ni casos de éxito.
- No incluyas firma: la agrega el sistema.
- ${tone}

${HONESTY_RULE}

CONTEXTO DEL PROSPECTO
${input.context}

Responde SOLO con un objeto JSON con las claves: subject, body.`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Redacta el seguimiento número ${input.step}.` },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    await recordAiUsage({
      companyId: input.companyId,
      action: "PERSONALIZE_FOLLOWUP",
      model,
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      result: "OK",
    });

    const parsed = followupSchema.safeParse(JSON.parse(payload.choices?.[0]?.message?.content ?? "{}"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

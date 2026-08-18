import "server-only";

import { siteConfig } from "@/config/site";
import { PLAN_PRICES, PRICING_NOTE } from "@/config/pricing";
import { canRunAiTask, recordAiUsage } from "./budget";
import { getSalesSettings } from "./settings";
import { getCompany } from "./repository";
import { HONESTY_RULE } from "./zara-identity";
import { checkOutreachQuality, outreachContentSchema, type OutreachContent } from "./rules";

/**
 * Redacción del primer contacto con salida estructurada.
 *
 * El contenido se genera cerca del momento del envío, no al encolar: así no se
 * gasta presupuesto de IA en prospectos que después se cancelan.
 *
 * Nada se envía sin pasar el control de calidad por código: un correo genérico
 * queda para revisión humana en lugar de salir.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/** Esquema que se le exige al modelo. */
const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "subject",
    "greeting",
    "company_observation",
    "detected_opportunity",
    "recommended_solution",
    "commercial_benefits",
    "call_to_action",
    "body_text",
    "confidence",
    "requires_review",
    "review_reason",
  ],
  properties: {
    subject: { type: "string", description: "Entre 35 y 65 caracteres. Específico para la empresa." },
    greeting: { type: "string", description: "Saludo profesional, con el nombre del contacto si existe." },
    company_observation: { type: "string", description: "Observación concreta y verdadera sobre la empresa." },
    detected_opportunity: { type: "string", description: "Problema u oportunidad detectada, en términos de negocio." },
    recommended_solution: { type: "string", description: "Qué haría Zyteron, concreto y acotado." },
    commercial_benefits: { type: "string", description: "Beneficios comerciales claros y verificables." },
    call_to_action: { type: "string", description: "Una sola pregunta de cierre, fácil de responder." },
    body_text: { type: "string", description: "Correo completo en texto plano, 140 a 220 palabras, en bloques cortos separados por línea en blanco. Sin firma." },
    confidence: { type: "number", description: "0 a 1. Qué tan sólido es el correo con los datos disponibles." },
    requires_review: { type: "boolean", description: "true si falta información o hay algo dudoso." },
    review_reason: { type: "string", description: "Motivo si requires_review es true; vacío si no." },
  },
} as const;

export type ComposeResult = {
  ok: boolean;
  content?: OutreachContent;
  requiresReview: boolean;
  reviewReason?: string;
  error?: string;
};

function buildSystemPrompt(company: NonNullable<Awaited<ReturnType<typeof getCompany>>>, settings: { zara_name: string; zara_role: string }) {
  const plans = Object.entries(PLAN_PRICES)
    .map(([id, price]) => `- ${id}: ${price}`)
    .join("\n");

  return `Eres ${settings.zara_name}, ${settings.zara_role} de ${siteConfig.legalName}, empresa chilena de desarrollo web con oficina en ${siteConfig.address.display}.

Escribes el PRIMER correo en frío a ${company.name}. No te conocen. Tienes que ganarte la respuesta.

ESTRUCTURA DEL CUERPO (bloques cortos separados por línea en blanco)
1. Saludo profesional.
2. Observación concreta y verdadera sobre ${company.name}. Debe notarse que miraste su negocio.
3. El problema u oportunidad, en términos de negocio: qué les cuesta hoy en tiempo, consultas perdidas u orden.
4. Qué haría Zyteron, concreto y acotado.
5. Beneficios comerciales claros, sin exagerar.
6. Una sola pregunta de cierre, simple de responder.
7. Una línea educada indicando que pueden pedir no recibir más correos.

LARGO: entre 140 y 220 palabras. Ni una línea de relleno.

PROHIBIDO
- Fórmulas vacías: "es crucial", "te propongo considerar", "solución integral", "sinergia", "potenciar", "llevar al siguiente nivel", "en el mundo digital actual".
- Empezar con "Espero que se encuentre muy bien".
- Inventar precios, descuentos, plazos, clientes, resultados o funcionalidades.
- Afirmar una relación previa que no existe.
- Emojis, mayúsculas de más o lenguaje de promoción.
- Escribir algo que serviría igual para otra empresa. Si al cambiar el nombre el correo sigue funcionando, está MAL.
- Incluir firma: la agrega el sistema.

PRECIOS (los únicos citables; úsalos solo si vienen al caso)
${plans}
${PRICING_NOTE}

SI FALTA INFORMACIÓN
No inventes un diagnóstico. Marca requires_review en true, explica el motivo en
review_reason y escribe el correo en tono de pregunta en vez de afirmación.

${HONESTY_RULE}

DATOS REALES DEL PROSPECTO (no agregues nada que no esté aquí)
- Empresa: ${company.name}
- Rubro: ${company.industry ?? "no registrado"}
- Comuna/Región: ${company.commune ?? "?"} / ${company.region ?? "?"}
- Contacto: ${company.contact_name ?? "sin nombre"} (${company.contact_role ?? "cargo no registrado"})
- Sitio web: ${company.website ?? "no registrado"}
- Problema detectado: ${company.detected_problem ?? "NO REGISTRADO"}
- Servicio recomendado: ${company.recommended_service ?? "NO DEFINIDO"}
- Potencial: ${company.potential} · score ${company.score ?? "sin calcular"}
- Observaciones: ${company.notes ?? "sin observaciones"}`;
}

export async function composeOutreach(companyId: string): Promise<ComposeResult> {
  const company = await getCompany(companyId);
  if (!company) return { ok: false, requiresReview: true, error: "La empresa no existe." };

  // Sin datos propios del prospecto, un correo en frío sería genérico por
  // definición: se manda a revisión en vez de gastar IA y reputación.
  if (!company.detected_problem && !company.recommended_service && !company.industry) {
    return {
      ok: false,
      requiresReview: true,
      reviewReason:
        "El prospecto no tiene rubro, problema detectado ni servicio recomendado. " +
        "Sin eso el correo sería genérico.",
    };
  }

  const budget = await canRunAiTask("NORMAL");
  if (!budget.allowed) {
    return { ok: false, requiresReview: true, reviewReason: budget.reason };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, requiresReview: true, error: "OPENAI_API_KEY no está configurada." };
  }

  const settings = await getSalesSettings();
  const model = process.env.SALES_AI_MODEL?.trim() || settings.ai_model;

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.75,
        max_tokens: 1400,
        response_format: {
          type: "json_schema",
          json_schema: { name: "outreach_email", strict: true, schema: RESPONSE_SCHEMA },
        },
        messages: [
          { role: "system", content: buildSystemPrompt(company, settings) },
          {
            role: "user",
            content: `Redacta el primer correo para ${company.name}. Recuerda: entre 140 y 220 palabras y que se note que miraste su negocio.`,
          },
        ],
      }),
    });
  } catch {
    return { ok: false, requiresReview: true, error: "No se pudo conectar con el servicio de redacción." };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    await recordAiUsage({
      companyId,
      action: "COMPOSE_OUTREACH",
      model,
      promptTokens: 0,
      completionTokens: 0,
      result: "ERROR",
      errorDetail: `HTTP ${response.status}: ${detail.slice(0, 200)}`,
    });
    return { ok: false, requiresReview: true, error: `El servicio respondió ${response.status}.` };
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } | null;

  const promptTokens = payload?.usage?.prompt_tokens ?? 0;
  const completionTokens = payload?.usage?.completion_tokens ?? 0;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload?.choices?.[0]?.message?.content ?? "{}");
  } catch {
    await recordAiUsage({
      companyId,
      action: "COMPOSE_OUTREACH",
      model,
      promptTokens,
      completionTokens,
      result: "ERROR",
      errorDetail: "Respuesta no es JSON válido",
    });
    return { ok: false, requiresReview: true, error: "La respuesta no fue JSON válido." };
  }

  const validation = outreachContentSchema.safeParse(parsed);
  if (!validation.success) {
    await recordAiUsage({
      companyId,
      action: "COMPOSE_OUTREACH",
      model,
      promptTokens,
      completionTokens,
      result: "ERROR",
      errorDetail: `Esquema inválido: ${validation.error.issues[0]?.message}`,
    });
    return {
      ok: false,
      requiresReview: true,
      reviewReason: `La redacción no cumplió el formato exigido: ${validation.error.issues[0]?.message}`,
    };
  }

  const content = validation.data;

  await recordAiUsage({
    companyId,
    action: "COMPOSE_OUTREACH",
    model,
    promptTokens,
    completionTokens,
    confidence: content.confidence,
    result: "OK",
  });

  // Control de calidad por código: manda por sobre lo que declare el modelo.
  const issues = checkOutreachQuality(content, {
    name: company.name,
    contactName: company.contact_name,
  });

  const requiresReview =
    content.requires_review || issues.length > 0 || content.confidence < 0.7;

  const reviewReason = issues.length
    ? issues.map((issue) => `${issue.field}: ${issue.reason}`).join(" · ")
    : content.requires_review
      ? content.review_reason || "El modelo pidió revisión humana."
      : content.confidence < 0.7
        ? `Confianza baja (${content.confidence.toFixed(2)}).`
        : undefined;

  return { ok: true, content, requiresReview, reviewReason };
}

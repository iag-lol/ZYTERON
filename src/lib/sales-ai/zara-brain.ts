import "server-only";

import { z } from "zod";

import { PLAN_PRICES, ADDONS, PRICING_NOTE, MAINTENANCE } from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { canRunAiTask, recordAiUsage, type TaskPriority } from "./budget";
import { getSalesSettings } from "./settings";
import { getCompany, getCompanyTimeline } from "./repository";

/**
 * Cerebro de Zara. No es un prompt gigante: es una capa acotada que recibe
 * contexto verificado del sistema y devuelve una estructura validada con Zod.
 * Si la validación falla, no se ejecuta ninguna acción.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// ---------------------------------------------------------------------------
// Esquema de análisis (sección 8 del encargo)
// ---------------------------------------------------------------------------

export const analysisSchema = z.object({
  intent: z.enum([
    "CONSULTA_PRECIO",
    "SOLICITA_REUNION",
    "SOLICITA_COTIZACION",
    "INTERESADO",
    "NO_INTERESADO",
    "PIDE_NO_CONTACTAR",
    "RECLAMO",
    "NEGOCIACION",
    "PREGUNTA_TECNICA",
    "FUERA_DE_ALCANCE",
    "OTRO",
  ]),
  confidence: z.number().min(0).max(1),
  lead_status: z.enum([
    "CONTACTADO",
    "RESPONDIO",
    "INTERESADO",
    "PRESUPUESTO_ENVIADO",
    "NEGOCIACION",
    "GANADO",
    "PERDIDO",
    "EN_PAUSA",
  ]),
  potential: z.enum(["BAJO", "MEDIO", "POTENCIAL", "ALTO"]),
  summary: z.string().min(1).max(600),
  recommended_action: z.string().min(1).max(300),
  requires_human: z.boolean(),
  reason: z.string().max(400),
});

export type EmailAnalysis = z.infer<typeof analysisSchema>;

export const draftSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  confidence: z.number().min(0).max(1),
  requires_approval: z.boolean(),
  reason: z.string().max(400),
});

export type DraftReply = z.infer<typeof draftSchema>;

/**
 * Temas que SIEMPRE exigen aprobación humana, sin importar la confianza que
 * declare el modelo. Es una barrera de código, no una instrucción de prompt.
 */
const ALWAYS_HUMAN_INTENTS = new Set([
  "RECLAMO",
  "NEGOCIACION",
  "FUERA_DE_ALCANCE",
  "PIDE_NO_CONTACTAR",
]);

const SENSITIVE_PATTERNS = [
  /descuento/i,
  /rebaj/i,
  /contrato/i,
  /legal/i,
  /demand/i,
  /abogad/i,
  /factura\s+impag/i,
  /reclam/i,
  /devoluci[oó]n/i,
  /urgente.*plazo/i,
];

export function requiresHumanByPolicy(intent: string, text: string): string | null {
  if (ALWAYS_HUMAN_INTENTS.has(intent)) {
    return `La intención "${intent}" siempre requiere revisión humana.`;
  }
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return `El mensaje menciona un tema sensible (${pattern.source}) que requiere aprobación.`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Contexto verificado: la IA solo ve datos reales del sistema
// ---------------------------------------------------------------------------

function buildPricingContext(): string {
  const plans = Object.entries(PLAN_PRICES)
    .map(([id, price]) => `- ${id}: ${price}`)
    .join("\n");
  const addons = ADDONS.slice(0, 12)
    .map((item) => `- ${item.name}: ${item.price}`)
    .join("\n");
  const maintenance = MAINTENANCE.map((item) => `- ${item.name}: ${item.price}`).join("\n");

  return `PLANES PUBLICADOS (únicos precios que puedes citar):
${plans}

SERVICIOS ADICIONALES:
${addons}

MANTENCIÓN MENSUAL:
${maintenance}

NOTA OBLIGATORIA: ${PRICING_NOTE}`;
}

export async function buildCompanyContext(companyId: string): Promise<string> {
  const company = await getCompany(companyId);
  if (!company) return "No hay ficha de empresa disponible.";

  const timeline = await getCompanyTimeline(companyId, 15);
  const history = timeline
    .map((event) => `- ${event.created_at.slice(0, 10)} · ${event.title}${event.detail ? `: ${event.detail}` : ""}`)
    .join("\n");

  return `FICHA DE LA EMPRESA (datos reales del CRM):
- Nombre: ${company.name}
- Rubro: ${company.industry ?? "no registrado"}
- Comuna/Región: ${company.commune ?? "?"} / ${company.region ?? "?"}
- Contacto: ${company.contact_name ?? "?"} (${company.contact_role ?? "cargo no registrado"})
- Estado comercial: ${company.status}
- Potencial: ${company.potential}
- Problema detectado: ${company.detected_problem ?? "no registrado"}
- Servicio recomendado: ${company.recommended_service ?? "no definido"}
- Valor potencial: ${company.potential_value ? `$${company.potential_value}` : "no estimado"}

HISTORIAL RECIENTE:
${history || "Sin interacciones previas registradas."}`;
}

function buildSystemPrompt(context: string): string {
  return `Eres Zara, Ejecutivo Comercial IA de ${siteConfig.legalName}.

Tu prioridad es convertir oportunidades comerciales reales sin engañar, presionar ni inventar información.

REGLAS INQUEBRANTABLES
- Lee siempre el hilo completo antes de responder.
- No vuelvas a preguntar información que el cliente ya entregó.
- NUNCA inventes precios, descuentos, características, plazos, casos de éxito, clientes ni resultados.
- Solo puedes citar los precios listados abajo. Si el cliente pide algo que no está en la lista, indica que requiere cotización personalizada y marca requires_human en true.
- Si no sabes algo, dilo y escala. Es preferible escalar a inventar.
- Escribe como una persona real, en español de Chile, sin lenguaje robótico ni frases hechas.
- Adapta ligeramente la formalidad al tono del cliente.
- Sé claro y breve. Responde primero lo que preguntó el cliente.
- Después avanza naturalmente hacia: consulta → reunión → propuesta → negociación → venta.
- No te hagas pasar por una persona específica. Si preguntan, eres el asistente comercial de Zyteron.

${buildPricingContext()}

CONTEXTO DEL PROSPECTO
${context}

EMPRESA
${siteConfig.legalName}. Oficina: ${siteConfig.address.display}.
Contacto: ${siteConfig.contact.email} · ${siteConfig.contact.phoneDisplay}.`;
}

// ---------------------------------------------------------------------------
// Llamada a OpenAI con salida estructurada y registro de consumo
// ---------------------------------------------------------------------------

type StructuredCallResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  costUsd?: number;
};

async function callStructured<T>(options: {
  schema: z.ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
  action: string;
  companyId?: string | null;
  priority?: TaskPriority;
  maxTokens?: number;
}): Promise<StructuredCallResult<T>> {
  const budget = await canRunAiTask(options.priority ?? "NORMAL");
  if (!budget.allowed) {
    return { ok: false, error: budget.reason };
  }

  const settings = await getSalesSettings();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY no está configurada en el servidor." };
  }

  const model = process.env.SALES_AI_MODEL?.trim() || settings.ai_model;

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: options.maxTokens ?? 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
      }),
    });
  } catch (error) {
    await recordAiUsage({
      companyId: options.companyId,
      action: options.action,
      model,
      promptTokens: 0,
      completionTokens: 0,
      result: "ERROR",
      errorDetail: (error as Error)?.message ?? "network",
    });
    return { ok: false, error: "No se pudo conectar con OpenAI." };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    await recordAiUsage({
      companyId: options.companyId,
      action: options.action,
      model,
      promptTokens: 0,
      completionTokens: 0,
      result: "ERROR",
      errorDetail: `HTTP ${response.status}: ${detail.slice(0, 300)}`,
    });
    return { ok: false, error: `OpenAI respondió ${response.status}.` };
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } | null;

  const promptTokens = payload?.usage?.prompt_tokens ?? 0;
  const completionTokens = payload?.usage?.completion_tokens ?? 0;
  const content = payload?.choices?.[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const cost = await recordAiUsage({
      companyId: options.companyId,
      action: options.action,
      model,
      promptTokens,
      completionTokens,
      result: "ERROR",
      errorDetail: "Respuesta no es JSON válido",
    });
    return { ok: false, error: "La respuesta del modelo no fue JSON válido.", costUsd: cost };
  }

  const validation = options.schema.safeParse(parsed);
  if (!validation.success) {
    const cost = await recordAiUsage({
      companyId: options.companyId,
      action: options.action,
      model,
      promptTokens,
      completionTokens,
      result: "ERROR",
      errorDetail: `Esquema inválido: ${validation.error.issues[0]?.message ?? "desconocido"}`,
    });
    return { ok: false, error: "La respuesta del modelo no cumple el esquema esperado.", costUsd: cost };
  }

  const confidence =
    typeof (validation.data as { confidence?: number })?.confidence === "number"
      ? (validation.data as { confidence: number }).confidence
      : null;

  const cost = await recordAiUsage({
    companyId: options.companyId,
    action: options.action,
    model,
    promptTokens,
    completionTokens,
    confidence,
    result: "OK",
  });

  return { ok: true, data: validation.data, costUsd: cost };
}

// ---------------------------------------------------------------------------
// Operaciones públicas
// ---------------------------------------------------------------------------

export async function analyzeIncomingEmail(input: {
  companyId?: string | null;
  threadSummary: string;
  incomingMessage: string;
}): Promise<StructuredCallResult<EmailAnalysis>> {
  const context = input.companyId
    ? await buildCompanyContext(input.companyId)
    : "Prospecto no identificado en el CRM.";

  const result = await callStructured({
    schema: analysisSchema,
    action: "ANALYZE_EMAIL",
    companyId: input.companyId,
    priority: "NORMAL",
    systemPrompt: `${buildSystemPrompt(context)}

TAREA: analiza el correo recibido y responde SOLO con un objeto JSON con estas claves:
intent, confidence, lead_status, potential, summary, recommended_action, requires_human, reason.
La confianza debe reflejar cuán seguro estás de haber entendido la intención real.`,
    userPrompt: `HILO PREVIO:
${input.threadSummary || "Sin mensajes previos."}

MENSAJE RECIBIDO:
${input.incomingMessage}`,
    maxTokens: 600,
  });

  // La política de código manda por sobre lo que declare el modelo.
  if (result.ok && result.data) {
    const policyReason = requiresHumanByPolicy(result.data.intent, input.incomingMessage);
    if (policyReason) {
      result.data = { ...result.data, requires_human: true, reason: policyReason };
    }
  }

  return result;
}

export async function draftReply(input: {
  companyId?: string | null;
  threadSummary: string;
  incomingMessage: string;
  analysis: EmailAnalysis;
}): Promise<StructuredCallResult<DraftReply>> {
  const context = input.companyId
    ? await buildCompanyContext(input.companyId)
    : "Prospecto no identificado en el CRM.";

  const result = await callStructured({
    schema: draftSchema,
    action: "DRAFT_REPLY",
    companyId: input.companyId,
    priority: "NORMAL",
    systemPrompt: `${buildSystemPrompt(context)}

TAREA: redacta la respuesta al correo recibido. Responde SOLO con un objeto JSON con
las claves: subject, body, confidence, requires_approval, reason.
El campo body debe ser el correo listo para enviar, en texto plano, sin firma
automática (la firma la agrega el sistema). Marca requires_approval en true si
mencionas precios fuera de lista, plazos especiales, descuentos o cualquier
compromiso que deba validar una persona.`,
    userPrompt: `ANÁLISIS PREVIO: ${JSON.stringify(input.analysis)}

HILO PREVIO:
${input.threadSummary || "Sin mensajes previos."}

MENSAJE A RESPONDER:
${input.incomingMessage}`,
    maxTokens: 1200,
  });

  if (result.ok && result.data) {
    const policyReason = requiresHumanByPolicy(input.analysis.intent, `${input.incomingMessage} ${result.data.body}`);
    if (policyReason) {
      result.data = { ...result.data, requires_approval: true, reason: policyReason };
    }
  }

  return result;
}

/**
 * Decide qué hacer con un análisis según la configuración vigente.
 * Es lógica de código, no del modelo.
 */
export async function decideAction(analysis: EmailAnalysis): Promise<{
  action: "AUTO_REPLY" | "DRAFT_FOR_APPROVAL" | "NOTIFY_ONLY";
  reason: string;
}> {
  const settings = await getSalesSettings();

  if (settings.zara_paused) {
    return { action: "NOTIFY_ONLY", reason: "Zara está pausada por el administrador." };
  }

  if (analysis.requires_human) {
    return { action: "DRAFT_FOR_APPROVAL", reason: analysis.reason || "El análisis exige revisión humana." };
  }

  if (analysis.confidence < settings.approval_min_confidence) {
    return {
      action: "NOTIFY_ONLY",
      reason: `Confianza ${analysis.confidence.toFixed(2)} bajo el mínimo de ${settings.approval_min_confidence}.`,
    };
  }

  if (settings.auto_reply_enabled && analysis.confidence >= settings.auto_reply_min_confidence) {
    return { action: "AUTO_REPLY", reason: `Confianza ${analysis.confidence.toFixed(2)} sobre el umbral automático.` };
  }

  return { action: "DRAFT_FOR_APPROVAL", reason: "Se prepara borrador para aprobación." };
}

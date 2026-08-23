import "server-only";

import { siteConfig } from "@/config/site";
import { PLAN_PRICES, PRICING_NOTE } from "@/config/pricing";
import { canRunAiTask, recordAiUsage } from "./budget";
import { getSalesSettings } from "./settings";
import { getCompany } from "./repository";
import { HONESTY_RULE } from "./zara-identity";
import {
  checkOutreachQuality,
  factAuditResponseSchema,
  outreachContentSchema,
  type OutreachContent,
} from "./rules";

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

type RepairResult = {
  content?: OutreachContent;
  error?: string;
};

type FactAuditResult = {
  supported: boolean;
  unsupportedClaims: string[];
  error?: string;
};

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
    body_text: {
      type: "string",
      description:
        "Correo FINAL completo en texto plano, 140 a 220 palabras, en bloques cortos separados por línea en blanco. Debe desarrollar los siete bloques; no es un resumen ni una concatenación de los otros campos. Sin firma.",
    },
    confidence: { type: "number", description: "0 a 1. Qué tan sólido es el correo con los datos disponibles." },
    requires_review: { type: "boolean", description: "true si falta información o hay algo dudoso." },
    review_reason: { type: "string", description: "Motivo si requires_review es true; vacío si no." },
  },
} as const;

const FACT_AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["supported", "unsupported_claims"],
  properties: {
    supported: {
      type: "boolean",
      description: "true únicamente si todas las afirmaciones del correo están respaldadas por los datos entregados.",
    },
    unsupported_claims: {
      type: "array",
      items: { type: "string" },
      description: "Afirmaciones, elogios, resultados o funcionalidades que no estén respaldados por los datos.",
    },
  },
} as const;

export type ComposeResult = {
  ok: boolean;
  content?: OutreachContent;
  requiresReview: boolean;
  reviewReason?: string;
  error?: string;
};

function buildSystemPrompt(
  company: NonNullable<Awaited<ReturnType<typeof getCompany>>>,
  settings: { zara_name: string; zara_role: string },
) {
  const plans = Object.entries(PLAN_PRICES)
    .map(([id, price]) => `- ${id}: ${price}`)
    .join("\n");

  return `Eres ${settings.zara_name}, ${settings.zara_role} de ${siteConfig.legalName}, empresa chilena de desarrollo web con oficina en ${siteConfig.address.display}.

Escribes el PRIMER correo en frío a ${company.name}. No te conocen. Tienes que ganarte la respuesta.

ESTRUCTURA DEL CUERPO (bloques cortos separados por línea en blanco)
1. Saludo profesional: 2 a 8 palabras.
2. Observación concreta y verdadera sobre ${company.name}: 25 a 35 palabras. Debe ser una paráfrasis fiel del rubro, problema detectado, servicio recomendado u observaciones entregadas abajo.
3. El problema u oportunidad, en términos de negocio: 25 a 35 palabras sobre qué les cuesta hoy en tiempo, consultas perdidas u orden.
4. Qué haría Zyteron: 35 a 50 palabras, concreto y acotado.
5. Beneficios comerciales claros: 25 a 40 palabras, sin exagerar.
6. Una sola pregunta de cierre, simple de responder: 10 a 20 palabras. Con esto termina el correo.

LARGO: entre 140 y 220 palabras. Ni una línea de relleno.
El campo body_text ES el correo final completo: desarrolla todos los bloques anteriores
en prosa natural. No lo resumas y no copies simplemente los campos breves. Antes de
responder, cuenta las palabras de body_text; apunta a 165-190 para dejar margen.

PROHIBIDO
- Fórmulas vacías: "es crucial", "te propongo considerar", "solución integral", "sinergia", "potenciar", "llevar al siguiente nivel", "en el mundo digital actual".
- Empezar con "Espero que se encuentre muy bien".
- Inventar precios, descuentos, plazos, clientes, resultados o funcionalidades.
- Afirmar una relación previa que no existe.
- Emojis, mayúsculas de más o lenguaje de promoción.
- Escribir algo que serviría igual para otra empresa. Si al cambiar el nombre el correo sigue funcionando, está MAL.
- Incluir firma: la agrega el sistema.
- Agregar cualquier línea de baja, exclusión o "si no desean recibir más correos": el correo termina en la pregunta de cierre.
- Decir "he visto", "he notado", "he observado", "se destaca", "su compromiso" o cualquier elogio si esa observación no aparece literalmente en los datos.
- Agregar tendencias de mercado, cualidades de la empresa, contenido de su web, especialidades, redes sociales, volúmenes, resultados esperados o capacidades que no estén escritas en los datos.
- Presentar como resultado que aumentarán ventas, visitas, cierres o satisfacción. Describe beneficios solo como objetivos operativos: ordenar, centralizar, facilitar o reducir trabajo manual cuando se desprendan del problema registrado.
- Convertir el nombre o el rubro en un supuesto. El nombre "tienda", "clínica" o "constructora" no demuestra catálogo, especialidades, calidad, trayectoria ni presencia digital.

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

/**
 * Structured Outputs garantiza la forma del JSON, no que una redacción sea
 * comercialmente buena. Si el primer intento no pasa el control por código,
 * se permite UNA sola reparación dirigida. Si también falla, permanece en
 * revisión humana y nunca se envía.
 */
async function repairOutreachContent(input: {
  companyId: string;
  companyName: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  content: OutreachContent;
  issues: Array<{ field: string; reason: string }>;
}): Promise<RepairResult> {
  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.45,
        max_tokens: 1600,
        response_format: {
          type: "json_schema",
          json_schema: { name: "outreach_email_repaired", strict: true, schema: RESPONSE_SCHEMA },
        },
        messages: [
          { role: "system", content: input.systemPrompt },
          {
            role: "user",
            content: `Corrige este borrador para ${input.companyName}. El control automático lo rechazó por:\n${input.issues
              .map((issue) => `- ${issue.field}: ${issue.reason}`)
              .join("\n")}\n\nBORRADOR ANTERIOR:\n${JSON.stringify(input.content)}\n\nDevuelve nuevamente todos los campos. body_text debe ser el correo final completo, tener 165-190 palabras reales, usar bloques cortos y conservar únicamente los datos verdaderos del prospecto. No agregues precios, resultados, plazos ni funciones no autorizadas.`,
          },
        ],
      }),
    });
  } catch {
    return { error: "No se pudo conectar con el servicio para corregir el borrador." };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    await recordAiUsage({
      companyId: input.companyId,
      action: "REPAIR_OUTREACH",
      model: input.model,
      promptTokens: 0,
      completionTokens: 0,
      result: "ERROR",
      errorDetail: `HTTP ${response.status}: ${detail.slice(0, 200)}`,
    });
    return { error: `La corrección respondió ${response.status}.` };
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
      companyId: input.companyId,
      action: "REPAIR_OUTREACH",
      model: input.model,
      promptTokens,
      completionTokens,
      result: "ERROR",
      errorDetail: "La corrección no devolvió JSON válido.",
    });
    return { error: "La corrección no devolvió JSON válido." };
  }

  const validation = outreachContentSchema.safeParse(parsed);
  if (!validation.success) {
    await recordAiUsage({
      companyId: input.companyId,
      action: "REPAIR_OUTREACH",
      model: input.model,
      promptTokens,
      completionTokens,
      result: "ERROR",
      errorDetail: `Esquema inválido: ${validation.error.issues[0]?.message}`,
    });
    return { error: `La corrección no cumplió el esquema: ${validation.error.issues[0]?.message}` };
  }

  await recordAiUsage({
    companyId: input.companyId,
    action: "REPAIR_OUTREACH",
    model: input.model,
    promptTokens,
    completionTokens,
    confidence: validation.data.confidence,
    result: "OK",
  });

  return { content: validation.data };
}

/**
 * Auditoría factual separada de la redacción. Structured Outputs valida la
 * forma y el control local valida largo/spam; esta segunda lectura responde la
 * pregunta semántica que el código no puede resolver con expresiones regulares:
 * si el texto afirmó algo que no estaba en la ficha del prospecto.
 *
 * Falla de forma cerrada: si la auditoría no puede ejecutarse o no devuelve un
 * resultado válido, el correo queda para revisión humana y nunca se programa.
 */
async function auditOutreachFacts(input: {
  companyId: string;
  company: NonNullable<Awaited<ReturnType<typeof getCompany>>>;
  content: OutreachContent;
  apiKey: string;
  model: string;
}): Promise<FactAuditResult> {
  const budget = await canRunAiTask("NORMAL");
  if (!budget.allowed) {
    return {
      supported: false,
      unsupportedClaims: [],
      error: budget.reason || "No hay presupuesto disponible para la verificación factual.",
    };
  }

  const sourceOfTruth = {
    company: input.company.name,
    industry: input.company.industry,
    commune: input.company.commune,
    region: input.company.region,
    contact_name: input.company.contact_name,
    contact_role: input.company.contact_role,
    website: input.company.website,
    detected_problem: input.company.detected_problem,
    recommended_service: input.company.recommended_service,
    potential: input.company.potential,
    score: input.company.score,
    notes: input.company.notes,
    approved_pricing: PLAN_PRICES,
    pricing_note: PRICING_NOTE,
  };

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify({
        model: input.model,
        temperature: 0,
        max_tokens: 500,
        response_format: {
          type: "json_schema",
          json_schema: { name: "outreach_fact_audit", strict: true, schema: FACT_AUDIT_SCHEMA },
        },
        messages: [
          {
            role: "system",
            content: `Eres un auditor factual estricto de correo comercial. Compara el asunto y el cuerpo exclusivamente con la FUENTE DE VERDAD entregada.

Marca supported=false si aparece cualquiera de estos casos:
- elogios, cualidades, trayectoria, especialidades, catálogo, redes sociales, contenido web o tendencias de mercado no escritos en la fuente;
- resultados esperados como aumentar ventas, visitas, cierres o satisfacción, aunque se expresen como posibilidad;
- precios, plazos, descuentos, clientes o cifras no escritos en la fuente;
- funcionalidades que excedan el servicio recomendado;
- una inferencia basada solamente en el nombre o rubro de la empresa.

Acepta paráfrasis fieles y beneficios operativos prudentes que se desprendan directamente del problema y del servicio registrado. Ante duda, supported=false. Devuelve cada afirmación no respaldada de forma breve y concreta. Si supported=true, unsupported_claims debe ser [].`,
          },
          {
            role: "user",
            content: `FUENTE DE VERDAD:\n${JSON.stringify(sourceOfTruth)}\n\nCORREO:\n${JSON.stringify({ subject: input.content.subject, body: input.content.body_text })}`,
          },
        ],
      }),
    });
  } catch {
    return {
      supported: false,
      unsupportedClaims: [],
      error: "No se pudo ejecutar la verificación factual.",
    };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    await recordAiUsage({
      companyId: input.companyId,
      action: "AUDIT_OUTREACH_FACTS",
      model: input.model,
      promptTokens: 0,
      completionTokens: 0,
      result: "ERROR",
      errorDetail: `HTTP ${response.status}: ${detail.slice(0, 200)}`,
    });
    return {
      supported: false,
      unsupportedClaims: [],
      error: `La verificación factual respondió ${response.status}.`,
    };
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
    parsed = null;
  }

  const validation = factAuditResponseSchema.safeParse(parsed);
  if (!validation.success) {
    await recordAiUsage({
      companyId: input.companyId,
      action: "AUDIT_OUTREACH_FACTS",
      model: input.model,
      promptTokens,
      completionTokens,
      result: "ERROR",
      errorDetail: `Esquema inválido: ${validation.error.issues[0]?.message}`,
    });
    return {
      supported: false,
      unsupportedClaims: [],
      error: "La verificación factual no devolvió un resultado válido.",
    };
  }

  const supported = validation.data.supported && validation.data.unsupported_claims.length === 0;
  await recordAiUsage({
    companyId: input.companyId,
    action: "AUDIT_OUTREACH_FACTS",
    model: input.model,
    promptTokens,
    completionTokens,
    result: supported ? "OK" : "SKIPPED",
    errorDetail: supported ? undefined : validation.data.unsupported_claims.join(" · ").slice(0, 1000),
  });

  return {
    supported,
    unsupportedClaims: validation.data.unsupported_claims,
  };
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

  let content = validation.data;

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
  let issues = checkOutreachQuality(content, {
    name: company.name,
    contactName: company.contact_name,
  });

  // Un solo intento de reparación: evita bucles y mantiene el gasto acotado.
  // Nunca repara si el propio modelo detectó datos dudosos: eso corresponde a
  // revisión humana, no a forzar una redacción.
  let repairError: string | undefined;
  if (!content.requires_review && issues.length > 0) {
    const repaired = await repairOutreachContent({
      companyId,
      companyName: company.name,
      apiKey,
      model,
      systemPrompt: buildSystemPrompt(company, settings),
      content,
      issues,
    });

    if (repaired.content) {
      content = repaired.content;
      issues = checkOutreachQuality(content, {
        name: company.name,
        contactName: company.contact_name,
      });
    } else {
      repairError = repaired.error;
    }
  }

  let factAuditReason: string | undefined;
  if (!content.requires_review && issues.length === 0 && content.confidence >= 0.7) {
    const audit = await auditOutreachFacts({
      companyId,
      company,
      content,
      apiKey,
      model,
    });

    if (!audit.supported) {
      factAuditReason = audit.unsupportedClaims.length
        ? `Verificación factual: ${audit.unsupportedClaims.join(" · ")}`
        : `Verificación factual: ${audit.error || "no fue posible confirmar que todas las afirmaciones estén respaldadas."}`;
    }
  }

  const requiresReview =
    content.requires_review || issues.length > 0 || content.confidence < 0.7 || Boolean(factAuditReason);

  const reviewReason = issues.length
    ? [
        ...issues.map((issue) => `${issue.field}: ${issue.reason}`),
        ...(repairError ? [`Reparación: ${repairError}`] : []),
      ].join(" · ")
    : content.requires_review
      ? content.review_reason || "El modelo pidió revisión humana."
      : content.confidence < 0.7
        ? `Confianza baja (${content.confidence.toFixed(2)}).`
        : factAuditReason || repairError;

  return { ok: true, content, requiresReview, reviewReason };
}

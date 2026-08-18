import "server-only";

import { z } from "zod";

import { siteConfig } from "@/config/site";
import { PLAN_PRICES, PRICING_NOTE } from "@/config/pricing";
import { canRunAiTask, recordAiUsage } from "./budget";
import { getSalesSettings } from "./settings";
import { getCompany, logSalesEvent } from "./repository";
import { sendCommercialEmail } from "./mailer";
import { scheduleFollowupSequence } from "./followups";
import { HONESTY_RULE } from "./zara-identity";
import { findForbiddenClientTerms } from "./rules";
import { SALES_EVENT_TYPES } from "./types";

/**
 * Primer contacto comercial. Es la pieza que permite que Zara inicie la
 * conversación: genera el mensaje, lo deja para aprobación y, una vez enviado,
 * programa la secuencia de seguimientos.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const outreachSchema = z.object({
  subject: z.string().min(1).max(160),
  body: z.string().min(1).max(2000),
});

export type OutreachDraft = z.infer<typeof outreachSchema>;

/** Mensaje base por código: si no hay presupuesto de IA, igual se puede contactar. */
function buildFallbackOutreach(company: {
  name: string;
  contact_name?: string | null;
  detected_problem?: string | null;
  recommended_service?: string | null;
}): OutreachDraft {
  const greeting = company.contact_name ? `Hola ${company.contact_name.split(" ")[0]},` : "Hola,";
  const problem = company.detected_problem
    ? `Revisando la presencia digital de ${company.name} vimos algo concreto: ${company.detected_problem}`
    : `Estuvimos revisando la presencia digital de ${company.name}.`;
  const service = company.recommended_service
    ? `Lo que mejor calza en su caso es ${company.recommended_service}.`
    : "Podemos proponerles una estructura de sitio orientada a captar más consultas.";

  return {
    subject: `Propuesta digital para ${company.name}`,
    body: `${greeting}\n\n${problem}\n\n${service}\n\nSi les hace sentido, puedo prepararles una propuesta breve y sin compromiso, aterrizada a su operación actual. ¿Les sirve que se la envíe?`,
  };
}

/**
 * Genera el mensaje de primer contacto. Usa solo datos ya investigados del
 * CRM: no vuelve a investigar la empresa, que es lo que encarecería el proceso.
 */
export async function generateOutreach(companyId: string): Promise<{
  ok: boolean;
  draft?: OutreachDraft;
  usedAi: boolean;
  error?: string;
}> {
  const company = await getCompany(companyId);
  if (!company) return { ok: false, usedAi: false, error: "La empresa no existe." };

  const fallback = buildFallbackOutreach(company);

  const budget = await canRunAiTask("BULK");
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!budget.allowed || !apiKey) {
    return { ok: true, draft: fallback, usedAi: false };
  }

  const settings = await getSalesSettings();
  const model = process.env.SALES_AI_MODEL?.trim() || settings.ai_model;

  const plans = Object.entries(PLAN_PRICES)
    .slice(0, 5)
    .map(([id, price]) => `- ${id}: ${price}`)
    .join("\n");

  const systemPrompt = `Eres ${settings.zara_name}, ${settings.zara_role} de ${siteConfig.legalName}.

Escribes el PRIMER correo a una empresa que no te conoce.

REGLAS
- Máximo 120 palabras. Directo, sin relleno.
- Parte por el problema concreto detectado, no por presentarte.
- No abras con "Espero que se encuentre muy bien" ni fórmulas parecidas.
- Una sola pregunta de cierre, fácil de responder.
- No inventes precios, plazos, descuentos, casos de éxito ni clientes.
- Solo puedes mencionar estos precios si viene al caso:
${plans}
- ${PRICING_NOTE}
- No incluyas firma: la agrega el sistema.

${HONESTY_RULE}

DATOS REALES DE LA EMPRESA (ya investigados, no inventes más)
- Nombre: ${company.name}
- Rubro: ${company.industry ?? "no registrado"}
- Comuna: ${company.commune ?? "no registrada"}
- Contacto: ${company.contact_name ?? "sin nombre"} (${company.contact_role ?? "cargo no registrado"})
- Problema detectado: ${company.detected_problem ?? "no registrado"}
- Servicio recomendado: ${company.recommended_service ?? "no definido"}

Responde SOLO con un objeto JSON con las claves: subject, body.`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Redacta el primer correo para ${company.name}.` },
        ],
      }),
    });

    if (!response.ok) return { ok: true, draft: fallback, usedAi: false };

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    await recordAiUsage({
      companyId,
      action: "GENERATE_OUTREACH",
      model,
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      result: "OK",
    });

    const parsed = outreachSchema.safeParse(
      JSON.parse(payload.choices?.[0]?.message?.content ?? "{}"),
    );
    if (!parsed.success) return { ok: true, draft: fallback, usedAi: false };

    // Control de terminología antes de mostrarlo siquiera.
    if (findForbiddenClientTerms(parsed.data.body).length > 0) {
      return { ok: true, draft: fallback, usedAi: false };
    }

    return { ok: true, draft: parsed.data, usedAi: true };
  } catch {
    return { ok: true, draft: fallback, usedAi: false };
  }
}

export type OutreachSendResult = {
  ok: boolean;
  error?: string;
  redirected?: boolean;
  followupsScheduled?: number;
};

/**
 * Envía el primer contacto y deja la empresa en CONTACTADO con su secuencia de
 * seguimientos programada. Sin este paso los seguimientos nunca existirían.
 */
export async function sendOutreach(input: {
  companyId: string;
  subject: string;
  body: string;
  actor: string;
}): Promise<OutreachSendResult> {
  const company = await getCompany(input.companyId);
  if (!company) return { ok: false, error: "La empresa no existe." };
  if (!company.primary_email) {
    return { ok: false, error: "La empresa no tiene correo registrado." };
  }

  const sent = await sendCommercialEmail({
    companyId: input.companyId,
    recipient: company.primary_email,
    subject: input.subject,
    body: input.body,
    actor: input.actor,
    isCampaign: true,
  });

  if (!sent.ok) return { ok: false, error: sent.error };

  const { updateCompany } = await import("./repository");
  await updateCompany(
    input.companyId,
    { status: "CONTACTADO", last_interaction_at: new Date().toISOString() },
    { actor: input.actor, reason: "Primer contacto enviado" },
  );

  const followupsScheduled = await scheduleFollowupSequence({
    companyId: input.companyId,
  }).catch(() => 0);

  await logSalesEvent({
    companyId: input.companyId,
    type: SALES_EVENT_TYPES.EMAIL_SENT,
    title: "Primer contacto enviado",
    detail: `${input.subject} · ${followupsScheduled} seguimientos programados`,
    actor: input.actor,
    isAutomated: false,
  });

  return { ok: true, redirected: sent.redirected, followupsScheduled };
}

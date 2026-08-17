import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSalesSettings } from "./settings";
import { sendCommercialEmail } from "./mailer";
import { notifySalesEvent } from "./notifications";
import { logSalesEvent } from "./repository";
import { SALES_EVENT_TYPES } from "./types";
import { canRunAiTask } from "./budget";
import { buildCompanyContext } from "./zara-brain";

/**
 * Motor de seguimientos. La programación y las verificaciones son código puro:
 * contar días y comprobar estados no necesita IA. La IA solo se usa, y de forma
 * opcional, para personalizar el texto del mensaje.
 */

/** Estados en los que ya no corresponde insistir. */
const TERMINAL_STATUSES = new Set(["GANADO", "PERDIDO", "EN_PAUSA"]);

/** Estados que indican conversación viva: se detiene la secuencia automática. */
const ACTIVE_CONVERSATION_STATUSES = new Set(["RESPONDIO", "INTERESADO", "NEGOCIACION"]);

export async function scheduleFollowupSequence(options: {
  companyId: string;
  threadId?: string | null;
  campaignId?: string | null;
  fromDate?: Date;
}): Promise<number> {
  const settings = await getSalesSettings();
  const { supabase } = createSupabaseServerClient();
  const base = options.fromDate ?? new Date();

  // Nunca duplicamos: si ya hay seguimientos pendientes, no se programan más.
  const { data: pending } = await supabase
    .from("sales_followups")
    .select("id")
    .eq("company_id", options.companyId)
    .eq("status", "PENDIENTE")
    .limit(1);

  if ((pending?.length ?? 0) > 0) return 0;

  const rows = settings.followup_days.map((days, index) => ({
    company_id: options.companyId,
    thread_id: options.threadId ?? null,
    campaign_id: options.campaignId ?? null,
    sequence_step: index + 1,
    scheduled_for: new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
    status: "PENDIENTE",
  }));

  if (rows.length === 0) return 0;

  await supabase.from("sales_followups").insert(rows);
  await logSalesEvent({
    companyId: options.companyId,
    type: SALES_EVENT_TYPES.FOLLOWUP_SCHEDULED,
    title: `${rows.length} seguimientos programados`,
    detail: `Días: ${settings.followup_days.join(", ")}`,
    actor: "SYSTEM",
  });

  return rows.length;
}

export type FollowupCheck = { shouldSend: boolean; reason: string };

/**
 * Verifica, justo antes de enviar, que el seguimiento siga teniendo sentido.
 * Es la regla fundamental del encargo: se revalida todo en el momento del envío,
 * no en el de la programación.
 */
export async function shouldSendFollowup(followupId: string): Promise<FollowupCheck> {
  const { supabase } = createSupabaseServerClient();

  const { data: followup } = await supabase
    .from("sales_followups")
    .select("id, company_id, thread_id, sequence_step, status, scheduled_for")
    .eq("id", followupId)
    .maybeSingle();

  if (!followup) return { shouldSend: false, reason: "El seguimiento no existe." };
  if (followup.status !== "PENDIENTE") {
    return { shouldSend: false, reason: `Ya está en estado ${followup.status}.` };
  }
  if (new Date(followup.scheduled_for) > new Date()) {
    return { shouldSend: false, reason: "Todavía no llega su fecha." };
  }

  const { data: company } = await supabase
    .from("sales_companies")
    .select("id, status, do_not_contact, email_invalid, primary_email, last_interaction_at")
    .eq("id", followup.company_id)
    .maybeSingle();

  if (!company) return { shouldSend: false, reason: "La empresa ya no existe." };
  if (company.do_not_contact) return { shouldSend: false, reason: "Pidió no ser contactada." };
  if (company.email_invalid) return { shouldSend: false, reason: "Su correo rebotó antes." };
  if (!company.primary_email) return { shouldSend: false, reason: "No tiene correo registrado." };
  if (TERMINAL_STATUSES.has(company.status)) {
    return { shouldSend: false, reason: `Está en estado ${company.status}.` };
  }
  if (ACTIVE_CONVERSATION_STATUSES.has(company.status)) {
    return { shouldSend: false, reason: `Hay conversación activa (${company.status}).` };
  }

  // ¿Respondió después de que se programó el seguimiento?
  const { data: inbound } = await supabase
    .from("sales_messages")
    .select("id, sent_at")
    .eq("company_id", followup.company_id)
    .eq("direction", "INBOUND")
    .order("sent_at", { ascending: false })
    .limit(1);

  if (inbound?.[0]?.sent_at) {
    const lastInbound = new Date(inbound[0].sent_at).getTime();
    const scheduledAt = new Date(followup.scheduled_for).getTime();
    // Cualquier respuesta anterior a la fecha prevista cancela el envío.
    if (lastInbound > scheduledAt - 30 * 24 * 60 * 60 * 1000) {
      return { shouldSend: false, reason: "El prospecto ya había respondido." };
    }
  }

  return { shouldSend: true, reason: "Corresponde enviar." };
}

/** Texto base del seguimiento cuando no se personaliza con IA. */
function buildFallbackFollowup(step: number, companyName: string): { subject: string; body: string } {
  const variants = [
    {
      subject: `Seguimiento · ${companyName}`,
      body: `Hola,\n\nTe escribí hace unos días por la propuesta de presencia web para ${companyName}. ¿Alcanzaste a revisarla?\n\nSi te sirve, puedo enviarte un par de ejemplos de proyectos similares o coordinar una llamada breve para resolver dudas.`,
    },
    {
      subject: `¿Seguimos adelante, ${companyName}?`,
      body: `Hola,\n\nQuedo atenta por si el proyecto sigue en pie. Si el momento no es el adecuado, dímelo sin problema y lo retomamos cuando corresponda.\n\nSi prefieres, puedo prepararte una propuesta acotada para partir por lo esencial.`,
    },
    {
      subject: `Último mensaje sobre tu proyecto web`,
      body: `Hola,\n\nEste es mi último correo para no seguir ocupando tu bandeja. Si más adelante retoman el proyecto, quedo disponible.\n\nCualquier cosa, respondes este mismo correo y lo vemos.`,
    },
  ];

  return variants[Math.min(step - 1, variants.length - 1)];
}

export type RunFollowupsResult = {
  evaluated: number;
  sent: number;
  cancelled: number;
  skipped: number;
  errors: number;
};

/**
 * Procesa los seguimientos vencidos. Pensado para ejecutarse desde un cron.
 */
export async function runDueFollowups(limit = 25): Promise<RunFollowupsResult> {
  const result: RunFollowupsResult = { evaluated: 0, sent: 0, cancelled: 0, skipped: 0, errors: 0 };
  const settings = await getSalesSettings();

  if (settings.zara_paused) {
    return result;
  }

  const { supabase } = createSupabaseServerClient();
  const { data: due } = await supabase
    .from("sales_followups")
    .select("id, company_id, thread_id, sequence_step")
    .eq("status", "PENDIENTE")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  for (const followup of due ?? []) {
    result.evaluated += 1;

    const check = await shouldSendFollowup(followup.id as string);
    if (!check.shouldSend) {
      await supabase
        .from("sales_followups")
        .update({ status: "CANCELADO", cancel_reason: check.reason })
        .eq("id", followup.id);

      await logSalesEvent({
        companyId: followup.company_id as string,
        type: SALES_EVENT_TYPES.FOLLOWUP_CANCELLED,
        title: `Seguimiento ${followup.sequence_step} cancelado`,
        detail: check.reason,
        actor: "SYSTEM",
      });
      result.cancelled += 1;
      continue;
    }

    const { data: company } = await supabase
      .from("sales_companies")
      .select("id, name, primary_email, detected_problem, recommended_service")
      .eq("id", followup.company_id)
      .maybeSingle();

    if (!company?.primary_email) {
      result.skipped += 1;
      continue;
    }

    // Texto base por código; se personaliza con IA solo si hay presupuesto.
    let { subject, body } = buildFallbackFollowup(
      Number(followup.sequence_step ?? 1),
      company.name as string,
    );

    const budget = await canRunAiTask("BULK");
    if (budget.allowed) {
      try {
        const context = await buildCompanyContext(company.id as string);
        const { personalizeFollowup } = await import("./zara-brain-followup");
        const personalized = await personalizeFollowup({
          companyId: company.id as string,
          step: Number(followup.sequence_step ?? 1),
          context,
        });
        if (personalized) {
          subject = personalized.subject;
          body = personalized.body;
        }
      } catch {
        // Si falla la personalización se usa el texto base: el seguimiento igual sale.
      }
    }

    const sent = await sendCommercialEmail({
      companyId: company.id as string,
      threadId: (followup.thread_id as string) ?? null,
      recipient: company.primary_email as string,
      subject,
      body,
      actor: undefined,
    });

    if (sent.ok) {
      await supabase
        .from("sales_followups")
        .update({ status: "ENVIADO", sent_at: new Date().toISOString() })
        .eq("id", followup.id);

      await logSalesEvent({
        companyId: company.id as string,
        type: SALES_EVENT_TYPES.FOLLOWUP_SENT,
        title: `Seguimiento ${followup.sequence_step} enviado`,
        detail: subject,
        actor: "ZARA",
      });
      result.sent += 1;
    } else {
      await supabase
        .from("sales_followups")
        .update({ status: "OMITIDO", cancel_reason: sent.error })
        .eq("id", followup.id);
      result.errors += 1;
    }
  }

  // Tras el último seguimiento sin respuesta, la empresa pasa a EN PAUSA.
  await pauseExhaustedProspects();

  return result;
}

/** Pasa a EN_PAUSA a quienes agotaron la secuencia sin responder. */
async function pauseExhaustedProspects() {
  const { supabase } = createSupabaseServerClient();

  const { data: candidates } = await supabase
    .from("sales_companies")
    .select("id")
    .eq("status", "CONTACTADO")
    .limit(100);

  for (const company of candidates ?? []) {
    const { data: pending } = await supabase
      .from("sales_followups")
      .select("id")
      .eq("company_id", company.id)
      .eq("status", "PENDIENTE")
      .limit(1);

    if ((pending?.length ?? 0) > 0) continue;

    const { data: sent } = await supabase
      .from("sales_followups")
      .select("id")
      .eq("company_id", company.id)
      .eq("status", "ENVIADO")
      .limit(1);

    if ((sent?.length ?? 0) === 0) continue;

    await supabase.from("sales_companies").update({ status: "EN_PAUSA" }).eq("id", company.id);
    await logSalesEvent({
      companyId: company.id as string,
      type: SALES_EVENT_TYPES.STATUS_CHANGED,
      title: "Estado: CONTACTADO → EN_PAUSA",
      detail: "Se agotó la secuencia de seguimientos sin respuesta.",
      actor: "SYSTEM",
    });
  }
}

// ---------------------------------------------------------------------------
// Oportunidades dormidas
// ---------------------------------------------------------------------------

export type DormantOpportunity = {
  id: string;
  name: string;
  contactName: string | null;
  status: string;
  potential: string;
  potentialValue: number | null;
  daysWithoutReply: number;
  lastInteractionAt: string | null;
};

/** Estados donde el silencio del cliente es una oportunidad en riesgo. */
const DORMANT_STATUSES = ["INTERESADO", "PRESUPUESTO_ENVIADO", "NEGOCIACION"];

export async function detectDormantOpportunities(): Promise<DormantOpportunity[]> {
  const settings = await getSalesSettings();
  const { supabase } = createSupabaseServerClient();

  const threshold = new Date(Date.now() - settings.dormant_days * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("sales_companies")
    .select("id, name, contact_name, status, potential, potential_value, last_interaction_at, dormant_notified_at")
    .in("status", DORMANT_STATUSES)
    .lt("last_interaction_at", threshold.toISOString())
    .eq("do_not_contact", false)
    .order("potential_value", { ascending: false, nullsFirst: false })
    .limit(50);

  const opportunities: DormantOpportunity[] = [];

  for (const row of data ?? []) {
    const last = row.last_interaction_at ? new Date(row.last_interaction_at) : null;
    const days = last ? Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000)) : 0;

    opportunities.push({
      id: row.id as string,
      name: row.name as string,
      contactName: (row.contact_name as string) ?? null,
      status: row.status as string,
      potential: row.potential as string,
      potentialValue: row.potential_value ? Number(row.potential_value) : null,
      daysWithoutReply: days,
      lastInteractionAt: (row.last_interaction_at as string) ?? null,
    });

    // Avisamos una sola vez por ciclo de silencio.
    const alreadyNotified = row.dormant_notified_at
      ? new Date(row.dormant_notified_at) > (last ?? new Date(0))
      : false;

    if (!alreadyNotified) {
      await supabase
        .from("sales_companies")
        .update({
          dormant_since: row.last_interaction_at,
          dormant_notified_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      await notifySalesEvent({
        priority: "ALTA",
        title: `Oportunidad requiere atención: ${row.name}`,
        detail: `${row.status} · potencial ${row.potential} · ${days} días sin respuesta${
          row.potential_value ? ` · $${Number(row.potential_value).toLocaleString("es-CL")}` : ""
        }`,
        companyId: row.id as string,
      });
    }
  }

  return opportunities;
}

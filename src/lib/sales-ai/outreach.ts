import "server-only";

import { getCompany, logSalesEvent } from "./repository";
import { SALES_EVENT_TYPES } from "./types";

/**
 * Primer contacto comercial. Es la pieza que permite que Zara inicie la
 * conversación: genera el mensaje, lo deja para aprobación y, una vez enviado,
 * programa la secuencia de seguimientos.
 */



export type OutreachDraft = { subject: string; body: string };

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
/**
 * Genera la vista previa del primer contacto.
 *
 * Delega en composeOutreach para que exista UNA sola ruta de redacción, con
 * json_schema estricto y el mismo control de calidad. Antes había un segundo
 * generador con json_object que podía producir correos que no pasaban el
 * control.
 */
export async function generateOutreach(companyId: string): Promise<{
  ok: boolean;
  draft?: OutreachDraft;
  usedAi: boolean;
  requiresReview?: boolean;
  reviewReason?: string;
  error?: string;
}> {
  const company = await getCompany(companyId);
  if (!company) return { ok: false, usedAi: false, error: "La empresa no existe." };

  const { composeOutreach } = await import("./composer");
  const composed = await composeOutreach(companyId);

  if (composed.ok && composed.content) {
    return {
      ok: true,
      usedAi: true,
      requiresReview: composed.requiresReview,
      reviewReason: composed.reviewReason,
      draft: { subject: composed.content.subject, body: composed.content.body_text },
    };
  }

  // Sin IA disponible se ofrece un borrador base para editar a mano; queda
  // marcado como pendiente de revisión porque no pasó el control de calidad.
  return {
    ok: true,
    usedAi: false,
    requiresReview: true,
    reviewReason: composed.reviewReason ?? composed.error,
    draft: buildFallbackOutreach(company),
  };
}

export type OutreachSendResult = {
  ok: boolean;
  error?: string;
  /** Hora asignada por la cola. El envío ocurre después, de a uno. */
  scheduledAt?: string;
};

/**
 * Encola el primer contacto ya redactado y lo programa.
 * No envía: el despacho lo hace el trabajador de la cola, de a uno.
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

  const { enqueueSend, scheduleQueueItem } = await import("./queue");

  const enqueued = await enqueueSend({
    companyId: input.companyId,
    kind: "PRIMER_CONTACTO",
    recipientEmail: company.primary_email,
    subject: input.subject,
    body: input.body,
    readyToSchedule: true,
    createdBy: input.actor,
  });

  if (!enqueued.ok || !enqueued.id) {
    return { ok: false, error: enqueued.error ?? "No se pudo encolar." };
  }

  const scheduled = await scheduleQueueItem(enqueued.id, { reviewedBy: input.actor });
  if (!scheduled.ok) return { ok: false, error: scheduled.error };

  await logSalesEvent({
    companyId: input.companyId,
    type: SALES_EVENT_TYPES.DRAFT_APPROVED,
    title: "Primer contacto aprobado y programado",
    detail: `${input.subject} · sale el ${new Date(scheduled.scheduledAt!).toLocaleString("es-CL")}`,
    actor: input.actor,
    isAutomated: false,
  });

  return { ok: true, scheduledAt: scheduled.scheduledAt };
}

// ---------------------------------------------------------------------------
// Contacto masivo
// ---------------------------------------------------------------------------

export type BulkOutreachResult = {
  attempted: number;
  sent: number;
  skipped: Array<{ companyId: string; name: string; reason: string }>;
  errors: Array<{ companyId: string; name: string; error: string }>;
};

/**
 * Contacta una tanda de prospectos. Cada uno se redacta por separado con sus
 * propios datos, para no mandar el mismo texto a todos.
 *
 * Respeta las mismas barreras que el envío individual: pausa, opt-out, rebotes,
 * modo prueba y límites por día y por hora. El límite se comprueba en cada
 * envío, así que la tanda se detiene sola al alcanzarlo.
 */
/**
 * Encola una tanda de prospectos.
 *
 * Ya NO envía en el momento: cada prospecto entra en la cola y su hora se
 * asigna de forma espaciada y aleatoria. Enviar en bucle fue exactamente lo
 * que produjo la ráfaga rechazada por Microsoft.
 */
export async function sendBulkOutreach(input: {
  companyIds: string[];
  actor: string;
}): Promise<BulkOutreachResult> {
  const { enqueueSend } = await import("./queue");

  const result: BulkOutreachResult = {
    attempted: 0,
    sent: 0,
    skipped: [],
    errors: [],
  };

  for (const companyId of input.companyIds) {
    result.attempted += 1;

    const company = await getCompany(companyId);
    if (!company) {
      result.skipped.push({ companyId, name: companyId, reason: "No existe." });
      continue;
    }
    if (company.do_not_contact) {
      result.skipped.push({ companyId, name: company.name, reason: "Pidió no ser contactada." });
      continue;
    }
    if (company.email_invalid) {
      result.skipped.push({ companyId, name: company.name, reason: "Su correo rebotó antes." });
      continue;
    }
    if (!company.primary_email) {
      result.skipped.push({ companyId, name: company.name, reason: "Sin correo registrado." });
      continue;
    }
    if (["CONTACTADO", "RESPONDIO", "INTERESADO", "NEGOCIACION", "GANADO"].includes(company.status)) {
      result.skipped.push({
        companyId,
        name: company.name,
        reason: `Ya está en estado ${company.status}.`,
      });
      continue;
    }

    const enqueued = await enqueueSend({
      companyId,
      kind: "PRIMER_CONTACTO",
      recipientEmail: company.primary_email,
      createdBy: input.actor,
    });

    if (enqueued.ok) {
      // "sent" aquí significa encolado: nada sale todavía.
      result.sent += 1;
    } else {
      result.errors.push({ companyId, name: company.name, error: enqueued.error ?? "No se pudo encolar." });
    }
  }

  return result;
}

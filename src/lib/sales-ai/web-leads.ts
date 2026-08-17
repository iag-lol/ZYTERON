import "server-only";

import { createCompany, findDuplicate, logSalesEvent, updateCompany } from "./repository";
import { notifySalesEvent } from "./notifications";
import { SALES_EVENT_TYPES } from "./types";

/**
 * Puente entre los formularios públicos de zyteron.cl y el CRM.
 *
 * Se invoca DESPUÉS de que el formulario guardó su lead como siempre, y nunca
 * lanza: si el CRM falla, el formulario original no se ve afectado.
 */

export type WebLeadInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  service?: string | null;
  message?: string | null;
  /** Identificador del lead en la tabla original, para trazabilidad. */
  leadId?: string | null;
  formOrigin: string;
};

export type WebLeadResult = {
  ok: boolean;
  companyId?: string;
  created?: boolean;
  error?: string;
};

/**
 * Los leads web tienen prioridad sobre la prospección fría: llegan como
 * INTERESADO y con potencial POTENCIAL, porque el contacto lo inició el cliente.
 */
export async function registerWebLead(input: WebLeadInput): Promise<WebLeadResult> {
  try {
    const email = input.email?.trim() || null;
    const companyName = input.company?.trim() || input.name?.trim() || email?.split("@")[0] || null;

    if (!companyName) {
      return { ok: false, error: "El lead no trae nombre ni empresa." };
    }

    const duplicate = await findDuplicate({
      email,
      name: companyName,
      phone: input.phone,
    });

    const noteLine = [
      `[${new Date().toISOString().slice(0, 10)}] ${input.formOrigin}`,
      input.service ? `Servicio: ${input.service}` : null,
      input.message ? `Mensaje: ${input.message.slice(0, 500)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    if (duplicate) {
      const company = duplicate.company;

      // No degradamos un estado más avanzado ni reactivamos a quien pidió baja.
      const shouldUpgrade = ["NUEVO", "INVESTIGADO", "CONTACTADO", "EN_PAUSA"].includes(company.status);

      await updateCompany(
        company.id,
        {
          ...(shouldUpgrade && !company.do_not_contact ? { status: "INTERESADO" as const } : {}),
          last_interaction_at: new Date().toISOString(),
          notes: [company.notes, noteLine].filter(Boolean).join("\n"),
          ...(input.phone && !company.phone ? { phone: input.phone } : {}),
          ...(input.name && !company.contact_name ? { contact_name: input.name } : {}),
          ...(input.leadId ? { linked_lead_id: input.leadId } : {}),
        },
        { actor: "WEB", reason: `Nuevo contacto desde ${input.formOrigin}` },
      );

      await logSalesEvent({
        companyId: company.id,
        type: SALES_EVENT_TYPES.NOTE_ADDED,
        title: `Nuevo contacto web (${input.formOrigin})`,
        detail: noteLine,
        actor: "WEB",
      });

      await notifySalesEvent({
        priority: "ALTA",
        title: `Contacto web de ${company.name}`,
        detail: `${input.service ?? "Consulta"} · ${input.name ?? email ?? ""} · ya existía en el CRM`,
        companyId: company.id,
      });

      return { ok: true, companyId: company.id, created: false };
    }

    const company = await createCompany(
      {
        name: companyName,
        primary_email: email,
        phone: input.phone ?? null,
        contact_name: input.name ?? null,
        recommended_service: input.service ?? null,
        detected_problem: input.message?.slice(0, 500) ?? null,
        notes: noteLine,
        source: "WEB_ZYTERON",
        status: "INTERESADO",
        potential: "POTENCIAL",
        last_interaction_at: new Date().toISOString(),
        linked_lead_id: input.leadId ?? null,
      },
      {
        actor: "WEB",
        eventType: SALES_EVENT_TYPES.COMPANY_CREATED,
        eventTitle: `Lead web desde ${input.formOrigin}`,
      },
    );

    await notifySalesEvent({
      priority: "ALTA",
      title: `NUEVO CONTACTO WEB: ${companyName}`,
      detail: [
        input.name ? `Nombre: ${input.name}` : null,
        input.service ? `Servicio: ${input.service}` : null,
        email ? `Email: ${email}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      companyId: company.id,
    });

    return { ok: true, companyId: company.id, created: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error al registrar el lead web." };
  }
}

/**
 * Envoltura segura para llamar desde las rutas de formularios existentes.
 * Nunca propaga errores: el formulario público debe responder igual aunque el
 * CRM esté caído o la migración no se haya ejecutado.
 */
export function registerWebLeadSafe(input: WebLeadInput): void {
  void registerWebLead(input).catch(() => {
    // Silencioso por diseño: el lead original ya quedó guardado.
  });
}

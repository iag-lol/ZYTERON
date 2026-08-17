import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findOrCreateClientByEmail } from "@/lib/admin/repository";
import { getCompany, logSalesEvent } from "./repository";
import { notifySalesEvent } from "./notifications";
import { SALES_EVENT_TYPES, type LostReason } from "./types";

/**
 * Cierre comercial: conversión de un prospecto ganado en cliente del módulo
 * existente, y registro de pérdidas con motivo.
 *
 * Reutiliza findOrCreateClientByEmail para NO duplicar clientes: si el correo
 * ya existe en la tabla User, se vincula en vez de crear uno nuevo.
 */

export type WinResult = {
  ok: boolean;
  clientId?: string;
  created?: boolean;
  error?: string;
};

export async function markCompanyAsWon(input: {
  companyId: string;
  service?: string | null;
  amount?: number | null;
  proposalId?: string | null;
  actor: string;
}): Promise<WinResult> {
  const company = await getCompany(input.companyId);
  if (!company) return { ok: false, error: "La empresa no existe." };

  if (!company.primary_email) {
    return {
      ok: false,
      error: "La empresa no tiene correo registrado; no se puede crear ni vincular el cliente.",
    };
  }

  const { supabase } = createSupabaseServerClient();

  try {
    // Si ya estaba vinculada a un cliente, se respeta el vínculo existente.
    let clientId = company.linked_client_id ?? undefined;
    let created = false;

    if (!clientId) {
      const client = await findOrCreateClientByEmail({
        name: company.name,
        email: company.primary_email,
        company: company.legal_name || company.name,
        phone: company.phone,
        city: company.commune,
        rut: company.tax_id,
        contactName: company.contact_name,
      });

      clientId = (client as { id?: string })?.id;
      created = Boolean((client as { created?: boolean })?.created ?? !company.linked_client_id);
    }

    if (!clientId) {
      return { ok: false, error: "No se pudo crear ni encontrar el cliente en el módulo de Clientes." };
    }

    await supabase
      .from("sales_companies")
      .update({
        status: "GANADO",
        linked_client_id: clientId,
        closed_at: new Date().toISOString(),
        potential_value: input.amount ?? company.potential_value,
        recommended_service: input.service ?? company.recommended_service,
      })
      .eq("id", input.companyId);

    if (input.proposalId) {
      await supabase
        .from("sales_proposals")
        .update({ status: "ACEPTADO", responded_at: new Date().toISOString() })
        .eq("id", input.proposalId);
    }

    // Al ganar no se insiste más.
    await supabase
      .from("sales_followups")
      .update({ status: "CANCELADO", cancel_reason: "Oportunidad ganada" })
      .eq("company_id", input.companyId)
      .eq("status", "PENDIENTE");

    await logSalesEvent({
      companyId: input.companyId,
      type: SALES_EVENT_TYPES.WON,
      title: "Oportunidad GANADA",
      detail: [
        input.service ? `Servicio: ${input.service}` : null,
        input.amount ? `Valor: $${input.amount.toLocaleString("es-CL")}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      actor: input.actor,
      isAutomated: false,
    });

    await logSalesEvent({
      companyId: input.companyId,
      type: SALES_EVENT_TYPES.CLIENT_LINKED,
      title: created ? "Cliente creado en Zyteron" : "Vinculado a cliente existente",
      detail: `Origen: ZARA · id ${clientId}`,
      actor: input.actor,
      isAutomated: false,
    });

    await notifySalesEvent({
      priority: "ALTA",
      title: `Venta cerrada: ${company.name}`,
      detail: input.amount ? `$${input.amount.toLocaleString("es-CL")}` : "Sin monto registrado",
      companyId: input.companyId,
    });

    return { ok: true, clientId, created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al convertir en cliente.";
    await logSalesEvent({
      companyId: input.companyId,
      type: SALES_EVENT_TYPES.ERROR,
      title: "Fallo al convertir en cliente",
      detail: message,
      actor: input.actor,
      isAutomated: false,
    });
    return { ok: false, error: message };
  }
}

export async function markCompanyAsLost(input: {
  companyId: string;
  reason: LostReason;
  comment?: string | null;
  actor: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = createSupabaseServerClient();

  try {
    await supabase
      .from("sales_companies")
      .update({
        status: "PERDIDO",
        lost_reason: input.reason,
        lost_comment: input.comment ?? null,
        closed_at: new Date().toISOString(),
      })
      .eq("id", input.companyId);

    await supabase
      .from("sales_followups")
      .update({ status: "CANCELADO", cancel_reason: "Oportunidad perdida" })
      .eq("company_id", input.companyId)
      .eq("status", "PENDIENTE");

    await logSalesEvent({
      companyId: input.companyId,
      type: SALES_EVENT_TYPES.LOST,
      title: `Oportunidad PERDIDA · ${input.reason}`,
      detail: input.comment ?? null,
      actor: input.actor,
      isAutomated: false,
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error al marcar como perdida." };
  }
}

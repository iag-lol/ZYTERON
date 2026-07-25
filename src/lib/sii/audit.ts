import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Registro de auditoría inmutable para el módulo tributario. Escribe en
 * tax_audit_logs (service role). Nunca lanza: la auditoría no debe romper la
 * operación principal, pero sí debe intentarse siempre.
 */

export type AuditEntry = {
  userId?: string | null;
  ip?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  result?: string | null;
  reason?: string | null;
  correlationId?: string | null;
};

export async function writeTaxAudit(entry: AuditEntry): Promise<void> {
  try {
    const { supabase } = createSupabaseServerClient();
    await supabase.schema("public").from("tax_audit_logs").insert({
      user_id: entry.userId ?? null,
      ip: entry.ip ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      before_value: entry.before ?? null,
      after_value: entry.after ?? null,
      result: entry.result ?? null,
      reason: entry.reason ?? null,
      correlation_id: entry.correlationId ?? null,
    });
  } catch (err) {
    console.error("[tax-audit] no se pudo registrar auditoría:", err);
  }
}

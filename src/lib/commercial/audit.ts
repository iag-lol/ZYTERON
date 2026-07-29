import { commercialDb } from "@/lib/commercial/store";

/**
 * Trazabilidad del área comercial.
 *
 * - `commercial_audit_log`: quién hizo qué, sobre qué entidad y cuándo.
 *   Lo consulta administración (vista completa) y el propio ejecutivo
 *   (solo los eventos asociados a su cuenta).
 * - `commercial_notifications`: avisos internos que el ejecutivo ve en su
 *   portal (evaluaciones, liquidaciones emitidas, pagos, cambios de ficha).
 *
 * Nada aquí interrumpe la operación: si falla el registro de auditoría, la
 * acción principal ya se completó y solo se ignora el evento.
 */

export type AuditEntity = "user" | "lead" | "commission" | "statement" | "contract";

export type AuditEntry = {
  id: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  entity: string;
  entity_id: string | null;
  entity_label: string | null;
  action: string;
  summary: string;
  meta: Record<string, unknown> | null;
  owner_id: string | null;
  created_at: string;
};

const AUDIT_COLS =
  "id,actor_type,actor_id,actor_name,entity,entity_id,entity_label,action,summary,meta,owner_id,created_at";

export async function recordAudit(input: {
  actorType?: "admin" | "commercial" | "system";
  actorId?: string | null;
  actorName?: string | null;
  entity: AuditEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  action: string;
  summary: string;
  meta?: Record<string, unknown> | null;
  ownerId?: string | null;
}): Promise<void> {
  try {
    await commercialDb()
      .from("commercial_audit_log")
      .insert({
        actor_type: input.actorType ?? "admin",
        actor_id: input.actorId ?? null,
        actor_name: input.actorName ?? null,
        entity: input.entity,
        entity_id: input.entityId ?? null,
        entity_label: input.entityLabel?.slice(0, 200) ?? null,
        action: input.action,
        summary: input.summary.slice(0, 1000),
        meta: input.meta ?? null,
        owner_id: input.ownerId ?? null,
      });
  } catch {
    // La auditoría nunca debe bloquear la acción del usuario.
  }
}

/** Bitácora completa (admin). Opcionalmente filtrada por entidad o ejecutivo. */
export async function listAuditLog(filter?: {
  entity?: AuditEntity;
  entityId?: string;
  ownerId?: string;
  limit?: number;
}): Promise<AuditEntry[]> {
  let query = commercialDb()
    .from("commercial_audit_log")
    .select(AUDIT_COLS)
    .order("created_at", { ascending: false })
    .limit(filter?.limit ?? 100);
  if (filter?.entity) query = query.eq("entity", filter.entity);
  if (filter?.entityId) query = query.eq("entity_id", filter.entityId);
  if (filter?.ownerId) query = query.eq("owner_id", filter.ownerId);
  const { data } = await query;
  return (data as AuditEntry[]) ?? [];
}

// -- Notificaciones del portal comercial ------------------------------------

export type CommercialNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const NOTIFICATION_COLS = "id,kind,title,body,link,read_at,created_at";

export async function notifyCommercialUser(input: {
  ownerId: string;
  kind?: "info" | "success" | "warning" | "payment" | "evaluation";
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  try {
    await commercialDb().from("commercial_notifications").insert({
      owner_id: input.ownerId,
      kind: input.kind ?? "info",
      title: input.title.slice(0, 200),
      body: input.body?.slice(0, 1000) ?? null,
      link: input.link ?? null,
    });
  } catch {
    // Un aviso perdido no debe romper la operación que lo originó.
  }
}

export async function listNotifications(
  ownerId: string,
  limit = 30,
): Promise<{ notifications: CommercialNotification[]; unread: number }> {
  const { data } = await commercialDb()
    .from("commercial_notifications")
    .select(NOTIFICATION_COLS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const notifications = (data as CommercialNotification[]) ?? [];
  return {
    notifications,
    unread: notifications.filter((item) => !item.read_at).length,
  };
}

export async function markNotificationsRead(ownerId: string, id?: string): Promise<void> {
  let query = commercialDb()
    .from("commercial_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .is("read_at", null);
  if (id) query = query.eq("id", id);
  await query;
}

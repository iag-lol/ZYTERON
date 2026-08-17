import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSalesEvent } from "./repository";
import { SALES_EVENT_TYPES } from "./types";

/**
 * Notificaciones del módulo comercial. Se guardan como eventos con actor
 * NOTIFICACION para que el feed del admin las levante junto al resto, sin
 * necesitar una tabla ni un canal nuevo.
 */

export type NotifyInput = {
  priority: "ALTA" | "NORMAL";
  title: string;
  detail?: string;
  companyId?: string | null;
  link?: string;
};

export async function notifySalesEvent(input: NotifyInput): Promise<void> {
  await logSalesEvent({
    companyId: input.companyId ?? null,
    type: SALES_EVENT_TYPES.NOTIFICATION_SENT,
    title: input.title,
    detail: input.detail ?? null,
    actor: "NOTIFICACION",
    isAutomated: true,
    payload: {
      priority: input.priority,
      link: input.link ?? (input.companyId ? `/admin/ventas-ia/prospectos/${input.companyId}` : "/admin/ventas-ia"),
    },
  });
}

export type SalesNotification = {
  id: number;
  title: string;
  detail: string | null;
  priority: string;
  link: string;
  companyId: string | null;
  createdAt: string;
};

/** Notificaciones recientes del módulo, para el panel y el feed del admin. */
export async function getSalesNotifications(limit = 25): Promise<SalesNotification[]> {
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_events")
      .select("id, company_id, title, detail, payload, created_at")
      .eq("event_type", SALES_EVENT_TYPES.NOTIFICATION_SENT)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => {
      const payload = (row.payload ?? {}) as { priority?: string; link?: string };
      return {
        id: row.id as number,
        title: row.title as string,
        detail: (row.detail as string) ?? null,
        priority: payload.priority ?? "NORMAL",
        link: payload.link ?? "/admin/ventas-ia",
        companyId: (row.company_id as string) ?? null,
        createdAt: row.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

import "server-only";
import type { Prisma } from "@prisma/client";
export async function portalModulePermissions(db: Prisma.TransactionClient) {
  const exists = await db.$queryRaw<
    Array<{ available: boolean }>
  >`SELECT to_regclass('public.client_portal_settings') IS NOT NULL AS available`;
  const defaultFlags = {
    enabled: true,
    projects: true,
    documents: true,
    invoices: true,
    tickets: true,
    monitoring: true,
    audits: true,
  };
  if (!exists[0]?.available) return defaultFlags;
  const row = (
    await db.$queryRaw<
      Array<{
        enabled: boolean;
        projects_visible: boolean;
        documents_visible: boolean;
        invoices_visible: boolean;
        tickets_visible: boolean;
        monitoring_visible: boolean;
        audits_visible: boolean;
      }>
    >`SELECT enabled,projects_visible,documents_visible,invoices_visible,tickets_visible,monitoring_visible,audits_visible FROM client_portal_settings LIMIT 1`
  )[0];
  if (!row) return defaultFlags;
  return {
    enabled: row.enabled,
    projects: row.projects_visible,
    documents: row.documents_visible,
    invoices: row.invoices_visible,
    tickets: row.tickets_visible,
    monitoring: row.monitoring_visible,
    audits: row.audits_visible,
  };
}

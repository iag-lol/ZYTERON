import "server-only";
import { clientDatabase } from "./scoped-db";
import { portalModulePermissions } from "./module-permissions";
export type PortalModule =
  | "projects"
  | "documents"
  | "invoices"
  | "tickets"
  | "monitoring"
  | "audits";
export async function portalModuleEnabled(userId: string, module: PortalModule | null = null) {
  try { return await clientDatabase(userId, async (db) => {
    const available = await db.$queryRaw<
      Array<{ available: boolean }>
    >`SELECT to_regprocedure('public.zyteron_portal_module_enabled(text)') IS NOT NULL AS available`;
    if (available[0]?.available) {
      const rows = await db.$queryRaw<
        Array<{ enabled: boolean }>
      >`SELECT public.zyteron_portal_module_enabled(${module}) AS enabled`;
      return rows[0]?.enabled === true;
    }
    const host = new URL(process.env.DATABASE_URL || "postgres://invalid").hostname;
    if (!["127.0.0.1", "localhost", "[::1]"].includes(host))
      throw new Error("PORTAL_POLICY_UNAVAILABLE");
    const flags = await portalModulePermissions(db);
    return flags.enabled && (module === null || flags[module]);
  }); } catch (error) {
    if(error instanceof Error && error.message === "PORTAL_ACCESS_DENIED") return false;
    throw new Error("No fue posible verificar el acceso al módulo.");
  }
}

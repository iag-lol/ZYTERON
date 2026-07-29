import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { getTeamOverview } from "@/lib/commercial/analytics";
import { listAuditLog } from "@/lib/commercial/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Panel consolidado del área comercial: equipo, embudo, finanzas y trazabilidad. */
export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const [overview, audit] = await Promise.all([getTeamOverview(), listAuditLog({ limit: 60 })]);
  return NextResponse.json({ ...overview, audit });
}

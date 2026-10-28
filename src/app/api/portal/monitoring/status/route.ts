import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { clientMonitoringHistory } from "@/lib/portal/monitoring-history";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado." }, { status: 401, headers });
  try {
    const data = await clientMonitoringHistory(session.user.id);
    return NextResponse.json({ ...data, monitors: data.sites }, { headers });
  } catch (error) {
    const disabled = error instanceof Error && error.message === "PORTAL_MONITORING_DISABLED";
    return NextResponse.json(
      {
        error: disabled
          ? "El monitoreo no está habilitado para tu cuenta."
          : "No se pudo consultar el monitoreo.",
      },
      { status: disabled ? 403 : 503, headers },
    );
  }
}

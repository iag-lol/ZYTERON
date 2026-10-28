import Link from "next/link";
import Portal from "./portal";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { connectedPortalSnapshot } from "@/lib/client-experience/snapshot";
import { clientMonitoringHistory } from "@/lib/portal/monitoring-history";
import "./portal.css";
import "./monitoring-panel.css";
export async function FullPortalView({ section = "inicio" }: { section?: string }) {
  const session = await requirePortalSession();
  let data;
  try {
    data = await connectedPortalSnapshot(session.user.id);
  } catch (error) {
    if (
      error instanceof Error &&
      ["PORTAL_DISABLED", "PORTAL_ACCESS_DENIED"].includes(error.message)
    )
      return (
        <div className="zy-full-portal">
          <main className="panel portal-communications">
            <h1>Tu portal está temporalmente deshabilitado.</h1>
            <p>Contacta al equipo de Zyteron para revisar el acceso de tu cuenta.</p>
            <Link href="/">Volver a Zyteron</Link>
          </main>
        </div>
      );
    throw error;
  }
  const initialMonitoring =
    section === "monitoreo"
      ? await clientMonitoringHistory(session.user.id).catch(() => undefined)
      : undefined;
  return (
    <div className="zy-full-portal">
      <Portal data={data} initialSection={section} initialMonitoring={initialMonitoring} />
    </div>
  );
}

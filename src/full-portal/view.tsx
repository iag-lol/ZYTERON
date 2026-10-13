import Portal from "./portal";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { connectedPortalSnapshot } from "@/lib/client-experience/snapshot";
import "./portal.css";
export async function FullPortalView({ section = "inicio" }: { section?: string }) {
  const session = await requirePortalSession();
  const data = await connectedPortalSnapshot(session.user.id);
  return (
    <div className="zy-full-portal">
      <Portal data={data} initialSection={section} />
    </div>
  );
}

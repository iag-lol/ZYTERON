import Portal from "./portal";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { connectedPortalSnapshot } from "@/lib/client-experience/snapshot";
export async function ConnectedPortalView({ section = "inicio" }: { section?: string }) {
  const session = await requirePortalSession();
  const data = await connectedPortalSnapshot(session.user.id);
  return <Portal data={data} initialSection={section} />;
}

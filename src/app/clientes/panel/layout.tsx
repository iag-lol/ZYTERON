import { requirePortalSession } from "@/lib/auth/portal-session";
import { clientDatabase } from "@/lib/portal/scoped-db";
import { ExperienceShell } from "@/components/client-experience/experience-shell";
export const dynamic = "force-dynamic";
export default async function PortalPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalSession();
  const [user, unreadCount] = await clientDatabase(session.user.id, (db) =>
    Promise.all([
      db.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, company: true, role: true },
      }),
      db.clientNotification.count({ where: { userId: session.user.id, isRead: false } }),
    ]),
  );
  return (
    <ExperienceShell
      name={user?.name || session.user.name || "Cliente"}
      company={user?.company || ""}
      unreadCount={unreadCount}
      isAdmin={user?.role === "ADMIN" || user?.role === "SUPERADMIN"}
    >
      {children}
    </ExperienceShell>
  );
}

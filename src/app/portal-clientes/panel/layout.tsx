import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { PortalPanelShell } from "@/components/portal/panel/portal-panel-shell";

export default async function PortalPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalSession();
  const unreadCount = await prisma.clientNotification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return (
    <PortalPanelShell
      heading="Portal de Clientes"
      subheading="Gestión privada de servicios, documentos y soporte."
      userLabel={session.user.name || session.user.email || "Cliente"}
      unreadCount={unreadCount}
    >
      {children}
    </PortalPanelShell>
  );
}


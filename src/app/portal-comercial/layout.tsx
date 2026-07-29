import type { Metadata } from "next";
import { requireCommercialUser } from "@/lib/commercial/session";
import { countOverdueFollowUps } from "@/lib/commercial/analytics";
import { listLeadsByOwner } from "@/lib/commercial/store";
import { CommercialPortalShell } from "@/components/commercial/portal-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal Comercial · Zyteron",
  robots: { index: false, follow: false },
};

export default async function PortalComercialLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCommercialUser();
  const leads = await listLeadsByOwner(user.id);
  // Badge de la agenda: compromisos de contacto ya vencidos.
  const pendingBadge = countOverdueFollowUps(leads);

  return (
    <CommercialPortalShell
      user={{ name: user.name, rut: user.rut, role: user.role, position: user.position }}
      pendingBadge={pendingBadge}
    >
      {children}
    </CommercialPortalShell>
  );
}

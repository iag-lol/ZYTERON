import { requireCommercialUser } from "@/lib/commercial/session";
import { listAuditLog } from "@/lib/commercial/audit";
import { CommercialProfile } from "@/components/commercial/commercial-profile";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireCommercialUser();
  const audit = await listAuditLog({ ownerId: user.id, limit: 40 });
  return (
    <CommercialProfile
      user={{ ...user, commission_pct: Number(user.commission_pct) || 0 }}
      audit={audit.map((entry) => ({
        id: entry.id,
        actor_type: entry.actor_type,
        action: entry.action,
        summary: entry.summary,
        created_at: entry.created_at,
      }))}
    />
  );
}

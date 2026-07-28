import { requireCommercialUser } from "@/lib/commercial/session";
import { listCommissionsByOwner, listStatementsByOwner } from "@/lib/commercial/store";
import { CommercialPortalDashboard } from "@/components/commercial/commercial-portal-dashboard";

export const dynamic = "force-dynamic";

export default async function PortalComercialHome() {
  const user = await requireCommercialUser();
  const [commissions, statements] = await Promise.all([
    listCommissionsByOwner(user.id),
    listStatementsByOwner(user.id),
  ]);
  const commissionTotal = commissions.reduce(
    (sum, item) => sum + Number((item as { gross_amount?: number }).gross_amount ?? 0),
    0,
  );

  return (
    <CommercialPortalDashboard
      user={{
        id: user.id,
        name: user.name,
        rut: user.rut,
        email: user.email,
        phone: user.phone,
        role: user.role,
        commission_pct: Number(user.commission_pct) || 0,
        must_change_password: user.must_change_password,
      }}
      commissionTotal={commissionTotal}
      statementCount={statements.length}
    />
  );
}

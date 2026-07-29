import { requireCommercialUser } from "@/lib/commercial/session";
import { listLeadsByOwner } from "@/lib/commercial/store";
import { CommercialPortfolio } from "@/components/commercial/commercial-portfolio";

export const dynamic = "force-dynamic";

export default async function CarteraPage() {
  const user = await requireCommercialUser();
  const leads = await listLeadsByOwner(user.id);
  return <CommercialPortfolio initialLeads={leads} />;
}

import { requireCommercialUser } from "@/lib/commercial/session";
import { CommercialKnowledge } from "@/components/commercial/commercial-knowledge";

export const dynamic = "force-dynamic";

export default async function CentroConocimientoPage() {
  await requireCommercialUser();
  return <CommercialKnowledge />;
}

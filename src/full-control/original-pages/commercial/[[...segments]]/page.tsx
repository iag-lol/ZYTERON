import { CommercialWorkspace } from "@control/components/commercial/commercial-workspace";
import WhatsappPage from "@/app/administracion/(protected)/whatsapp/page";
const sections = new Set([
  "leads",
  "opportunities",
  "pipeline",
  "follow-ups",
  "quotes",
  "sales",
  "goals",
  "commissions",
  "handoffs",
]);
export default async function CommercialPage({
  params,
  searchParams,
}: {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<{
    clientId?: string;
    new?: string;
    conversation?: string;
    search?: string;
  }>;
}) {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams]);
  const segment = segments[0] ?? "command";
  if (segment === "whatsapp") return <WhatsappPage searchParams={Promise.resolve(query)} />;
  const section = (segment === "crm" || !sections.has(segment) ? "command" : segment) as Parameters<
    typeof CommercialWorkspace
  >[0]["section"];
  return (
    <CommercialWorkspace
      section={section}
      initialClientId={query.clientId || null}
      openNewQuote={section === "quotes" && query.new === "1"}
    />
  );
}

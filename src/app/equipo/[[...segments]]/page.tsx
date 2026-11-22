import { SalesExecutiveWorkspace } from "@control/components/commercial/sales-executive-workspace";
import { EnterpriseShell } from "@control/components/enterprise-shell";
import { CommercialWorkspace } from "@control/components/commercial/commercial-workspace";
import ClientsPage from "@control/original-pages/clients/[[...segments]]/page";
import ProjectsPage from "@control/original-pages/projects/[[...segments]]/page";
import { ModulePage } from "@control/components/module-page";
import { HrWorkspace } from "@control/components/hr/hr-workspace";
import { FinanceWorkspace } from "@control/components/finance/finance-workspace";
import { SecurityWorkspace } from "@control/components/security/security-workspace";
import { DocumentsWorkspace } from "@control/components/documents/documents-workspace";
import { SupportWorkspace } from "@control/components/support/support-workspace";
import { TeamHome } from "@control/components/team-home";
import { RoleGuard } from "@control/components/enterprise/access";
import { groupForPath } from "@control/lib/access-control";
import "@control/styles/globals.css";
import "@control/styles/settings.css";
import "@control/styles/hr.css";
import "@control/styles/finance.css";
import "@control/styles/security.css";
import "@control/styles/commercial.css";
import "@control/styles/operations.css";
import "@control/styles/documents.css";
import "@control/styles/support.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Acceso del equipo",
  robots: { index: false, follow: false },
  alternates: { canonical: "/equipo" },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<{ clientId?: string; new?: string }>;
}) {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams]);
  const [module, ...parts] = segments;
  let content: React.ReactNode = <ModulePage pathname={"/" + segments.join("/")} />;
  if (!module || module === "dashboard") content = <TeamHome />;
  else if (module === "commercial" && parts[0] === "workspace") content=<SalesExecutiveWorkspace key={parts[1]??"home"} section={parts[1]??"home"}/>;
  else if (module === "commercial" || module === "crm") {
    const sections = [
      "leads",
      "opportunities",
      "pipeline",
      "follow-ups",
      "quotes",
      "sales",
      "goals",
      "commissions",
      "handoffs",
    ];
    const section = (sections.includes(parts[0] ?? "") ? parts[0] : "command") as Parameters<
      typeof CommercialWorkspace
    >[0]["section"];
    content = (
      <CommercialWorkspace
        section={section}
        initialClientId={query.clientId || null}
        openNewQuote={section === "quotes" && query.new === "1"}
      />
    );
  } else if (module === "clients")
    content = <ClientsPage params={Promise.resolve({ segments: parts })} />;
  else if (module === "projects")
    content = (
      <ProjectsPage
        params={Promise.resolve({ segments: parts })}
        searchParams={Promise.resolve(query)}
      />
    );
  else if (module === "hr") content = <HrWorkspace segments={parts} />;
  else if (module === "finance") content = <FinanceWorkspace segments={parts} />;
  else if (module === "security") content = <SecurityWorkspace segments={parts} />;
  else if (module === "documents") content = <DocumentsWorkspace segments={parts} />;
  else if (module === "support") content = <SupportWorkspace segments={parts} />;
  return (
    <div className="zy-full-control">
      <EnterpriseShell>
        <RoleGuard group={groupForPath("/" + segments.join("/"))}>{content}</RoleGuard>
      </EnterpriseShell>
    </div>
  );
}

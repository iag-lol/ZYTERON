import { AccountingAuditorDashboard } from "@/components/admin/accounting-auditor-dashboard";
import { getAccountingDashboardData } from "@/lib/admin/accounting";

type PageProps = {
  searchParams?:
    | {
        period?: string;
      }
    | Promise<{
        period?: string;
      }>;
};

export default async function ContadorAuditorPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const data = await getAccountingDashboardData(query?.period);

  return <AccountingAuditorDashboard data={data} />;
}

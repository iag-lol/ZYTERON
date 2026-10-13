import { FinanceWorkspace } from "@control/components/finance/finance-workspace";
import "@control/styles/finance.css";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <FinanceWorkspace segments={segments} />; }

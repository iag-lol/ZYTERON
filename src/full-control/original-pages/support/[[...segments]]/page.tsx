import { SupportWorkspace } from "@control/components/support/support-workspace";
import "@control/styles/support.css";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <SupportWorkspace segments={segments} />; }

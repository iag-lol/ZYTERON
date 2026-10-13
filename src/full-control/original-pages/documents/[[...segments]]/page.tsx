import { DocumentsWorkspace } from "@control/components/documents/documents-workspace";
import "@control/styles/documents.css";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <DocumentsWorkspace segments={segments}/>; }

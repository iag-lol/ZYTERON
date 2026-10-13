import { RoleGuard } from "@control/components/enterprise/access";
import { SettingsWorkspace } from "@control/components/settings/settings-workspace";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <RoleGuard group="settings"><SettingsWorkspace segments={segments}/></RoleGuard>; }

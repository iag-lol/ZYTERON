import { redirect } from "next/navigation";
import { PortalAuthShell } from "@/components/portal/auth/portal-auth-shell";
import { PortalRegisterForm } from "@/components/portal/auth/register-form";
import { getPortalSession } from "@/lib/auth/portal-session";

export default async function PortalRegisterPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const session = await getPortalSession();
  if (session?.user?.id && session.user.emailVerifiedAt) {
    redirect("/clientes/panel");
  }

  return (
    <PortalAuthShell
      title="Activa tu cuenta."
      subtitle="Completa el acceso habilitado por el equipo de Zyteron para gestionar tus servicios."
    >
      <PortalRegisterForm googleEnabled={googleEnabled} />
    </PortalAuthShell>
  );
}

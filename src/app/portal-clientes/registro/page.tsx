import { redirect } from "next/navigation";
import { PortalAuthShell } from "@/components/portal/auth/portal-auth-shell";
import { PortalRegisterForm } from "@/components/portal/auth/register-form";
import { getPortalSession } from "@/lib/auth/portal-session";

export default async function PortalRegisterPage() {
  const session = await getPortalSession();
  if (session?.user?.id && session.user.emailVerifiedAt) {
    redirect("/portal-clientes/panel");
  }

  return (
    <PortalAuthShell
      title="Crear cuenta de cliente"
      subtitle="Registra tu acceso privado para gestionar tus servicios con Zyteron."
    >
      <PortalRegisterForm />
    </PortalAuthShell>
  );
}


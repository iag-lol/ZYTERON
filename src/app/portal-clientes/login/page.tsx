import { redirect } from "next/navigation";
import { PortalAuthShell } from "@/components/portal/auth/portal-auth-shell";
import { PortalLoginForm } from "@/components/portal/auth/login-form";
import { getPortalSession } from "@/lib/auth/portal-session";

export default async function PortalLoginPage() {
  const session = await getPortalSession();
  if (session?.user?.id && session.user.emailVerifiedAt) {
    redirect("/portal-clientes/panel");
  }

  return (
    <PortalAuthShell title="Iniciar sesión" subtitle="Accede con tu correo corporativo y contraseña segura.">
      <PortalLoginForm />
    </PortalAuthShell>
  );
}


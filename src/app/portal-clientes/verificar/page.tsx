import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PortalAuthShell } from "@/components/portal/auth/portal-auth-shell";
import { PortalVerifyEmailForm } from "@/components/portal/auth/verify-email-form";
import { getPortalSession } from "@/lib/auth/portal-session";

export default async function PortalVerifyPage() {
  const session = await getPortalSession();
  if (session?.user?.id && session.user.emailVerifiedAt) {
    redirect("/portal-clientes/panel");
  }

  return (
    <PortalAuthShell
      title="Verificar correo"
      subtitle="Ingresa el código enviado a tu correo para activar tu cuenta."
    >
      <Suspense fallback={<p className="text-sm text-slate-500">Cargando verificación...</p>}>
        <PortalVerifyEmailForm />
      </Suspense>
    </PortalAuthShell>
  );
}

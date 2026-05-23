import { Suspense } from "react";
import { PortalAuthShell } from "@/components/portal/auth/portal-auth-shell";
import { PortalResetPasswordForm } from "@/components/portal/auth/reset-password-form";

export default function PortalResetPasswordPage() {
  return (
    <PortalAuthShell
      title="Restablecer contraseña"
      subtitle="Ingresa el código recibido y define tu nueva contraseña."
    >
      <Suspense fallback={<p className="text-sm text-slate-500">Cargando formulario...</p>}>
        <PortalResetPasswordForm />
      </Suspense>
    </PortalAuthShell>
  );
}

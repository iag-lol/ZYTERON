import { PortalAuthShell } from "@/components/portal/auth/portal-auth-shell";
import { PortalForgotPasswordForm } from "@/components/portal/auth/forgot-password-form";

export default function PortalRecoverPage() {
  return (
    <PortalAuthShell
      title="Recuperar acceso"
      subtitle="Te enviaremos un código de recuperación para restablecer tu contraseña."
    >
      <PortalForgotPasswordForm />
    </PortalAuthShell>
  );
}


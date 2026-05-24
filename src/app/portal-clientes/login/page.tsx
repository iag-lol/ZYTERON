import { redirect } from "next/navigation";
import { PortalAuthShell } from "@/components/portal/auth/portal-auth-shell";
import { PortalLoginForm } from "@/components/portal/auth/login-form";
import { getPortalSession } from "@/lib/auth/portal-session";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  portal_schema:
    "Falta actualizar la base de datos del portal en producción. Ejecuta el SQL de portal y vuelve a intentar.",
  google_auth_failed:
    "No fue posible completar el acceso con Google. Intenta nuevamente en unos segundos.",
  account_not_active: "Tu cuenta está pendiente o desactivada. Contacta a soporte para habilitarla.",
  OAuthAccountNotLinked:
    "Este correo ya existe con otro método de acceso. Ingresa con contraseña o recupera acceso.",
  AccessDenied: "Acceso denegado por configuración de seguridad.",
  Configuration:
    "La autenticación de Google no está configurada correctamente en este entorno.",
};

type PortalLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PortalLoginPage({ searchParams }: PortalLoginPageProps) {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const query = (await searchParams) || {};
  const rawError = Array.isArray(query.error) ? query.error[0] : query.error;
  const initialError = rawError
    ? OAUTH_ERROR_MESSAGES[rawError] || "No fue posible completar la autenticación. Intenta nuevamente."
    : "";
  const session = await getPortalSession();
  if (session?.user?.id && session.user.emailVerifiedAt) {
    redirect("/portal-clientes/panel");
  }

  return (
    <PortalAuthShell title="Iniciar sesión" subtitle="Accede con tu correo corporativo y contraseña segura.">
      <PortalLoginForm googleEnabled={googleEnabled} initialError={initialError} />
    </PortalAuthShell>
  );
}

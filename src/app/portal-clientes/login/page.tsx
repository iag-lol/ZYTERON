import { redirect } from "next/navigation";
import { PortalAuthShell } from "@/components/portal/auth/portal-auth-shell";
import { PortalLoginForm } from "@/components/portal/auth/login-form";
import { getPortalSession } from "@/lib/auth/portal-session";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  portal_schema:
    "Falta actualizar la base de datos del portal en producción. Ejecuta el SQL de portal y vuelve a intentar.",
  portal_db_connection:
    "No hay conexión con la base de datos del portal en producción. Revisa DATABASE_URL en Render.",
  google_auth_failed:
    "No fue posible completar el acceso con Google. Intenta nuevamente en unos segundos.",
  google_not_registered:
    "Tu cuenta Google no está autorizada en el portal. Primero debes registrarte y verificar tu correo.",
  google_email_not_verified:
    "Tu cuenta de Google no tiene correo verificado. Verifica tu correo en Google e inténtalo de nuevo.",
  email_not_verified:
    "Tu cuenta existe, pero aún no está verificada. Completa la verificación por código para ingresar.",
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
    <PortalAuthShell
      title="Iniciar sesión"
      subtitle="Accede a tu portal privado de clientes con tu correo y contraseña."
    >
      <PortalLoginForm initialError={initialError} googleEnabled={true} />
    </PortalAuthShell>
  );
}

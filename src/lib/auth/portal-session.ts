import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { portalAuthOptions } from "@/lib/auth/portal-auth";

export async function getPortalSession() {
  try {
    return await getServerSession(portalAuthOptions);
  } catch (error) {
    const digest = typeof error === "object" && error && "digest" in error ? (error as { digest?: string }).digest : "";
    if (digest !== "DYNAMIC_SERVER_USAGE") {
      console.error("[portal/auth] No se pudo resolver la sesión del portal.", error);
    }
    return null;
  }
}

export async function requirePortalSession() {
  const session = await getPortalSession();
  if (!session?.user?.id) {
    redirect("/portal-clientes/login");
  }
  if (!session.user.emailVerifiedAt) {
    redirect("/portal-clientes/verificar");
  }
  if (session.user.accountStatus !== "ACTIVE") {
    redirect("/portal-clientes/login?status=disabled");
  }
  return session;
}

export async function requirePortalAdminSession() {
  const session = await requirePortalSession();
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN) {
    redirect("/portal-clientes/panel");
  }
  return session;
}

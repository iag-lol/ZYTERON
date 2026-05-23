import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/auth/portal-session";

export default async function PortalClientesPage() {
  const session = await getPortalSession();
  if (!session?.user?.id) {
    redirect("/portal-clientes/login");
  }
  if (!session.user.emailVerifiedAt) {
    redirect("/portal-clientes/verificar");
  }
  redirect("/portal-clientes/panel");
}


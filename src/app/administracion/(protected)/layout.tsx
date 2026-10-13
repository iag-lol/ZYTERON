import {EnterpriseShell} from "@control/components/enterprise-shell";
import {requirePortalAdminApiSession} from "@/lib/auth/portal-admin-api";
import {redirect} from "next/navigation";
import "@control/styles/globals.css";
import "@control/styles/settings.css";
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){
  const auth=await requirePortalAdminApiSession();
  if(auth.error)redirect("/administracion/login");
  const name=auth.legacy?"Administración":auth.session.user.name||"Administración";
  return <div className="zy-full-control"><EnterpriseShell verifiedIdentity={{name,role:"GERENTE_GENERAL"}}>{children}</EnterpriseShell></div>;
}

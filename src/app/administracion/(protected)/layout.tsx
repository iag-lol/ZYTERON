import {ControlShell} from "@/components/connected-control/shell";
import {assertAdmin} from "@/lib/auth/admin";
import "@/components/connected-control/control.css";
import "@/components/connected-control/connected.css";
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){await assertAdmin();return <div className="zy-control"><ControlShell>{children}</ControlShell></div>;}

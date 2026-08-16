import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/auth/admin-session";

/**
 * Exige una sesión administrativa firmada y vigente. Una cookie manipulada,
 * caducada o emitida con otro secreto no sirve.
 */
export async function assertAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!(await verifyAdminSessionToken(token))) {
    redirect("/admin/login");
  }
}

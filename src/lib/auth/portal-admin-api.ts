import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_VALUE, COOKIE_KEY } from "@/lib/auth/admin-constants";
import { portalAuthOptions } from "@/lib/auth/portal-auth";

export async function requirePortalAdminApiSession() {
  const cookieStore = await cookies();
  const legacyAdminToken = cookieStore.get(COOKIE_KEY)?.value;
  if (legacyAdminToken && legacyAdminToken === ADMIN_SESSION_VALUE) {
    return {
      session: {
        user: {
          id: "legacy-admin",
          role: Role.ADMIN,
        },
      },
      legacy: true as const,
    };
  }

  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }
  return { session, legacy: false as const };
}

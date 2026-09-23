import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/auth/admin-session";
import { isActiveVerifiedPortalAdmin } from "@/lib/auth/portal-admin-access";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { prisma } from "@/lib/prisma";

export async function requirePortalAdminApiSession() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_COOKIE)?.value;
  if (await verifyAdminSessionToken(adminToken)) {
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

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        accountStatus: true,
        emailVerifiedAt: true,
      },
    });

    if (!user || !isActiveVerifiedPortalAdmin(user)) {
      return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
    }
  } catch (error) {
    console.error("[portal/admin/auth] No fue posible validar la cuenta administrativa.", error);
    return {
      error: NextResponse.json(
        { error: "No fue posible validar la sesión administrativa." },
        { status: 503 },
      ),
    };
  }

  if (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }
  return { session, legacy: false as const };
}

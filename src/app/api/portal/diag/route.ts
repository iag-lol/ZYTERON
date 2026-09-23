import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return NextResponse.json(
      { ok: true, database: "connected" },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("[portal/diag] Database connectivity check failed.", error);
    return NextResponse.json(
      { ok: false, database: "unavailable" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

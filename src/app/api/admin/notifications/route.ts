import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { buildAdminNotificationFeed } from "@/lib/notifications/admin-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  try {
    return NextResponse.json(await buildAdminNotificationFeed(), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[admin-notifications] feed error:", error);
    return NextResponse.json(
      { error: "No fue posible cargar las notificaciones." },
      { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
}

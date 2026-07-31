import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { sendAdminPushNotification } from "@/lib/notifications/admin-web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const result = await sendAdminPushNotification({
    title: "Notificaciones Zyteron activadas",
    body: "Este dispositivo ya puede recibir avisos del panel en tiempo real.",
    href: "/admin",
    tag: `push-test-${Date.now()}`,
  });

  if (result.sent === 0) {
    return NextResponse.json(
      { error: result.skipped === "missing_vapid" ? "Faltan las claves VAPID del servidor." : "No hay dispositivos activos para la prueba.", result },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, result });
}

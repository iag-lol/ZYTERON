import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import {
  getOrCreateAdminPushConfig,
  listAdminPushSubscriptions,
  removeAdminPushSubscription,
  saveAdminPushSubscription,
} from "@/lib/notifications/admin-web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(20).max(1024),
    auth: z.string().min(8).max(512),
  }),
  deviceLabel: z.string().trim().max(120).optional(),
});

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const config = await getOrCreateAdminPushConfig();
  let activeDevices = 0;
  let storageReady = true;
  try {
    activeDevices = (await listAdminPushSubscriptions()).filter((subscription) => subscription.active).length;
  } catch (error) {
    storageReady = false;
    console.error("[admin-push] almacenamiento no disponible:", error);
  }

  return NextResponse.json(
    { configured: config.configured, publicKey: config.publicKey, activeDevices, storageReady },
    { headers: noStore },
  );
}

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const parsed = subscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Suscripción push inválida." }, { status: 400, headers: noStore });
  }
  const config = await getOrCreateAdminPushConfig();
  if (!config.configured) {
    return NextResponse.json({ error: "Web Push no está disponible en el servidor." }, { status: 503, headers: noStore });
  }

  const input = parsed.data;
  try {
    await saveAdminPushSubscription({
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      deviceLabel: input.deviceLabel || null,
      userAgent: req.headers.get("user-agent")?.slice(0, 500) || null,
    });
  } catch (error) {
    console.error("[admin-push] no se pudo guardar la suscripción:", error);
    return NextResponse.json({ error: "No se pudo registrar este dispositivo." }, { status: 503, headers: noStore });
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}

export async function DELETE(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const endpoint = z.string().url().max(4096).safeParse((await req.json().catch(() => null))?.endpoint);
  if (!endpoint.success) {
    return NextResponse.json({ error: "Endpoint inválido." }, { status: 400, headers: noStore });
  }
  await removeAdminPushSubscription(endpoint.data).catch(() => {});
  return NextResponse.json({ ok: true }, { headers: noStore });
}

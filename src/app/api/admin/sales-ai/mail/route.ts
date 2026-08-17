import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { isEncryptionConfigured } from "@/lib/sales-ai/crypto";
import {
  buildAuthorizeUrl,
  createSubscription,
  deleteSubscription,
  getMailAccount,
  isGraphConfigured,
  renewSubscription,
} from "@/lib/sales-ai/graph-client";
import { getSalesSettings, updateSalesSetting } from "@/lib/sales-ai/settings";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado de la conexión de correo, para el panel. */
export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const account = await getMailAccount();
  const settings = await getSalesSettings();

  const configured = isGraphConfigured();
  const status = !configured
    ? "NO_CONFIGURADO"
    : account?.last_error
      ? "ERROR"
      : account?.connected_at
        ? "CONECTADO"
        : "DESCONECTADO";

  return NextResponse.json({
    status,
    graphConfigured: Boolean(configured),
    encryptionConfigured: isEncryptionConfigured(),
    mailbox: account?.user_principal_name ?? settings.mailbox_address ?? null,
    displayName: account?.display_name ?? null,
    connectedAt: account?.connected_at ?? null,
    lastSyncAt: account?.last_sync_at ?? null,
    subscriptionId: account?.subscription_id ?? null,
    subscriptionExpiresAt: account?.subscription_expires_at ?? null,
    lastError: account?.last_error ?? null,
    authorizeUrl: configured ? buildAuthorizeUrl(randomBytes(16).toString("hex")) : null,
  });
}

/** Acciones sobre la suscripción de webhooks. */
export async function POST(request: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const actor = auth.legacy ? "admin" : (auth.session.user.id ?? "admin");

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  if (!isGraphConfigured()) {
    return NextResponse.json(
      { error: "Faltan variables de Microsoft Graph o SALES_AI_ENCRYPTION_KEY en el servidor." },
      { status: 400 },
    );
  }

  try {
    const account = await getMailAccount();

    if (body.action === "subscribe") {
      // El clientState valida que la notificación viene realmente de nuestra suscripción.
      const clientState = randomBytes(24).toString("hex");
      await updateSalesSetting("webhook_client_state" as never, clientState, actor);

      const notificationUrl = `${siteConfig.url}/api/sales-ai/webhook`;
      const subscription = await createSubscription(notificationUrl, clientState);

      return NextResponse.json({
        ok: true,
        subscriptionId: subscription.id,
        expiresAt: subscription.expirationDateTime,
      });
    }

    if (body.action === "renew") {
      if (!account?.subscription_id) {
        return NextResponse.json({ error: "No hay suscripción activa que renovar." }, { status: 400 });
      }
      const subscription = await renewSubscription(account.subscription_id);
      return NextResponse.json({ ok: true, expiresAt: subscription.expirationDateTime });
    }

    if (body.action === "unsubscribe") {
      if (!account?.subscription_id) {
        return NextResponse.json({ error: "No hay suscripción activa." }, { status: 400 });
      }
      await deleteSubscription(account.subscription_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error con Microsoft Graph.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

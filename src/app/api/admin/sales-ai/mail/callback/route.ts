import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { completeAuthorization, ensureSubscription } from "@/lib/sales-ai/graph-client";
import { updateSalesSetting } from "@/lib/sales-ai/settings";
import { logSalesEvent } from "@/lib/sales-ai/repository";
import { notifySalesEvent } from "@/lib/sales-ai/notifications";
import { SALES_EVENT_TYPES } from "@/lib/sales-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PANEL_PATH = "/admin/ventas-ia/configuracion";

/**
 * Las redirecciones se arman desde siteConfig.url y NO desde el origin de la
 * petición: detrás del proxy de Render, request.url llega como localhost y el
 * usuario terminaría en una URL inválida.
 */
function panelUrl(params: Record<string, string>): string {
  const url = new URL(PANEL_PATH, siteConfig.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * Callback de OAuth de Microsoft. Exige sesión de administrador: sin ella, un
 * tercero que conociera la URL podría intentar conectar su propio buzón.
 */
export async function GET(request: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const actor = auth.legacy ? "admin" : (auth.session.user.id ?? "admin");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(panelUrl({ mail_error: error.slice(0, 200) }));
  }

  if (!code) {
    return NextResponse.redirect(panelUrl({ mail_error: "Microsoft no devolvió el código." }));
  }

  try {
    const { email, name } = await completeAuthorization(code);

    if (email) {
      await updateSalesSetting("mailbox_address", email, actor);
    }

    await logSalesEvent({
      type: SALES_EVENT_TYPES.HUMAN_INTERVENTION,
      title: "Buzón de correo conectado",
      detail: `${name || "Cuenta"} (${email}) conectada por ${actor}.`,
      actor,
      isAutomated: false,
    });

    // La suscripción se crea de inmediato: sin ella no llegan los correos
    // entrantes y la conexión quedaría a medias.
    try {
      const subscription = await ensureSubscription({ actor });

      await logSalesEvent({
        type: SALES_EVENT_TYPES.HUMAN_INTERVENTION,
        title: subscription.renewed ? "Suscripción de correo renovada" : "Suscripción de correo creada",
        detail: `Vence el ${new Date(subscription.expiresAt).toLocaleString("es-CL")}.`,
        actor,
        isAutomated: false,
      });

      return NextResponse.redirect(panelUrl({ mail_connected: "1", webhook: "1" }));
    } catch (subscriptionError) {
      // El buzón sí quedó conectado: se informa el fallo puntual del webhook
      // para que se pueda reintentar desde el panel sin repetir el OAuth.
      const detail =
        subscriptionError instanceof Error
          ? subscriptionError.message
          : "No se pudo crear la suscripción.";

      await notifySalesEvent({
        priority: "ALTA",
        title: "Buzón conectado pero sin webhook",
        detail: `${detail}. Sin suscripción no llegarán los correos entrantes.`,
      });

      return NextResponse.redirect(
        panelUrl({ mail_connected: "1", webhook_error: detail.slice(0, 200) }),
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo completar la conexión.";
    return NextResponse.redirect(panelUrl({ mail_error: message.slice(0, 200) }));
  }
}

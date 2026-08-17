import { NextResponse } from "next/server";

import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { completeAuthorization } from "@/lib/sales-ai/graph-client";
import { updateSalesSetting } from "@/lib/sales-ai/settings";
import { logSalesEvent } from "@/lib/sales-ai/repository";
import { SALES_EVENT_TYPES } from "@/lib/sales-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PANEL_URL = "/admin/ventas-ia/configuracion";

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
    return NextResponse.redirect(
      new URL(`${PANEL_URL}?mail_error=${encodeURIComponent(error.slice(0, 200))}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`${PANEL_URL}?mail_error=${encodeURIComponent("Microsoft no devolvió el código.")}`, url.origin),
    );
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

    return NextResponse.redirect(new URL(`${PANEL_URL}?mail_connected=1`, url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo completar la conexión.";
    return NextResponse.redirect(
      new URL(`${PANEL_URL}?mail_error=${encodeURIComponent(message.slice(0, 200))}`, url.origin),
    );
  }
}

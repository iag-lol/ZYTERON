import { NextResponse } from "next/server";

import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import {
  DEFAULT_SALES_SETTINGS,
  SECRET_SETTING_KEYS,
  getSalesSettings,
  redactSecretSettings,
  updateSalesSetting,
} from "@/lib/sales-ai/settings";
import { logSalesEvent } from "@/lib/sales-ai/repository";
import { SALES_EVENT_TYPES } from "@/lib/sales-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const settings = await getSalesSettings();
  return NextResponse.json({ settings: redactSecretSettings(settings) });
}

export async function PATCH(request: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const actor = auth.legacy ? "admin" : (auth.session.user.id ?? "admin");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // Las claves secretas no se pueden fijar desde el navegador: las genera el servidor.
  const allowed = Object.keys(DEFAULT_SALES_SETTINGS).filter(
    (key) => !SECRET_SETTING_KEYS.has(key as keyof typeof DEFAULT_SALES_SETTINGS),
  );
  const updates = Object.entries(body).filter(([key]) => allowed.includes(key));

  if (updates.length === 0) {
    return NextResponse.json({ error: "No se recibió ninguna clave válida." }, { status: 400 });
  }

  try {
    for (const [key, value] of updates) {
      await updateSalesSetting(key as keyof typeof DEFAULT_SALES_SETTINGS, value, actor);

      // La pausa de emergencia queda registrada en el historial global.
      if (key === "zara_paused") {
        await logSalesEvent({
          type: SALES_EVENT_TYPES.HUMAN_INTERVENTION,
          title: value === true ? "Zara pausada" : "Zara reanudada",
          detail: `Cambio realizado por ${actor}.`,
          actor,
          isAutomated: false,
        });
      }
    }

    const settings = await getSalesSettings();
    return NextResponse.json({ settings: redactSecretSettings(settings) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la configuración.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

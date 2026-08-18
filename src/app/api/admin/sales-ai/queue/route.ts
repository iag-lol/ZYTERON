import { NextResponse } from "next/server";

import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { rescheduleOverdue } from "@/lib/sales-ai/queue";
import { updateSalesSetting } from "@/lib/sales-ai/settings";
import { logSalesEvent } from "@/lib/sales-ai/repository";
import { SALES_EVENT_TYPES } from "@/lib/sales-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Control manual de la cola: pausar, reactivar y reprogramar el atraso. */
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

  try {
    if (body.action === "pause") {
      await updateSalesSetting("zara_paused", true, actor);
      await updateSalesSetting("pause_reason", `Pausa manual de ${actor}.`, actor);
      await logSalesEvent({
        type: SALES_EVENT_TYPES.HUMAN_INTERVENTION,
        title: "Cola pausada manualmente",
        actor,
        isAutomated: false,
      });
      return NextResponse.json({ ok: true, message: "Cola detenida. Los pendientes se conservan." });
    }

    if (body.action === "resume") {
      // Al reactivar se reparte el atraso: despacharlo junto sería una ráfaga.
      const rescheduled = await rescheduleOverdue();
      await updateSalesSetting("zara_paused", false, actor);
      await updateSalesSetting("pause_reason", "", actor);

      await logSalesEvent({
        type: SALES_EVENT_TYPES.HUMAN_INTERVENTION,
        title: "Cola reactivada",
        detail: `${rescheduled} envíos atrasados fueron reprogramados de forma escalonada.`,
        actor,
        isAutomated: false,
      });

      return NextResponse.json({
        ok: true,
        message: `Cola reactivada. Se reprogramaron ${rescheduled} envíos atrasados de forma gradual.`,
      });
    }

    if (body.action === "reschedule") {
      const rescheduled = await rescheduleOverdue();
      return NextResponse.json({
        ok: true,
        message: `Se reprogramaron ${rescheduled} envíos con nuevas horas espaciadas.`,
      });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al operar la cola.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMailAccount, isGraphConfigured, renewSubscription } from "@/lib/sales-ai/graph-client";
import { detectDormantOpportunities } from "@/lib/sales-ai/followups";
import { runQueueCycle } from "@/lib/sales-ai/queue-worker";
import { notifySalesEvent } from "@/lib/sales-ai/notifications";
import { getSalesSettings } from "@/lib/sales-ai/settings";
import { safeCompare } from "@/lib/sales-ai/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tareas programadas de Zara. Pensado para un cron externo (Render Cron Job o
 * similar) llamando cada 30-60 minutos con el header de autorización.
 *
 * Ninguna de estas tareas requiere IA salvo la personalización opcional de
 * seguimientos, que se omite sola si el presupuesto está ajustado.
 */

/** Renueva la suscripción de webhooks si le quedan menos de 12 horas. */
async function renewWebhookIfNeeded() {
  if (!isGraphConfigured()) return { skipped: "Graph no configurado." };

  const account = await getMailAccount();
  if (!account?.subscription_id || !account.subscription_expires_at) {
    return { skipped: "Sin suscripción activa." };
  }

  const expiresAt = new Date(account.subscription_expires_at).getTime();
  const hoursLeft = (expiresAt - Date.now()) / (60 * 60 * 1000);

  if (hoursLeft > 12) return { renewed: false, hoursLeft: Math.round(hoursLeft) };

  try {
    const subscription = await renewSubscription(account.subscription_id);
    return { renewed: true, expiresAt: subscription.expirationDateTime };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al renovar.";
    await notifySalesEvent({
      priority: "ALTA",
      title: "Fallo al renovar el webhook de correo",
      detail: `${message}. Sin renovación, dejarán de llegar los correos entrantes.`,
    });
    return { renewed: false, error: message };
  }
}

export async function POST(request: Request) {
  // Autorización por secreto compartido: este endpoint no lleva sesión de usuario.
  const secret = process.env.SALES_AI_CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "SALES_AI_CRON_SECRET no está configurado en el servidor." },
      { status: 503 },
    );
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeCompare(provided, secret)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const settings = await getSalesSettings();
  const startedAt = Date.now();

  const webhook = await renewWebhookIfNeeded();

  // La cola procesa como máximo UN correo por ejecución. Nunca en paralelo:
  // el despacho simultáneo fue lo que generó la ráfaga rechazada.
  const queue = settings.zara_paused
    ? { released: 0, analyzed: 0, scheduled: 0, sent: 0, detail: "Zara está pausada." }
    : await runQueueCycle();

  const dormant = await detectDormantOpportunities();

  try {
    const { supabase } = createSupabaseServerClient();
    await supabase.from("sales_webhook_log").insert({
      status: "PROCESADO",
      resource: "cron",
      detail: `enviados=${queue.sent} analizados=${queue.analyzed} programados=${queue.scheduled} dormidas=${dormant.length} ms=${Date.now() - startedAt}`,
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({
    ok: true,
    paused: settings.zara_paused,
    webhook,
    queue,
    dormantOpportunities: dormant.length,
    durationMs: Date.now() - startedAt,
  });
}

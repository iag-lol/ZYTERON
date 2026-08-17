import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeCompare } from "@/lib/sales-ai/crypto";
import { getSalesSettings } from "@/lib/sales-ai/settings";
import { processInboundMessage } from "@/lib/sales-ai/inbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Microsoft Graph (change notifications).
 *
 * Reglas de seguridad:
 * - Responde el validationToken en texto plano al crear la suscripción.
 * - Valida clientState en tiempo constante; si no calza, se descarta.
 * - NUNCA ejecuta acciones con el contenido del payload: solo toma el id del
 *   mensaje y vuelve a consultarlo a Graph.
 */

type Notification = {
  subscriptionId?: string;
  clientState?: string;
  changeType?: string;
  resource?: string;
  resourceData?: { id?: string };
};

async function logWebhook(entry: {
  subscriptionId?: string | null;
  resource?: string | null;
  changeType?: string | null;
  status: string;
  detail?: string | null;
}) {
  try {
    const { supabase } = createSupabaseServerClient();
    await supabase.from("sales_webhook_log").insert({
      subscription_id: entry.subscriptionId ?? null,
      resource: entry.resource ?? null,
      change_type: entry.changeType ?? null,
      status: entry.status,
      detail: entry.detail ?? null,
    });
  } catch {
    // best-effort
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);

  // 1. Handshake de validación: Microsoft espera el token tal cual, en texto plano.
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  let payload: { value?: Notification[] };
  try {
    payload = await request.json();
  } catch {
    await logWebhook({ status: "ERROR", detail: "Cuerpo no es JSON válido." });
    return NextResponse.json({ ok: true });
  }

  const notifications = Array.isArray(payload.value) ? payload.value : [];
  if (notifications.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const settings = await getSalesSettings();
  const expectedState = (settings as unknown as { webhook_client_state?: string }).webhook_client_state ?? "";

  // Procesamos en segundo plano: Microsoft exige respuesta en menos de 3 s.
  const accepted: string[] = [];

  for (const notification of notifications) {
    const state = notification.clientState ?? "";

    if (!expectedState || !safeCompare(state, expectedState)) {
      await logWebhook({
        subscriptionId: notification.subscriptionId,
        resource: notification.resource,
        changeType: notification.changeType,
        status: "IGNORADO",
        detail: "clientState no coincide.",
      });
      continue;
    }

    const messageId = notification.resourceData?.id;
    if (!messageId) {
      await logWebhook({
        subscriptionId: notification.subscriptionId,
        status: "IGNORADO",
        detail: "La notificación no trae id de mensaje.",
      });
      continue;
    }

    accepted.push(messageId);
    await logWebhook({
      subscriptionId: notification.subscriptionId,
      resource: notification.resource,
      changeType: notification.changeType,
      status: "RECIBIDO",
      detail: `messageId=${messageId}`,
    });
  }

  // El contenido real siempre se pide a Graph, nunca se confía en el payload.
  void (async () => {
    for (const messageId of accepted) {
      try {
        const result = await processInboundMessage(messageId);
        await logWebhook({
          status: result.processed ? "PROCESADO" : "IGNORADO",
          detail: `${messageId}: ${result.action ?? result.reason ?? "sin acción"}`,
        });
      } catch (error) {
        await logWebhook({
          status: "ERROR",
          detail: `${messageId}: ${error instanceof Error ? error.message : "error"}`,
        });
      }
    }

    try {
      const { supabase } = createSupabaseServerClient();
      await supabase
        .from("sales_mail_account")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", "default");
    } catch {
      // best-effort
    }
  })();

  return NextResponse.json({ ok: true, accepted: accepted.length });
}

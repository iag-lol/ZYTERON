import { NextResponse } from "next/server";

import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendCommercialEmail } from "@/lib/sales-ai/mailer";
import { logSalesEvent } from "@/lib/sales-ai/repository";
import { SALES_EVENT_TYPES } from "@/lib/sales-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Borradores de respuesta pendientes de aprobación. */
export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_drafts")
      .select("id, company_id, thread_id, in_reply_to_message_id, reply_to_email, subject, body, confidence, requires_approval, status, created_at")
      .eq("status", "PENDIENTE")
      .order("created_at", { ascending: false })
      .limit(50);

    const drafts = data ?? [];
    const companyIds = [...new Set(drafts.map((d) => d.company_id).filter(Boolean))];

    const companies = new Map<string, { name: string; email: string | null }>();
    if (companyIds.length > 0) {
      const { data: rows } = await supabase
        .from("sales_companies")
        .select("id, name, primary_email")
        .in("id", companyIds as string[]);
      for (const row of rows ?? []) {
        companies.set(row.id as string, {
          name: row.name as string,
          email: (row.primary_email as string) ?? null,
        });
      }
    }

    return NextResponse.json({
      drafts: drafts.map((draft) => ({
        ...draft,
        companyName: draft.company_id ? companies.get(draft.company_id)?.name ?? null : null,
        // El destinatario efectivo: el del borrador manda, porque puede venir
        // de un remitente que todavía no está en el CRM.
        companyEmail:
          (draft.reply_to_email as string) ??
          (draft.company_id ? companies.get(draft.company_id)?.email ?? null : null),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron leer los borradores.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Aprueba y envía, o descarta, un borrador.
 * La respuesta se envía DENTRO del hilo original de Outlook cuando existe.
 */
export async function POST(request: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const actor = auth.legacy ? "admin" : (auth.session.user.id ?? "admin");

  let payload: { action?: string; draftId?: string; subject?: string; body?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  if (!payload.draftId) {
    return NextResponse.json({ error: "Falta el identificador del borrador." }, { status: 400 });
  }

  const { supabase } = createSupabaseServerClient();

  try {
    const { data: draft } = await supabase
      .from("sales_drafts")
      .select("id, company_id, thread_id, in_reply_to_message_id, reply_to_email, subject, body, status")
      .eq("id", payload.draftId)
      .maybeSingle();

    if (!draft) return NextResponse.json({ error: "El borrador no existe." }, { status: 404 });
    if (draft.status !== "PENDIENTE") {
      return NextResponse.json({ error: `El borrador ya está ${draft.status}.` }, { status: 400 });
    }

    if (payload.action === "discard") {
      await supabase
        .from("sales_drafts")
        .update({ status: "DESCARTADO", approved_by: actor, approved_at: new Date().toISOString() })
        .eq("id", draft.id);

      await logSalesEvent({
        companyId: draft.company_id as string,
        type: SALES_EVENT_TYPES.HUMAN_INTERVENTION,
        title: "Borrador descartado",
        detail: `Descartado por ${actor}.`,
        actor,
        isAutomated: false,
      });

      return NextResponse.json({ ok: true });
    }

    if (payload.action === "send") {
      const subject = payload.subject?.trim() || (draft.subject as string) || "Respuesta";
      const body = payload.body?.trim() || (draft.body as string) || "";

      if (!body) {
        return NextResponse.json({ error: "El cuerpo del correo está vacío." }, { status: 400 });
      }

      // Orden de preferencia: destinatario guardado en el borrador, luego el
      // de la ficha, y como último recurso el remitente del mensaje original.
      let recipient = (draft.reply_to_email as string) || "";

      if (!recipient && draft.company_id) {
        const { data: company } = await supabase
          .from("sales_companies")
          .select("primary_email")
          .eq("id", draft.company_id)
          .maybeSingle();
        recipient = (company?.primary_email as string) || "";
      }

      if (!recipient && draft.in_reply_to_message_id) {
        const { data: original } = await supabase
          .from("sales_messages")
          .select("from_email")
          .eq("id", draft.in_reply_to_message_id)
          .maybeSingle();
        recipient = (original?.from_email as string) || "";
      }

      if (!recipient) {
        return NextResponse.json(
          { error: "No hay dirección a la cual responder." },
          { status: 400 },
        );
      }

      // Recuperamos el id de Graph del mensaje original para responder en el hilo.
      let replyToGraphMessageId: string | null = null;
      if (draft.in_reply_to_message_id) {
        const { data: original } = await supabase
          .from("sales_messages")
          .select("graph_message_id")
          .eq("id", draft.in_reply_to_message_id)
          .maybeSingle();
        replyToGraphMessageId = (original?.graph_message_id as string) ?? null;
      }

      const sent = await sendCommercialEmail({
        companyId: draft.company_id as string,
        threadId: (draft.thread_id as string) ?? null,
        recipient,
        subject,
        body,
        replyToGraphMessageId,
        actor,
      });

      if (!sent.ok) {
        await supabase
          .from("sales_drafts")
          .update({ status: "ERROR", error_detail: sent.error })
          .eq("id", draft.id);
        return NextResponse.json({ error: sent.error }, { status: 400 });
      }

      await supabase
        .from("sales_drafts")
        .update({
          status: "ENVIADO",
          subject,
          body,
          approved_by: actor,
          approved_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .eq("id", draft.id);

      await logSalesEvent({
        companyId: draft.company_id as string,
        type: SALES_EVENT_TYPES.DRAFT_SENT,
        title: "Respuesta aprobada y enviada",
        detail: `${subject} · aprobada por ${actor}`,
        actor,
        isAutomated: false,
      });

      return NextResponse.json({ ok: true, redirected: sent.redirected });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar el borrador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { generateOutreach, sendBulkOutreach, sendOutreach } from "@/lib/sales-ai/outreach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Primer contacto comercial.
 * - action "draft": genera el mensaje sin enviar nada.
 * - action "send": envía y programa los seguimientos.
 *
 * El envío siempre lo confirma una persona: no hay ruta que redacte y envíe
 * en un solo paso.
 */
export async function POST(request: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const actor = auth.legacy ? "admin" : (auth.session.user.id ?? "admin");

  let body: {
    action?: string;
    companyId?: string;
    companyIds?: string[];
    subject?: string;
    bodyText?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // El contacto masivo recibe una lista en vez de un identificador único.
  if (body.action === "bulk") {
    const ids = Array.isArray(body.companyIds) ? body.companyIds.filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No se seleccionó ninguna empresa." }, { status: 400 });
    }
    if (ids.length > 25) {
      return NextResponse.json(
        { error: "Máximo 25 empresas por tanda, para controlar el ritmo de envío." },
        { status: 400 },
      );
    }

    try {
      const result = await sendBulkOutreach({ companyIds: ids, actor });
      return NextResponse.json({ ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error en el contacto masivo.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!body.companyId) {
    return NextResponse.json({ error: "Falta el identificador de la empresa." }, { status: 400 });
  }

  try {
    if (body.action === "draft") {
      const result = await generateOutreach(body.companyId);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ draft: result.draft, usedAi: result.usedAi });
    }

    if (body.action === "send") {
      if (!body.subject?.trim() || !body.bodyText?.trim()) {
        return NextResponse.json({ error: "Falta el asunto o el cuerpo del correo." }, { status: 400 });
      }

      const result = await sendOutreach({
        companyId: body.companyId,
        subject: body.subject.trim(),
        body: body.bodyText.trim(),
        actor,
      });

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

      return NextResponse.json({
        ok: true,
        redirected: result.redirected,
        followupsScheduled: result.followupsScheduled,
      });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al preparar el contacto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

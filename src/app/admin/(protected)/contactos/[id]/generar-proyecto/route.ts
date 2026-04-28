import { NextResponse } from "next/server";
import { buildProjectPrefillFromLead, getLeadForWorkflow, resolveClientIdFromLead } from "@/lib/admin/contact-workflow";

type Context = {
  params: Promise<{ id: string }> | { id: string };
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await Promise.resolve(context.params);
    const lead = await getLeadForWorkflow(id);

    if (!lead) {
      return jsonError("No se encontró el contacto seleccionado.", 404);
    }

    const clientId = lead.email?.trim() ? await resolveClientIdFromLead(lead) : null;
    const prefill = buildProjectPrefillFromLead(lead, clientId);
    const encodedPrefill = encodeURIComponent(JSON.stringify(prefill));

    return NextResponse.json({
      ok: true,
      redirectTo: `/admin/proyectos/nuevo?prefill=${encodedPrefill}`,
      message: "Borrador de proyecto generado desde contacto.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el borrador de proyecto.";
    return jsonError(message, 500);
  }
}

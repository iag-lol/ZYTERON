import { NextResponse } from "next/server";
import { getLeadForWorkflow, resolveClientIdFromLead } from "@/lib/admin/contact-workflow";

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

    if (!lead.email?.trim()) {
      return jsonError("Este contacto no tiene email. Completa el correo antes de convertirlo en cliente.");
    }

    const clientId = await resolveClientIdFromLead(lead);
    if (!clientId) {
      return jsonError("No se pudo resolver el cliente desde este contacto.");
    }

    return NextResponse.json({
      ok: true,
      redirectTo: `/admin/clientes/${clientId}`,
      message: "Contacto convertido a cliente correctamente.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo convertir el contacto en cliente.";
    return jsonError(message, 500);
  }
}

import { NextResponse } from "next/server";
import { insertRow } from "@/lib/admin/repository";

type Body = {
  clientId?: string;
  projectId?: string;
  subject?: string;
  channel?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  description?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.subject) {
      return NextResponse.json({ error: "El asunto es obligatorio." }, { status: 400 });
    }

    await insertRow("ClientRequest", {
      clientId: body.clientId || null,
      projectId: body.projectId || null,
      subject: body.subject,
      channel: body.channel || "Email",
      priority: body.priority || "Normal",
      status: body.status || "Abierta",
      dueDate: body.dueDate || null,
      description: body.description || null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la solicitud.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

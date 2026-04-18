import { NextResponse } from "next/server";
import { insertRow } from "@/lib/admin/repository";

type Body = {
  clientId?: string;
  quoteId?: string;
  saleId?: string;
  title?: string;
  serviceArea?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  description?: string;
  scope?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  actualHours?: number;
  totalCharge?: number;
  owner?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.title) {
      return NextResponse.json({ error: "El título del proyecto es obligatorio." }, { status: 400 });
    }

    await insertRow("Project", {
      clientId: body.clientId || null,
      quoteId: body.quoteId || null,
      saleId: body.saleId || null,
      title: body.title,
      serviceArea: body.serviceArea || null,
      status: body.status || "Planificado",
      priority: body.priority || "Normal",
      startDate: body.startDate || null,
      startTime: body.startTime || null,
      endDate: body.endDate || null,
      endTime: body.endTime || null,
      description: body.description || null,
      scope: body.scope || null,
      hourlyRate: body.hourlyRate || 0,
      estimatedHours: body.estimatedHours || 0,
      actualHours: body.actualHours || 0,
      totalCharge: body.totalCharge || 0,
      owner: body.owner || null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el proyecto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

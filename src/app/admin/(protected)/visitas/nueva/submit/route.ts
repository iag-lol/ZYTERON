import { NextResponse } from "next/server";
import { insertRow } from "@/lib/admin/repository";

type Body = {
  clientId?: string;
  date?: string;
  notes?: string;
  status?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.date) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }

    await insertRow("Visit", {
      clientId: body.clientId || null,
      date: new Date(body.date).toISOString(),
      notes: body.notes || null,
      status: body.status || "Programada",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

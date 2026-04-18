import { NextResponse } from "next/server";
import { insertRow } from "@/lib/admin/repository";

type Body = {
  clientId?: string;
  total?: number;
  description?: string;
  paymentMethod?: string;
  invoiceRef?: string;
  date?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (typeof body.total !== "number" || body.total <= 0) {
      return NextResponse.json({ error: "Total inválido" }, { status: 400 });
    }

    await insertRow("Sale", {
      clientId: body.clientId || null,
      total: body.total,
      description: body.description || null,
      paymentMethod: body.paymentMethod || null,
      invoiceRef: body.invoiceRef || null,
      createdAt: body.date ? new Date(body.date).toISOString() : new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

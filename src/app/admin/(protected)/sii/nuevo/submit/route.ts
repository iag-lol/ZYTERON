import { NextResponse } from "next/server";
import { insertRow } from "@/lib/admin/repository";

type Body = {
  clientId?: string;
  projectId?: string;
  quoteId?: string;
  saleId?: string;
  type?: string;
  documentNumber?: string;
  siiFolio?: string;
  issueDate?: string;
  dueDate?: string;
  netAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  status?: string;
  paymentStatus?: string;
  emissionMethod?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  notes?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.type) {
      return NextResponse.json({ error: "El tipo de documento es obligatorio." }, { status: 400 });
    }

    await insertRow("TaxDocument", {
      clientId: body.clientId || null,
      projectId: body.projectId || null,
      quoteId: body.quoteId || null,
      saleId: body.saleId || null,
      type: body.type,
      documentNumber: body.documentNumber || null,
      siiFolio: body.siiFolio || null,
      issueDate: body.issueDate || new Date().toISOString().slice(0, 10),
      dueDate: body.dueDate || null,
      netAmount: body.netAmount || 0,
      taxAmount: body.taxAmount || 0,
      totalAmount: body.totalAmount || 0,
      status: body.status || "Pendiente",
      paymentStatus: body.paymentStatus || "Pendiente",
      emissionMethod: body.emissionMethod || "Registro interno",
      pdfUrl: body.pdfUrl || null,
      xmlUrl: body.xmlUrl || null,
      notes: body.notes || null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

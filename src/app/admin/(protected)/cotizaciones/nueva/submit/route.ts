import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildQuoteMeta, parseQuoteMessage, serializeQuoteMessage } from "@/lib/admin/quote";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
import { findOrCreateClientByEmail, updateRows } from "@/lib/admin/repository";
import { ZYTERON_QUOTE_BUCKET } from "@/lib/company";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QuoteBody = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  subtotal?: number;
  discount?: number;
  total?: number;
  status?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QuoteBody;
    const { name, email, phone, company, message, subtotal, discount, total, status } = body || {};

    if (!name || !email) {
      return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 });
    }

    if (typeof total !== "number" || total <= 0) {
      return NextResponse.json({ error: "Total invalido" }, { status: 400 });
    }

    const meta = buildQuoteMeta(parseQuoteMessage(message));
    const clientId = await findOrCreateClientByEmail({
      name,
      email,
      company: company || null,
      phone: phone || null,
      address: meta.clientAddress || null,
      city: meta.clientCity || null,
      rut: meta.clientRut || null,
      contactName: meta.clientContact || name,
    });

    const { supabase } = createSupabaseServerClient();
    const createdAt = new Date().toISOString();

    const normalizedMessage = serializeQuoteMessage(meta);
    const { data, error } = await supabase
      .from("Quote")
      .insert({
        id: randomUUID(),
        userId: clientId,
        name,
        email,
        phone: phone || null,
        company: company || null,
        message: normalizedMessage,
        subtotal: typeof subtotal === "number" ? subtotal : total,
        discount: typeof discount === "number" ? discount : 0,
        total,
        status: status || "PENDING",
        createdAt,
      })
      .select("id, createdAt, name, email, phone, company, message, subtotal, discount, total, status")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "No se pudo guardar la cotizacion" }, { status: 500 });
    }

    const pdfBytes = await generateQuotePdf({
      quoteId: data.id,
      clientName: name,
      clientEmail: email,
      clientPhone: phone || null,
      clientCompany: company || null,
      status: data.status,
      createdAt: data.createdAt,
      meta,
    });

    let pdfUrl = `/admin/cotizaciones/${data.id}/pdf`;
    let pdfStoragePath: string | undefined;

    try {
      const storagePath = `quotes/${new Date().getFullYear()}/${data.id}.pdf`;
      const upload = await supabase.storage
        .from(ZYTERON_QUOTE_BUCKET)
        .upload(storagePath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!upload.error) {
        pdfStoragePath = storagePath;
        const publicUrl = supabase.storage.from(ZYTERON_QUOTE_BUCKET).getPublicUrl(storagePath);
        pdfUrl = publicUrl.data.publicUrl || pdfUrl;
      }
    } catch {
      // Si el bucket no existe, el PDF queda disponible por la ruta dinámica del panel.
    }

    const nextMeta = buildQuoteMeta({
      ...meta,
      pdfStoragePath,
      pdfPublicUrl: pdfUrl,
      pdfGeneratedAt: new Date().toISOString(),
    });

    await updateRows(
      "Quote",
      {
        message: serializeQuoteMessage(nextMeta),
      },
      { id: data.id },
    );

    return NextResponse.json({
      ok: true,
      id: data.id,
      pdfUrl: `/admin/cotizaciones/${data.id}/pdf`,
      storageUrl: pdfUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al guardar la cotizacion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildQuoteMeta, parseQuoteMessage, serializeQuoteMessage } from "@/lib/admin/quote";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
import { findOrCreateClientByEmail, insertRow, safeSelectSingle, updateRows } from "@/lib/admin/repository";
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => String(value).trim());
    if (parts.length) return parts.join(" | ");
  }
  return "Error inesperado al guardar la cotizacion";
}

function normalizeStatus(status?: string | null) {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function toDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = String(value).trim();
    return fallback.length >= 10 ? fallback.slice(0, 10) : null;
  }
  return parsed.toISOString().slice(0, 10);
}

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
    let clientId: string | null = null;
    try {
      clientId = await findOrCreateClientByEmail({
        name,
        email,
        company: company || null,
        phone: phone || null,
        address: meta.clientAddress || null,
        city: meta.clientCity || null,
        rut: meta.clientRut || null,
        contactName: meta.clientContact || name,
      });
    } catch (error) {
      // No bloquear guardado de cotización por fallas en sincronización de cliente.
      console.error("[quote-submit] client sync failed:", getErrorMessage(error));
    }

    const { supabase } = createSupabaseServerClient();
    const createdAt = new Date().toISOString();

    const normalizedMessage = serializeQuoteMessage(meta);
    const { data, error } = await supabase
      .from("Quote")
      .insert({
        id: randomUUID(),
        userId: clientId || null,
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
      return NextResponse.json({ error: getErrorMessage(error) || "No se pudo guardar la cotizacion" }, { status: 500 });
    }

    let pdfUrl = `/admin/cotizaciones/${data.id}/pdf`;
    let pdfStoragePath: string | undefined;

    try {
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
    } catch {
      // Falla de generación PDF no debe bloquear persistencia de la cotización.
      console.error("[quote-submit] pdf generation failed for quote", data.id);
    }

    const nextMeta = buildQuoteMeta({
      ...meta,
      pdfStoragePath,
      pdfPublicUrl: pdfUrl,
      pdfGeneratedAt: new Date().toISOString(),
    });

    try {
      await updateRows(
        "Quote",
        {
          message: serializeQuoteMessage(nextMeta),
        },
        { id: data.id },
      );
    } catch (error) {
      // La cotización ya fue insertada; no responder 500 por metadata posterior.
      console.error("[quote-submit] quote metadata update failed:", getErrorMessage(error));
    }

    const quoteStatus = normalizeStatus(data.status);
    if (quoteStatus === "WON") {
      try {
        const quoteCode = meta.quoteNumber || `COT-${data.id.slice(0, 8).toUpperCase()}`;
        const invoiceRef = `COT:${data.id}`;
        const existingSale = await safeSelectSingle<{ id: string }>("Sale", "id", { invoiceRef });

        let saleId = existingSale?.id ?? null;
        if (!saleId) {
          const createdSale = await insertRow<{ id: string }>(
            "Sale",
            {
              clientId: clientId || null,
              total: Math.max(0, Math.round(typeof data.total === "number" ? data.total : meta.grandTotal || 0)),
              description: `Venta generada automáticamente desde cotización ${quoteCode}`,
              paymentMethod: meta.paymentMethod || null,
              invoiceRef,
              createdAt: createdAt,
            },
            "id",
          );
          saleId = createdSale.id;
        }

        const existingTaxDoc = await safeSelectSingle<{ id: string }>("TaxDocument", "id", { quoteId: data.id });
        if (!existingTaxDoc) {
          const subtotalAmount = Math.max(0, Math.round(typeof data.subtotal === "number" ? data.subtotal : meta.subtotal || 0));
          const taxAmount = Math.max(0, Math.round(meta.iva || 0));
          const totalAmount = Math.max(0, Math.round(typeof data.total === "number" ? data.total : meta.grandTotal || 0));
          // En esta app, subtotal ya viene con descuentos aplicados.
          const netAmount = subtotalAmount;

          await insertRow(
            "TaxDocument",
            {
              clientId: clientId || null,
              quoteId: data.id,
              saleId: saleId || null,
              type: "Factura",
              issueDate: toDateOnly(meta.quoteDate || data.createdAt) || createdAt.slice(0, 10),
              dueDate: toDateOnly(meta.validUntil),
              netAmount,
              taxAmount,
              totalAmount,
              status: "Pendiente",
              paymentStatus: "Pendiente",
              emissionMethod: "Generado automático desde cotización ganada",
              notes: `Documento tributario automático para ${quoteCode}`,
              createdAt: createdAt,
            },
            "id",
          );
        }
      } catch (error) {
        // Si falla la sincronización comercial/tributaria, la cotización sigue creada.
        console.error("[quote-submit] won-automation failed:", getErrorMessage(error));
      }
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      pdfUrl: `/admin/cotizaciones/${data.id}/pdf`,
      storageUrl: pdfUrl,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

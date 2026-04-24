import { NextResponse } from "next/server";
import { buildQuoteMeta, parseQuoteMessage, serializeQuoteMessage, type QuoteLineItem } from "@/lib/admin/quote";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
import {
  findOrCreateClientByEmail,
  getQuoteById,
  syncWonQuotesCrossModules,
  updateRows,
} from "@/lib/admin/repository";
import { ZYTERON_QUOTE_BUCKET } from "@/lib/company";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QuoteUpdateBody = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  clientRut?: string;
  clientAddress?: string;
  clientCity?: string;
  clientContact?: string;
  quoteNumber?: string;
  quoteDate?: string;
  validUntil?: string;
  validityDays?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  includeIva?: boolean;
  ivaRate?: number;
  notes?: string;
  terms?: string;
  items?: QuoteLineItem[];
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
  return "Error inesperado al actualizar la cotizacion";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeStatus(status?: string | null) {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function normalizeItems(items: QuoteLineItem[] | undefined) {
  return (items || [])
    .map((item, index) => ({
      id: text(item.id) || `item-${index + 1}`,
      description: text(item.description),
      detail: text(item.detail),
      qty: Math.max(0, numberValue(item.qty, 0)),
      unit: text(item.unit) || "unidad",
      unitPrice: Math.max(0, numberValue(item.unitPrice, 0)),
      discountPct: Math.max(0, Math.min(100, numberValue(item.discountPct, 0))),
    }))
    .filter((item) => item.description && item.qty > 0);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const current = await getQuoteById(id);
    if (!current) {
      return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    }

    const body = (await request.json()) as QuoteUpdateBody;
    const name = text(body.name) || current.name || "";
    const email = text(body.email) || current.email || "";
    const phone = text(body.phone) || current.phone || "";
    const company = text(body.company) || current.company || "";
    const status = normalizeStatus(body.status || current.status || "PENDING");

    if (!name || !email) {
      return NextResponse.json({ error: "Nombre y email son requeridos." }, { status: 400 });
    }

    const items = normalizeItems(body.items);
    if (items.length === 0) {
      return NextResponse.json({ error: "Debes ingresar al menos 1 item válido." }, { status: 400 });
    }

    const includeIva = body.includeIva ?? current.meta.includeIva ?? true;
    const ivaRate = typeof body.ivaRate === "number" ? body.ivaRate : current.meta.ivaRate ?? 0.19;
    const subtotal = items.reduce((acc, item) => {
      const gross = item.qty * item.unitPrice;
      const discount = gross * ((item.discountPct || 0) / 100);
      return acc + (gross - discount);
    }, 0);
    const totalDescuento = items.reduce((acc, item) => {
      const gross = item.qty * item.unitPrice;
      return acc + gross * ((item.discountPct || 0) / 100);
    }, 0);
    const iva = includeIva ? subtotal * ivaRate : 0;
    const grandTotal = subtotal + iva;

    let clientId = current.userId || null;
    try {
      clientId = await findOrCreateClientByEmail({
        name,
        email,
        company: company || null,
        phone: phone || null,
        address: text(body.clientAddress) || current.meta.clientAddress || null,
        city: text(body.clientCity) || current.meta.clientCity || null,
        rut: text(body.clientRut) || current.meta.clientRut || null,
        contactName: text(body.clientContact) || current.meta.clientContact || null,
      });
    } catch (error) {
      console.error("[quote-edit] client sync failed:", getErrorMessage(error));
    }

    const meta = buildQuoteMeta({
      ...parseQuoteMessage(current.message),
      clientRut: text(body.clientRut) || current.meta.clientRut,
      clientAddress: text(body.clientAddress) || current.meta.clientAddress,
      clientCity: text(body.clientCity) || current.meta.clientCity,
      clientContact: text(body.clientContact) || current.meta.clientContact || name,
      quoteNumber: text(body.quoteNumber) || current.meta.quoteNumber,
      quoteDate: text(body.quoteDate) || current.meta.quoteDate || current.issuedAt,
      validUntil: text(body.validUntil) || current.meta.validUntil,
      validityDays: text(body.validityDays) || current.meta.validityDays,
      paymentMethod: text(body.paymentMethod) || current.meta.paymentMethod,
      paymentTerms: text(body.paymentTerms) || current.meta.paymentTerms,
      includeIva,
      ivaRate,
      items,
      subtotal: Math.max(0, Math.round(subtotal)),
      totalDescuento: Math.max(0, Math.round(totalDescuento)),
      iva: Math.max(0, Math.round(iva)),
      grandTotal: Math.max(0, Math.round(grandTotal)),
      notes: text(body.notes) || current.meta.notes,
      terms: text(body.terms) || current.meta.terms,
    });

    await updateRows(
      "Quote",
      {
        userId: clientId || null,
        name,
        email,
        phone: phone || null,
        company: company || null,
        message: serializeQuoteMessage(meta),
        subtotal: meta.subtotal,
        discount: meta.totalDescuento,
        total: meta.grandTotal,
        status: status || "PENDING",
      },
      { id },
    );

    const { supabase } = createSupabaseServerClient();
    let pdfUrl = `/admin/cotizaciones/${id}/pdf`;
    let pdfStoragePath: string | undefined;

    try {
      const pdfBytes = await generateQuotePdf({
        quoteId: id,
        clientName: name,
        clientEmail: email,
        clientPhone: phone || null,
        clientCompany: company || null,
        status,
        createdAt: current.createdAt || new Date().toISOString(),
        meta,
      });

      try {
        const storagePath = `quotes/${new Date().getFullYear()}/${id}.pdf`;
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
        // fallback a ruta dinámica.
      }
    } catch (error) {
      console.error("[quote-edit] pdf generation failed:", getErrorMessage(error));
    }

    const metaWithPdf = buildQuoteMeta({
      ...meta,
      pdfStoragePath,
      pdfPublicUrl: pdfUrl,
      pdfGeneratedAt: new Date().toISOString(),
    });

    await updateRows(
      "Quote",
      {
        message: serializeQuoteMessage(metaWithPdf),
      },
      { id },
    );

    // Reconciliación transversal para mantener módulos sincronizados.
    await syncWonQuotesCrossModules();

    return NextResponse.json({
      ok: true,
      id,
      pdfUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

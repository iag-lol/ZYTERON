import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  isOperationsSchemaMissingError,
  syncClientProcessFromQuoteStatus,
} from "@/lib/admin/operations";
import { buildQuoteMeta, parseQuoteMessage, serializeQuoteMessage } from "@/lib/admin/quote";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
import { findOrCreateClientByEmail, syncWonQuoteById, updateRows } from "@/lib/admin/repository";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { ZYTERON_QUOTE_BUCKET } from "@/lib/company";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";
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
  paymentBillingType?: "ONE_TIME" | "SUBSCRIPTION";
  paymentChannel?: "FLOW" | "TRANSFER";
  paymentPlanMode?: "FULL" | "DELIVERY" | "SPLIT";
  splitPercentInitial?: number;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
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

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as QuoteBody;
    const { name, email, phone, company, message, subtotal, discount, total, status } = body || {};

    if (!name || !email) {
      return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 });
    }

    if (typeof total !== "number" || total <= 0) {
      return NextResponse.json({ error: "Total invalido" }, { status: 400 });
    }

    const rawMeta = parseQuoteMessage(message);
    const paymentBillingType = body.paymentBillingType || rawMeta.payment?.billingType;
    const meta = normalizeQuoteMetaPayment(
      buildQuoteMeta({
        ...rawMeta,
        payment: {
          ...rawMeta.payment,
          billingType: paymentBillingType,
          defaultChannel:
            paymentBillingType === "SUBSCRIPTION"
              ? "FLOW"
              : body.paymentChannel || rawMeta.payment?.defaultChannel,
          channelConfigured:
            paymentBillingType === "SUBSCRIPTION"
              ? true
              : Boolean(body.paymentChannel || rawMeta.payment?.channelConfigured),
          planMode:
            paymentBillingType === "SUBSCRIPTION"
              ? "FULL"
              : body.paymentPlanMode || rawMeta.payment?.planMode,
          splitPercentInitial:
            typeof body.splitPercentInitial === "number"
              ? body.splitPercentInitial
              : rawMeta.payment?.splitPercentInitial,
        },
      }),
    );
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
      .select(
        "id, createdAt, name, email, phone, company, message, subtotal, discount, total, status",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: getErrorMessage(error) || "No se pudo guardar la cotizacion" },
        { status: 500 },
      );
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

    const nextMeta = normalizeQuoteMetaPayment(
      buildQuoteMeta({
        ...meta,
        pdfStoragePath,
        pdfPublicUrl: pdfUrl,
        pdfGeneratedAt: new Date().toISOString(),
      }),
    );

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

    try {
      await syncClientProcessFromQuoteStatus({
        quoteId: data.id,
        actorId: auth.legacy ? null : auth.session.user.id,
      });
    } catch (error) {
      if (!isOperationsSchemaMissingError(error)) {
        console.error("[quote-submit] process sync failed:", getErrorMessage(error));
      }
    }

    if (normalizeStatus(data.status) === "WON") {
      await syncWonQuoteById(data.id);
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

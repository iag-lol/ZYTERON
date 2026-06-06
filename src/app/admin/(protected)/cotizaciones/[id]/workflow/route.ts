import { NextResponse } from "next/server";
import { getQuoteById, updateRowsWithFallback } from "@/lib/admin/repository";
import {
  isQuoteRequestMeta,
  mapStageToQuoteStatus,
  serializeQuoteRequestMeta,
  type QuoteRequestStage,
} from "@/lib/quote-requests";

const allowedStages = new Set<QuoteRequestStage>([
  "NUEVA",
  "REVISADA",
  "CONTACTADO",
  "EN_PROPUESTA",
  "CERRADA",
  "PERDIDA",
  "ARCHIVADA",
]);

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/cotizaciones")) return "/admin/cotizaciones";
  return path;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const nextStage = String(formData.get("stage") || "").trim().toUpperCase() as QuoteRequestStage;
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const redirectUrl = new URL(redirectTo, request.url);

  if (!allowedStages.has(nextStage)) {
    redirectUrl.searchParams.set("status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    const quote = await getQuoteById(id);
    const meta = quote?.meta;

    if (!quote || !isQuoteRequestMeta(meta)) {
      redirectUrl.searchParams.set("status_error", "1");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const updatedMeta = {
      ...meta,
      requestStage: nextStage,
    };

    await updateRowsWithFallback(
      "Quote",
      {
        status: mapStageToQuoteStatus(nextStage),
        message: serializeQuoteRequestMeta(updatedMeta),
      },
      { id },
    );
  } catch {
    redirectUrl.searchParams.set("status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

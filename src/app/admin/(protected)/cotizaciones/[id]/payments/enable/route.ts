import { NextResponse } from "next/server";
import { enableQueuedQuoteStage } from "@/lib/payments/quote-payment-workflow";

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/cotizaciones")) return "/admin/cotizaciones";
  return path;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const stageKey = String(formData.get("stageKey") || "").trim().toUpperCase();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const redirectUrl = new URL(redirectTo, request.url);

  if (!["DELIVERY", "FINAL", "FULL", "INITIAL"].includes(stageKey)) {
    redirectUrl.searchParams.set("payment_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    await enableQueuedQuoteStage({
      quoteId: id,
      stageKey: stageKey as "FULL" | "DELIVERY" | "INITIAL" | "FINAL",
      req: request,
    });
    redirectUrl.searchParams.set("payment_enabled", "1");
  } catch {
    redirectUrl.searchParams.set("payment_error", "1");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

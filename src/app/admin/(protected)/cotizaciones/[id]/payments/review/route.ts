import { NextResponse } from "next/server";
import { reviewQuoteTransferProof } from "@/lib/payments/quote-payment-workflow";

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/cotizaciones")) return "/admin/cotizaciones";
  return path;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const stageKey = String(formData.get("stageKey") || "").trim().toUpperCase();
  const action = String(formData.get("action") || "").trim().toUpperCase();
  const reviewNote = String(formData.get("reviewNote") || "").trim();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const redirectUrl = new URL(redirectTo, request.url);

  if (!["DELIVERY", "FINAL", "FULL", "INITIAL"].includes(stageKey) || !["APPROVE", "REJECT"].includes(action)) {
    redirectUrl.searchParams.set("payment_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    await reviewQuoteTransferProof({
      quoteId: id,
      stageKey: stageKey as "FULL" | "DELIVERY" | "INITIAL" | "FINAL",
      action: action as "APPROVE" | "REJECT",
      reviewNote: reviewNote || undefined,
      req: request,
    });
    redirectUrl.searchParams.set("payment_reviewed", action === "APPROVE" ? "approved" : "rejected");
  } catch {
    redirectUrl.searchParams.set("payment_error", "1");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

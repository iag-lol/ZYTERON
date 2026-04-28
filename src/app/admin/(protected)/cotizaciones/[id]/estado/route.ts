import { NextResponse } from "next/server";
import { syncWonQuotesCrossModules, updateRows } from "@/lib/admin/repository";

type AllowedStatus = "PENDING" | "SENT" | "WON" | "LOST";

function normalizeStatus(value: unknown): AllowedStatus | null {
  const status = String(value || "").trim().toUpperCase();
  if (status === "PENDING" || status === "SENT" || status === "WON" || status === "LOST") {
    return status;
  }
  return null;
}

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/cotizaciones")) return "/admin/cotizaciones";
  return path;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const nextStatus = normalizeStatus(formData.get("status"));
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const redirectUrl = new URL(redirectTo, request.url);

  if (!nextStatus) {
    redirectUrl.searchParams.set("status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    await updateRows("Quote", { status: nextStatus }, { id });

    if (nextStatus === "WON") {
      await syncWonQuotesCrossModules();
    }
  } catch {
    redirectUrl.searchParams.set("status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

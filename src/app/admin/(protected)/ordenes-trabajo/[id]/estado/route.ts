import { NextResponse } from "next/server";
import { updateRows } from "@/lib/admin/repository";

const allowed = ["ACTIVE", "IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELLED"] as const;
type AllowedStatus = (typeof allowed)[number];

function normalizeStatus(value: FormDataEntryValue | null): AllowedStatus | null {
  const status = String(value || "").trim().toUpperCase();
  if (allowed.includes(status as AllowedStatus)) return status as AllowedStatus;
  return null;
}

function safeRedirect(path: FormDataEntryValue | null) {
  const value = String(path || "").trim();
  if (value.startsWith("/admin/ordenes-trabajo")) return value;
  if (value.startsWith("/admin/ventas")) return value;
  return "/admin/ordenes-trabajo";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const status = normalizeStatus(formData.get("status"));
  const redirectTo = safeRedirect(formData.get("redirectTo"));
  const redirectUrl = new URL(redirectTo, request.url);

  if (!status) {
    redirectUrl.searchParams.set("ot_status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status,
    updatedAt: now,
  };

  if (status === "COMPLETED") {
    payload.completedAt = now;
  }
  if (status === "CLOSED") {
    payload.closedAt = now;
  }
  if (status === "CANCELLED") {
    payload.cancelledAt = now;
  }

  try {
    await updateRows("WorkOrder", payload, { id });
  } catch {
    redirectUrl.searchParams.set("ot_status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

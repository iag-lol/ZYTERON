import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

function firstHeaderValue(value: string | null) {
  if (!value) return "";
  return value.split(",")[0]?.trim() || "";
}

function resolveRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = firstHeaderValue(request.headers.get("host"));
  const targetHost = forwardedHost || host;
  const targetProto = forwardedProto || requestUrl.protocol.replace(":", "");

  if (targetHost && (targetProto === "http" || targetProto === "https")) {
    return `${targetProto}://${targetHost}`;
  }

  return requestUrl.origin;
}



export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const status = normalizeStatus(formData.get("status"));
  const redirectTo = safeRedirect(formData.get("redirectTo"));
  const redirectUrl = new URL(redirectTo, resolveRequestOrigin(request));

  if (!status) {
    redirectUrl.searchParams.set("ot_status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    await prisma.workOrder.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        closedAt: status === "CLOSED" ? new Date() : undefined,
        cancelledAt: status === "CANCELLED" ? new Date() : undefined,
      },
    });
  } catch {
    redirectUrl.searchParams.set("ot_status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

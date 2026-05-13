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

async function updateWorkOrderRows(payload: Record<string, unknown>, filters: Record<string, string | number>) {
  const tables = ["WorkOrder", "workorder", "work_order", "\"WorkOrder\""] as const;
  let lastError: Error | null = null;

  for (const table of tables) {
    try {
      await updateRows(table, payload, filters);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
      const missingSchema =
        (message.includes("workorder") && message.includes("does not exist")) ||
        message.includes("could not find the table") ||
        message.includes("schema cache");

      if (missingSchema) {
        lastError = error instanceof Error ? error : new Error(String(error || "Schema not available"));
        continue;
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error("No se pudo resolver la tabla WorkOrder.");
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
    await updateWorkOrderRows(payload, { id });
  } catch {
    redirectUrl.searchParams.set("ot_status_error", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

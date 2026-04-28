import { NextResponse } from "next/server";
import { setClientReviewStatus } from "@/lib/admin/repository";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

function normalizeStatus(value: unknown): ReviewStatus | null {
  const status = String(value || "").trim().toUpperCase();
  if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    return status;
  }
  return null;
}

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/comentarios")) return "/admin/comentarios";
  return path;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  const isJsonRequest = contentType.includes("application/json");

  let status: ReviewStatus | null = null;
  let redirectTo = "/admin/comentarios";
  if (isJsonRequest) {
    const body = (await request.json().catch(() => ({}))) as { status?: unknown; redirectTo?: unknown };
    status = normalizeStatus(body.status);
    redirectTo = safeRedirectPath(body.redirectTo);
  } else {
    const formData = await request.formData();
    status = normalizeStatus(formData.get("status"));
    redirectTo = safeRedirectPath(formData.get("redirectTo"));
  }
  const redirectUrl = new URL(redirectTo, request.url);

  if (!status) {
    if (isJsonRequest) {
      return NextResponse.json({ ok: false, error: "Estado inválido para comentario." }, { status: 400 });
    }
    redirectUrl.searchParams.set("error", encodeURIComponent("Estado inválido para comentario."));
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    await setClientReviewStatus(id, status);
    if (isJsonRequest) {
      return NextResponse.json({ ok: true, status });
    }
    redirectUrl.searchParams.set("saved", "1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el comentario.";
    if (isJsonRequest) {
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
    redirectUrl.searchParams.set("error", encodeURIComponent(message));
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

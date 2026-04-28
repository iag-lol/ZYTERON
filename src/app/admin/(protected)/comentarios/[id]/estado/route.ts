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
  const formData = await request.formData();
  const status = normalizeStatus(formData.get("status"));
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const url = new URL(redirectTo, request.url);

  if (!status) {
    url.searchParams.set("error", encodeURIComponent("Estado inválido para comentario."));
    return NextResponse.redirect(url, { status: 303 });
  }

  try {
    await setClientReviewStatus(id, status);
    url.searchParams.set("saved", "1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el comentario.";
    url.searchParams.set("error", encodeURIComponent(message));
  }

  return NextResponse.redirect(url, { status: 303 });
}

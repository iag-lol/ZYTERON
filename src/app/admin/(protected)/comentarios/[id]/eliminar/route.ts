import { NextResponse } from "next/server";
import { deleteClientReviewById } from "@/lib/admin/repository";

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/comentarios")) return "/admin/comentarios";
  return path;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const url = new URL(redirectTo, request.url);

  try {
    await deleteClientReviewById(id);
    url.searchParams.set("saved", "1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el comentario.";
    url.searchParams.set("error", encodeURIComponent(message));
  }

  return NextResponse.redirect(url, { status: 303 });
}

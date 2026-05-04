import { NextResponse } from "next/server";
import { deleteRows, getExpenseById } from "@/lib/admin/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ZYTERON_EXPENSE_BUCKET } from "@/lib/company";

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/gastos")) return "/admin/gastos";
  return path;
}

function buildRedirectUrl(request: Request, path: string) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || "";
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "";
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "");
  const origin = `${protocol}://${host}`;
  return new URL(path, origin);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const url = buildRedirectUrl(request, redirectTo);

  try {
    const expense = await getExpenseById(id);

    if (expense?.invoiceFilePath) {
      const { supabase } = createSupabaseServerClient();
      await supabase.storage.from(ZYTERON_EXPENSE_BUCKET).remove([expense.invoiceFilePath]);
    }

    await deleteRows("Expense", { id });
    url.searchParams.set("saved", "1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el gasto.";
    url.searchParams.set("error", message);
  }

  return NextResponse.redirect(url, { status: 303 });
}

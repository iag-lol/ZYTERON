import { NextResponse } from "next/server";
import { deleteRows, getExpenseById } from "@/lib/admin/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ZYTERON_EXPENSE_BUCKET } from "@/lib/company";

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/gastos")) return "/admin/gastos";
  return path;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const url = new URL(redirectTo, request.url);

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

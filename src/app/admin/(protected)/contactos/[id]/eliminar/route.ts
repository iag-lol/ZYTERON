import { NextResponse } from "next/server";
import { deleteRows } from "@/lib/admin/repository";

/**
 * Elimina un contacto (Lead). Protegido por el middleware de /admin.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  try {
    await deleteRows("Lead", { id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el contacto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

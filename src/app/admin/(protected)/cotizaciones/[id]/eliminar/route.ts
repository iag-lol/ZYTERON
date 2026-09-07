import { NextResponse } from "next/server";
import { deleteRows } from "@/lib/admin/repository";

/**
 * Elimina una cotización. Las tablas relacionadas usan `on delete cascade`
 * (QuoteExtra) o `on delete set null` (WorkOrder, Project, TaxDocument, Sale),
 * por lo que basta con borrar la fila de Quote.
 *
 * Protegido por el middleware de /admin. Responde JSON para el botón cliente.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Falta el identificador de la cotización." }, { status: 400 });
  }

  try {
    // Borramos primero los extras por si la BD no tiene el cascade aplicado.
    await deleteRows("QuoteExtra", { quoteId: id }).catch(() => {});
    await deleteRows("Quote", { id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la cotización.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

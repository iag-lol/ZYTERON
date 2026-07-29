import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { contractFileBytes, contractFileUrl, getContract } from "@/lib/commercial/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entrega el documento almacenado. Los archivos viven en un bucket privado:
 * se leen desde el backend con el service role y se transmiten al
 * administrador autenticado. Nunca se expone una URL pública.
 *
 *   ?kind=signed        → copia firmada en vez del original
 *   ?disposition=attachment → fuerza la descarga (por defecto se abre inline
 *                             para poder imprimirlo desde el visor)
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "signed" ? "signed" : "original";
  const disposition = url.searchParams.get("disposition") === "attachment" ? "attachment" : "inline";

  const contract = await getContract(id);
  if (!contract) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });

  const actor = { id: "session" in auth ? auth.session.user.id : "legacy-admin" };
  // Deja constancia de la descarga y valida que el archivo exista.
  const signed = await contractFileUrl(actor, id, kind);
  if (!signed.ok) return NextResponse.json({ error: signed.error }, { status: 404 });

  const storagePath = kind === "signed" ? contract.signed_pdf_path : contract.pdf_path;
  const bytes = storagePath ? await contractFileBytes(storagePath) : null;
  if (!bytes) return NextResponse.json({ error: "No se pudo recuperar el documento." }, { status: 404 });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${signed.filename}"`,
      "Cache-Control": "no-store, private",
    },
  });
}

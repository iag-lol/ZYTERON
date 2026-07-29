import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { SIGNATURE_TYPE_INFO } from "@/config/contracts";
import { uploadSignedContract } from "@/lib/commercial/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Recepción de la copia firmada. Llega como multipart porque incluye el
 * archivo; se valida formato y tamaño antes de guardarlo en el bucket
 * privado y calcular su hash.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No se recibió el archivo." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Adjunta el PDF firmado." }, { status: 400 });
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "La copia firmada debe ser un archivo PDF." }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 15 MB permitidos." }, { status: 400 });
  }

  const signedAt = String(form.get("signedAt") ?? "").trim();
  if (!DATE_RE.test(signedAt)) {
    return NextResponse.json({ error: "Indica una fecha de firma válida." }, { status: 400 });
  }
  const signatureKey = String(form.get("signatureType") ?? "").trim();
  const signatureType = SIGNATURE_TYPE_INFO[signatureKey];
  if (!signatureType) return NextResponse.json({ error: "Selecciona el tipo de firma." }, { status: 400 });

  const notes = String(form.get("notes") ?? "").trim();
  const bytes = new Uint8Array(await file.arrayBuffer());

  const actor = { id: "session" in auth ? auth.session.user.id : "legacy-admin" };
  const result = await uploadSignedContract(
    actor,
    id,
    { bytes, contentType: file.type },
    { signedAt, signatureType, notes: notes || null },
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

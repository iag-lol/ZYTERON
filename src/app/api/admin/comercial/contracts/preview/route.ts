import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { recordAudit } from "@/lib/commercial/audit";
import { previewPdf } from "@/lib/commercial/contracts";
import { contractConfigSchema, normalizeConfig } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ ownerId: z.string().uuid(), config: contractConfigSchema });

/**
 * Vista previa del documento. Genera el PDF con marca de agua "BORRADOR" y
 * no persiste nada: sirve para revisar antes de emitir el definitivo.
 */
export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  const result = await previewPdf(parsed.data.ownerId, normalizeConfig(parsed.data.config));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await recordAudit({
    actorId: "session" in auth ? auth.session.user.id : "legacy-admin",
    entity: "contract",
    entityLabel: result.filename,
    action: "preview_generated",
    summary: "Se generó una vista previa del contrato.",
    ownerId: parsed.data.ownerId,
  });

  return new NextResponse(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

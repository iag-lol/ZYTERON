import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { saveCertificateMeta, getCertificateStatus } from "@/lib/dte/dte-store";
import { writeTaxAudit } from "@/lib/sii/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const certificate = await getCertificateStatus();
  return NextResponse.json({ certificate });
}

// Recibimos la contraseña (se cifra en reposo) y el nombre del archivo. El
// archivo .pfx/.p12 en sí se integra en la etapa criptográfica (Fase 2).
const schema = z.object({
  password: z.string().min(1).max(200),
  fileName: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const actor = "session" in auth ? auth.session.user.id : "legacy-admin";
  const result = await saveCertificateMeta({
    password: parsed.data.password,
    fileName: parsed.data.fileName,
    uploadedBy: actor,
  });
  await writeTaxAudit({
    userId: actor,
    action: "certificate_upload",
    entity: "tax_certificates",
    entityId: result.ok ? result.id : null,
    result: result.ok ? "ok" : "error",
    reason: result.ok ? undefined : result.error,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

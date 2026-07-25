import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { uploadCaf, listCaf } from "@/lib/dte/dte-store";
import { writeTaxAudit } from "@/lib/sii/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const caf = await listCaf();
  return NextResponse.json({ caf });
}

const schema = z.object({ xml: z.string().min(20).max(200000) });

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "XML de CAF inválido." }, { status: 400 });

  const actor = "session" in auth ? auth.session.user.id : "legacy-admin";
  const result = await uploadCaf({ xml: parsed.data.xml, uploadedBy: actor });
  await writeTaxAudit({
    userId: actor,
    action: "caf_upload",
    entity: "tax_caf_files",
    entityId: result.ok ? result.id : null,
    result: result.ok ? "ok" : "error",
    reason: result.ok ? undefined : result.error,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

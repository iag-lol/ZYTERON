import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { confirmDteDocument } from "@/lib/dte/dte-store";
import { writeTaxAudit } from "@/lib/sii/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const actor = "session" in auth ? auth.session.user.id : "legacy-admin";

  const result = await confirmDteDocument(id, actor);
  await writeTaxAudit({
    userId: actor,
    action: "dte_confirm",
    entity: "tax_documents",
    entityId: id,
    result: result.ok ? "ok" : "error",
    reason: result.ok ? `folio ${result.folio}` : result.error,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

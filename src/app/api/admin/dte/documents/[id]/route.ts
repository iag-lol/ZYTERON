import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { getDteDocument } from "@/lib/dte/dte-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const data = await getDteDocument(id);
  if (!data) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json(data);
}

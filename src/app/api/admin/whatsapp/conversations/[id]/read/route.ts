import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { markConversationRead } from "@/lib/whatsapp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  await markConversationRead(id);
  return NextResponse.json({ ok: true });
}

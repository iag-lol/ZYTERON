import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { listQuickReplies } from "@/lib/whatsapp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const quickReplies = await listQuickReplies();
  return NextResponse.json({ quickReplies });
}

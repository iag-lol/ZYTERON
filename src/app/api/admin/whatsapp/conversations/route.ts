import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { listConversations } from "@/lib/whatsapp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  try {
    const conversations = await listConversations(150);
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[whatsapp] list error:", err);
    return NextResponse.json({ conversations: [] });
  }
}

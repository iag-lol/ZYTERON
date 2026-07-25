import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { getConversation, updateConversation, listRecentMessages } from "@/lib/whatsapp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  const messages = await listRecentMessages(id, 100);
  return NextResponse.json({ conversation, messages });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Si toma la conversación, asigna el usuario actual.
  if (body.mode === "human" && !body.assigned_user_id) {
    const userId = "session" in auth ? auth.session.user.id : null;
    if (userId) body.assigned_user_id = userId;
  }

  const conversation = await updateConversation(id, body);
  if (!conversation) return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  return NextResponse.json({ conversation });
}

import { NextResponse } from "next/server";
import {z} from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { getConversation, updateConversation, listRecentMessages, deleteConversation } from "@/lib/whatsapp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  const query=new URL(_req.url).searchParams;
  const cursor=query.has("before")?z.object({date:z.iso.datetime({offset:true}),id:z.uuid()}).safeParse({date:query.get("before"),id:query.get("beforeId")}):null;
  if(cursor&&!cursor.success)return NextResponse.json({error:"Cursor de mensajes inválido."},{status:400});
  const messages = await listRecentMessages(id, 100, cursor?.success?cursor.data:undefined);
  return NextResponse.json({ conversation, messages,hasMore:messages.length===100 },{headers:{"cache-control":"no-store"}});
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

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const ok = await deleteConversation(id);
  if (!ok) return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

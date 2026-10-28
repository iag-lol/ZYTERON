import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { boundedJson, intakeFailure, withPublicSubmission } from "@/lib/security/public-intake";
const schema = z
  .object({ requestId: z.string().uuid().optional(), message: z.string().trim().min(2).max(5000) })
  .strict();
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success)
      return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
    const body = schema.safeParse(await boundedJson(req, 16384));
    if (!body.success) return NextResponse.json({ error: "Revisa la respuesta." }, { status: 400 });
    await withPublicSubmission(
      "admin-chat/" + id,
      body.data.requestId || randomUUID(),
      body.data,
      async (db) => {
        const t = await db.$queryRaw<
          Array<{ legacy_user_id: string | null; processing: boolean }>
        >`SELECT legacy_user_id,(reply_lease>now() AND awaiting_reply) IS TRUE AS processing FROM sales_threads WHERE id=${id}::uuid AND channel='WEB_CHAT' FOR UPDATE`;
        if (!t.length) throw new Error("CHAT_NOT_FOUND");
        if (t[0].processing) throw new Error("CHAT_AI_BUSY");
        await db.$executeRaw`INSERT INTO sales_messages(id,thread_id,direction,from_name,body_text,body_preview,actor_kind,sent_at) VALUES(${randomUUID()}::uuid,${id}::uuid,'OUTBOUND','Equipo Zyteron',${body.data.message},${body.data.message.slice(0, 240)},'STAFF',now())`;
        await db.$executeRaw`UPDATE sales_threads SET awaiting_reply=false,last_message_at=now(),message_count=(SELECT count(*) FROM sales_messages WHERE thread_id=${id}::uuid) WHERE id=${id}::uuid`;
        if (t[0].legacy_user_id) {
          await db.clientNotification.create({
            data: {
              userId: t[0].legacy_user_id,
              title: "Zyteron respondió tu conversación",
              body: body.data.message.slice(0, 240),
              link: "/clientes/panel/comunicacion",
            },
          });
          await db.clientAuditLog.create({
            data: {
              actorId: auth.legacy ? null : auth.session.user.id,
              targetUserId: t[0].legacy_user_id,
              action: "ADMIN_CHAT_REPLIED",
              entityType: "sales_threads",
              entityId: id,
            },
          });
        }
        return { ok: true };
      },
    );
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "CHAT_AI_BUSY")
      return NextResponse.json(
        { error: "Zara está respondiendo. Tu borrador está guardado; envíalo cuando termine." },
        { status: 409 },
      );
    if (error instanceof Error && error.message === "CHAT_NOT_FOUND")
      return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
    return intakeFailure(error);
  }
}

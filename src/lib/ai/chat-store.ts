import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";
export const chatCookieName =
  process.env.NODE_ENV === "production" ? "__Host-zyteron-chat" : "zyteron-chat-local";
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
type Thread = {
  id: string;
  legacy_user_id: string | null;
  visitor_hash: string | null;
  reply_key: string | null;
  reply_lease: Date | null;
};
export type ChatContext = {
  threadId: string;
  userId: string | null;
  cookie: string;
  requestId: string;
  replay: string | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};
async function principal() {
  const s = await getPortalSession();
  return s?.user.id && s.user.accountStatus === "ACTIVE" && s.user.emailVerifiedAt
    ? s.user.id
    : null;
}
function token(req: Request) {
  const value =
    req.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(chatCookieName + "="))
      ?.slice(chatCookieName.length + 1) || "";
  return /^[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
export async function beginChat(
  req: Request,
  content: string,
  requestId: string,
): Promise<ChatContext> {
  const userId = await principal();
  let value = token(req);
  return prisma.$transaction(
    async (db) => {
      let thread: Thread | undefined;
      if (value) {
        const [id, key] = value.split(".");
        thread = (
          await db.$queryRaw<
            Thread[]
          >`SELECT id,legacy_user_id,visitor_hash,reply_key,reply_lease FROM sales_threads WHERE id=${id}::uuid AND channel='WEB_CHAT' FOR UPDATE`
        )[0];
        if (
          !thread ||
          thread.visitor_hash !== digest(key) ||
          (thread.legacy_user_id !== null && thread.legacy_user_id !== userId)
        )
          thread = undefined;
      }
      if (!thread) {
        const id = randomUUID(),
          key = randomBytes(32).toString("base64url");
        value = id + "." + key;
        await db.$executeRaw`INSERT INTO sales_threads(id,channel,legacy_user_id,visitor_hash,subject,participants,message_count,awaiting_reply) VALUES(${id}::uuid,'WEB_CHAT',${userId},${digest(key)},'Conversación con Zyteron',ARRAY[]::text[],0,true)`;
        thread = {
          id,
          legacy_user_id: userId,
          visitor_hash: digest(key),
          reply_key: null,
          reply_lease: null,
        };
      }
      if (!thread.legacy_user_id && userId)
        await db.$executeRaw`UPDATE sales_threads SET legacy_user_id=${userId} WHERE id=${thread.id}::uuid AND legacy_user_id IS NULL`;
      const existing = await db.$queryRaw<
        Array<{ direction: string; body_text: string }>
      >`SELECT direction,body_text FROM sales_messages WHERE thread_id=${thread.id}::uuid AND request_key=${requestId}`;
      const incoming = existing.find((m) => m.direction === "INBOUND");
      if (incoming && incoming.body_text !== content) throw new Error("CHAT_REQUEST_CONFLICT");
      const replay = existing.find((m) => m.direction === "OUTBOUND")?.body_text || null;
      if (!replay && thread.reply_lease && thread.reply_lease > new Date())
        throw new Error("CHAT_REPLY_IN_PROGRESS");
      if (!incoming)
        await db.$executeRaw`INSERT INTO sales_messages(id,thread_id,direction,from_name,body_text,body_preview,actor_kind,request_key,sent_at) VALUES(${randomUUID()}::uuid,${thread.id}::uuid,'INBOUND','Cliente',${content},${content.slice(0, 240)},'USER',${requestId},now())`;
      if (!replay)
        await db.$executeRaw`UPDATE sales_threads SET reply_key=${requestId},reply_lease=now()+interval '3 minutes',awaiting_reply=true,last_message_at=now(),message_count=(SELECT count(*) FROM sales_messages WHERE thread_id=${thread.id}::uuid) WHERE id=${thread.id}::uuid`;
      const messages = await db.$queryRaw<
        Array<{ direction: string; body_text: string }>
      >`SELECT direction,body_text FROM sales_messages WHERE thread_id=${thread.id}::uuid ORDER BY created_at DESC LIMIT 24`;
      return {
        threadId: thread.id,
        userId,
        cookie: value!,
        requestId,
        replay,
        history: messages.reverse().map((m) => ({
          role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
          content: m.body_text.slice(0, 4000),
        })),
      };
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
export async function finishChat(context: ChatContext, text: string) {
  const content =
    text.trim().slice(0, 20000) || "No pude completar la respuesta. Puedes intentarlo nuevamente.";
  await prisma.$transaction(async (db) => {
    const rows = await db.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM sales_threads WHERE id=${context.threadId}::uuid AND reply_key=${context.requestId} FOR UPDATE`;
    if (!rows.length) throw new Error("CHAT_LEASE_LOST");
    await db.$executeRaw`INSERT INTO sales_messages(id,thread_id,direction,from_name,body_text,body_preview,actor_kind,request_key,sent_at) VALUES(${randomUUID()}::uuid,${context.threadId}::uuid,'OUTBOUND','Zara · Zyteron',${content},${content.slice(0, 240)},'AI',${context.requestId},now()) ON CONFLICT DO NOTHING`;
    await db.$executeRaw`UPDATE sales_threads SET reply_key=NULL,reply_lease=NULL,awaiting_reply=false,last_message_at=now(),message_count=(SELECT count(*) FROM sales_messages WHERE thread_id=${context.threadId}::uuid) WHERE id=${context.threadId}::uuid AND reply_key=${context.requestId}`;
  });
}
export async function chatHistory(req: Request) {
  const value = token(req);
  if (!value) return [];
  const [id, key] = value.split("."),
    userId = await principal();
  const rows = await prisma.$queryRaw<
    Thread[]
  >`SELECT id,legacy_user_id,visitor_hash,reply_key,reply_lease FROM sales_threads WHERE id=${id}::uuid AND channel='WEB_CHAT'`;
  const thread = rows[0];
  if (
    !thread ||
    thread.visitor_hash !== digest(key) ||
    (thread.legacy_user_id !== null && thread.legacy_user_id !== userId)
  )
    return [];
  return prisma.$queryRaw<
    Array<{ id: string; role: string; content: string }>
  >`SELECT id,CASE WHEN direction='INBOUND' THEN 'user' ELSE 'assistant' END AS role,body_text AS content,actor_kind AS actor FROM (SELECT id,direction,body_text,actor_kind,created_at FROM sales_messages WHERE thread_id=${id}::uuid ORDER BY created_at DESC LIMIT 60) recent ORDER BY created_at`;
}

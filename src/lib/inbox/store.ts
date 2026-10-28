import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { legacyViewId } from "@/lib/full-control/legacy-id";
import { HANDOFF_SIGNAL } from "@/lib/ai/handoff-signal";
import {
  inboxIdentity,
  type InboxConversation,
  type InboxDetail,
  type InboxMessage,
  type InboxSource,
} from "./model";

// Only conversation fields leave this query; visitor secrets and AI lease keys stay on the server.
function conversations(source?: InboxSource, id?: string) {
  const match = (kind: InboxSource, column: Prisma.Sql) =>
    source && source !== kind
      ? Prisma.sql`false`
      : id
        ? Prisma.sql`${column}::text=${id}`
        : Prisma.sql`true`;
  return Prisma.sql`
    SELECT t.id::text, 'web' AS source, coalesce(nullif(trim(u.name),''),nullif(trim(u."contactName"),''),l.name) AS name,
      coalesce(u.company,q.company) AS company, coalesce(u.email,l.email) AS email,
      coalesce(u.phone,l.phone) AS phone, t.subject, 'WEB_CHAT' AS channel, 'OPEN' AS status,
      'NORMAL' AS priority, coalesce(m.body_text,'') AS preview,
      CASE m.actor_kind WHEN 'USER' THEN 'CLIENT' WHEN 'AI' THEN 'AI' WHEN 'STAFF' THEN 'TEAM' ELSE 'SYSTEM' END AS actor,
      coalesce(t.last_message_at,t.created_at) AS updated, t.created_at AS created,
      incoming.created_at AS incoming, (t.reply_lease>now() AND t.awaiting_reply) IS TRUE AS processing,
      t.awaiting_reply AS waiting, NULL::text AS client, NULL::text AS reference
    FROM sales_threads t LEFT JOIN "User" u ON u.id=t.legacy_user_id
    LEFT JOIN "Lead" l ON l.id=t.lead_id LEFT JOIN "Quote" q ON q.id=t.quote_id
    LEFT JOIN LATERAL (SELECT body_text,actor_kind FROM sales_messages WHERE thread_id=t.id ORDER BY created_at DESC,id DESC LIMIT 1) m ON true
    LEFT JOIN LATERAL (SELECT created_at FROM sales_messages WHERE thread_id=t.id AND actor_kind='USER' ORDER BY created_at DESC,id DESC LIMIT 1) incoming ON true
    WHERE t.channel='WEB_CHAT' AND ${match("web", Prisma.sql`t.id`)}
    UNION ALL
    SELECT t.id::text,'ticket',c.name,coalesce(cl.trade_name,cl.legal_name),c.email,c.phone,t.subject,t.channel,t.status,t.priority,
      coalesce(m.body,t.description),coalesce(m.actor,'CLIENT'),greatest(t.updated_at,m.created_at),t.created_at,
      coalesce(incoming.created_at,t.created_at),false,false,t.client_id::text,t.ticket_number
    FROM support_tickets t LEFT JOIN clients cl ON cl.id=t.client_id LEFT JOIN client_contacts c ON c.id=t.client_contact_id
    LEFT JOIN LATERAL (SELECT body,created_at,CASE author_type WHEN 'CLIENT' THEN 'CLIENT' WHEN 'SYSTEM' THEN 'SYSTEM' ELSE 'TEAM' END AS actor FROM ticket_messages WHERE ticket_id=t.id AND visibility='PUBLIC_REPLY' ORDER BY created_at DESC,id DESC LIMIT 1) m ON true
    LEFT JOIN LATERAL (SELECT created_at FROM ticket_messages WHERE ticket_id=t.id AND author_type='CLIENT' ORDER BY created_at DESC,id DESC LIMIT 1) incoming ON true
    WHERE t.archived_at IS NULL AND ${match("ticket", Prisma.sql`t.id`)}
    UNION ALL
    SELECT t.id,'native',u.name,u.company,u.email,u.phone,t.title,'PORTAL',t.status,t.priority,
      coalesce(m.message,t.description),coalesce(m.actor,'CLIENT'),greatest(t."updatedAt",m."createdAt"),t."createdAt",
      coalesce(incoming."createdAt",t."createdAt"),false,false,NULL,NULL
    FROM "SupportTicket" t JOIN "User" u ON u.id=t."userId"
    LEFT JOIN LATERAL (SELECT message,"createdAt",CASE WHEN "authorRole"::text='CLIENT' THEN 'CLIENT' ELSE 'TEAM' END AS actor FROM "SupportTicketMessage" WHERE "ticketId"=t.id AND NOT "isInternal" ORDER BY "createdAt" DESC,id DESC LIMIT 1) m ON true
    LEFT JOIN LATERAL (SELECT "createdAt" FROM "SupportTicketMessage" WHERE "ticketId"=t.id AND "authorRole"::text='CLIENT' ORDER BY "createdAt" DESC,id DESC LIMIT 1) incoming ON true
    WHERE ${match("native", Prisma.sql`t.id`)}
    UNION ALL
    SELECT t.id,'request',u.name,u.company,u.email,u.phone,t.title,'PORTAL',t.status,'NORMAL',coalesce(m.message,t.details),
      CASE WHEN m.id IS NULL THEN 'CLIENT' ELSE 'TEAM' END,greatest(t."updatedAt",m.created),t."createdAt",t."createdAt",false,false,NULL,NULL
    FROM "PortalRequest" t JOIN "User" u ON u.id=t."userId"
    LEFT JOIN LATERAL (SELECT cc.id,cc.message,cc."createdAt" AS created FROM "ClientAuditLog" a
      JOIN "ClientCommunication" cc ON cc.id=a.details->>'communicationId' AND cc."userId"=t."userId"
      WHERE a."entityType"='PortalRequest' AND a."entityId"=t.id ORDER BY cc."createdAt" DESC,cc.id DESC LIMIT 1) m ON true
    WHERE ${match("request", Prisma.sql`t.id`)}
  `;
}
type Row = {
  id: string;
  source: InboxSource;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  subject: string;
  channel: string;
  status: string;
  priority: string;
  preview: string;
  actor: InboxConversation["lastActor"];
  updated: Date;
  created: Date;
  incoming: Date | null;
  processing: boolean;
  waiting: boolean;
  client: string | null;
  reference: string | null;
  read_at: Date | null;
};
function normalize(row: Row): InboxConversation {
  const publicId = legacyViewId(row.source === "native" ? "ticket" : row.source, row.id);
  return {
    id: row.id,
    publicId,
    key: `${row.source}/${row.id}`,
    source: row.source,
    name: inboxIdentity(row),
    company: row.company,
    email: row.email,
    phone: row.phone,
    subject: row.subject || "Conversación con Zyteron",
    reference: row.reference || `SOL-${publicId.slice(0, 8).toUpperCase()}`,
    channel: row.channel,
    status: row.status,
    priority: row.priority,
    preview: row.preview.replaceAll(HANDOFF_SIGNAL, "").slice(0, 240),
    lastActor: row.actor,
    updatedAt: row.updated.toISOString(),
    createdAt: row.created.toISOString(),
    lastIncomingAt: row.incoming?.toISOString() || null,
    readAt: row.read_at?.toISOString() || null,
    replyInProgress: row.processing,
    awaitingReply: row.waiting,
    clientId: row.client,
  };
}
export async function listInbox(
  actor: string,
  search: string,
  filter: string,
  offset: number,
  limit = 50,
) {
  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    WITH conversations AS (${conversations()}) SELECT c.*,r.read_at FROM conversations c
    LEFT JOIN zyteron_inbox_reads r ON r.source=c.source AND r.record_id=c.id AND r.actor_id=${actor}
    WHERE (${search}='' OR concat_ws(' ',c.name,c.company,c.email,c.subject,c.reference,c.id) ILIKE ${`%${search}%`})
    AND (${filter}='all' OR (${filter}='web' AND c.source='web')
      OR (${filter}='unread' AND c.incoming IS NOT NULL AND (r.read_at IS NULL OR c.incoming>r.read_at))
      OR (${filter}='ai' AND c.processing)
      OR (${filter}='waiting' AND NOT c.processing AND (c.waiting OR c.actor='CLIENT') AND c.status NOT IN ('CLOSED','RESOLVED','CANCELLED','COMPLETED','REJECTED')))
    ORDER BY c.updated DESC,c.source,c.id DESC LIMIT ${limit + 1} OFFSET ${offset}`);
  return { items: rows.slice(0, limit).map(normalize), hasMore: rows.length > limit };
}
export async function inboxConversation(actor: string, source: InboxSource, id: string) {
  const rows = await prisma.$queryRaw<
    Row[]
  >(Prisma.sql`WITH conversations AS (${conversations(source, id)})
    SELECT c.*,r.read_at FROM conversations c LEFT JOIN zyteron_inbox_reads r
    ON r.source=c.source AND r.record_id=c.id AND r.actor_id=${actor} LIMIT 1`);
  return rows[0] ? normalize(rows[0]) : null;
}
export async function inboxDetail(
  actor: string,
  source: InboxSource,
  id: string,
  before?: { date: Date; id: string },
): Promise<InboxDetail | null> {
  const conversation = await inboxConversation(actor, source, id);
  if (!conversation) return null;
  const cursor = (date: Prisma.Sql, key: Prisma.Sql) =>
    before ? Prisma.sql`AND (${date},${key}::text)<(${before.date},${before.id})` : Prisma.empty;
  let rows: Array<{
    id: string;
    body: string;
    actor: InboxMessage["actor"];
    sender: string | null;
    created: Date;
    internal: boolean;
  }> = [];
  if (source === "web")
    rows = await prisma.$queryRaw(Prisma.sql`SELECT id::text,body_text AS body,
    CASE actor_kind WHEN 'USER' THEN 'CLIENT' WHEN 'AI' THEN 'AI' WHEN 'STAFF' THEN 'TEAM' ELSE 'SYSTEM' END AS actor,
    from_name AS sender,created_at AS created,false AS internal FROM sales_messages WHERE thread_id=${id}::uuid
    ${cursor(Prisma.sql`created_at`, Prisma.sql`id`)} ORDER BY created_at DESC,id DESC LIMIT 61`);
  else if (source === "ticket")
    rows = await prisma.$queryRaw(Prisma.sql`SELECT id::text,body,
    CASE author_type WHEN 'CLIENT' THEN 'CLIENT' WHEN 'SYSTEM' THEN 'SYSTEM' ELSE 'TEAM' END AS actor,
    NULL::text AS sender,created_at AS created,visibility='INTERNAL_NOTE' AS internal FROM ticket_messages
    WHERE ticket_id=${id}::uuid ${cursor(Prisma.sql`created_at`, Prisma.sql`id`)} ORDER BY created_at DESC,id DESC LIMIT 61`);
  else if (source === "native")
    rows = await prisma.$queryRaw(Prisma.sql`SELECT id,message AS body,
    CASE WHEN "authorRole"::text='CLIENT' THEN 'CLIENT' ELSE 'TEAM' END AS actor,NULL::text AS sender,
    "createdAt" AS created,"isInternal" AS internal FROM "SupportTicketMessage" WHERE "ticketId"=${id}
    ${cursor(Prisma.sql`"createdAt"`, Prisma.sql`id`)} ORDER BY "createdAt" DESC,id DESC LIMIT 61`);
  else
    rows =
      await prisma.$queryRaw(Prisma.sql`SELECT cc.id,cc.message AS body,'TEAM' AS actor,NULL::text AS sender,
    cc."createdAt" AS created,false AS internal FROM "ClientAuditLog" a JOIN "ClientCommunication" cc ON cc.id=a.details->>'communicationId'
    JOIN "PortalRequest" r ON r.id=a."entityId" AND r."userId"=cc."userId"
    WHERE a."entityType"='PortalRequest' AND r.id=${id}
    ${cursor(Prisma.sql`cc."createdAt"`, Prisma.sql`cc.id`)} ORDER BY cc."createdAt" DESC,cc.id DESC LIMIT 61`);
  const hasMore = rows.length > 60;
  const messages = rows
    .slice(0, 60)
    .reverse()
    .map((row) => ({
      id: row.id,
      actor: row.actor,
      internal: row.internal,
      body: (row.body || "").replaceAll(HANDOFF_SIGNAL, ""),
      createdAt: row.created.toISOString(),
      sender:
        row.actor === "AI"
          ? "Zara · IA"
          : row.actor === "CLIENT"
            ? conversation.name
            : row.actor === "SYSTEM"
              ? "Sistema"
              : row.sender || "Equipo Zyteron",
    }));
  // Support descriptions are the first message, independently of the paginated reply history.
  if (source !== "web" && !hasMore) {
    const opening =
      source === "ticket"
        ? await prisma.$queryRaw<
            Array<{ body: string }>
          >`SELECT description AS body FROM support_tickets WHERE id=${id}::uuid`
        : source === "native"
          ? await prisma.supportTicket
              .findUnique({ where: { id }, select: { description: true } })
              .then((r) => (r ? [{ body: r.description }] : []))
          : await prisma.portalRequest
              .findUnique({ where: { id }, select: { details: true } })
              .then((r) => (r ? [{ body: r.details }] : []));
    if (opening[0])
      messages.unshift({
        id: `opening-${id}`,
        body: opening[0].body,
        actor: "CLIENT",
        sender: conversation.name,
        createdAt: conversation.createdAt,
        internal: false,
      });
  }
  const first = rows.slice(0, 60).at(-1);
  return {
    conversation,
    messages,
    hasMore,
    nextBefore: hasMore && first ? { date: first.created.toISOString(), id: first.id } : null,
  };
}
export async function markInboxRead(actor: string, conversation: InboxConversation) {
  if (!conversation.lastIncomingAt) return;
  await prisma.$executeRaw`INSERT INTO zyteron_inbox_reads(source,record_id,actor_id,read_at)
    VALUES(${conversation.source},${conversation.id},${actor},${new Date(conversation.lastIncomingAt)})
    ON CONFLICT(source,record_id,actor_id) DO UPDATE SET read_at=greatest(zyteron_inbox_reads.read_at,EXCLUDED.read_at)`;
}

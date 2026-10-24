import "server-only";
import { prisma } from "@/lib/prisma";
import { legacyViewId } from "./legacy-id";
import { parseQuoteMessage } from "@/lib/admin/quote";
import { assertSubscriptionArchivable } from "./subscription-archive-policy";
export async function archiveClientQuote(
  id: string,
  input: { clientId: string; reason: string; actorId: string | null },
) {
  await prisma.$transaction(
    async (db) => {
      await db.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${"monthly:" + id}))`;
      const [previous] = await db.$queryRaw<
        Array<{ state: string;client_id:string }>
      >`SELECT state,client_id FROM zyteron_archived_quotes WHERE quote_id=${id}::uuid`;
      if(previous&&previous.client_id!==input.clientId)throw Error("QUOTE_CLIENT_MISMATCH");
      if (previous?.state === "ARCHIVED") return;
      const nativeId = (await db.quote.findMany({ select: { id: true } })).find(
        (q) => legacyViewId("quote", q.id) === id,
      )?.id;
      let clientId: string | null = null;
      if (nativeId) {
        await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${nativeId} FOR UPDATE`;
        const q = await db.quote.findUniqueOrThrow({ where: { id: nativeId } });
        const meta = parseQuoteMessage(q.message);
        if (meta.payment?.subscription?.subscriptionId) {
          const [life] = await db.$queryRaw<
            Array<{ state: string; verified_at: Date | null }>
          >`SELECT state,verified_at FROM zyteron_recurring_lifecycle WHERE quote_id=${q.id}`;
          assertSubscriptionArchivable(meta.payment.subscription, life, false);
        } else if (meta.payment?.subscription?.registerToken) {
          const operations = await db.$queryRaw<
            Array<{ id: string }>
          >`SELECT id FROM zyteron_provider_operation WHERE quote_id=${q.id} AND dedupe LIKE '%/monthly-subscription/%' LIMIT 1`;
          assertSubscriptionArchivable(meta.payment.subscription, undefined, operations.length > 0);
        }
        const rows = await db.$queryRaw<
          Array<{ client_id: string }>
        >`SELECT l.client_id FROM zyteron_legacy_client_link l JOIN "User" u ON u.id=l.user_id WHERE u.role='CLIENT' AND (u.id=${q.userId} OR (${q.userId}::text IS NULL AND lower(u.email)=lower(${q.email})))`;
        clientId = rows[0]?.client_id || null;
      } else {
        const rows = await db.$queryRaw<
          Array<{ client_id: string | null }>
        >`SELECT client_id FROM quotes WHERE id=${id}::uuid FOR UPDATE`;
        clientId = rows[0]?.client_id || null;
      }
      if (!clientId || clientId !== input.clientId) throw Error("QUOTE_CLIENT_MISMATCH");
      await db.$queryRaw`SELECT id FROM quote_payment_plans WHERE quote_id=${id}::uuid FOR UPDATE`;
      const plans = await db.$queryRaw<
        Array<{ id: string }>
      >`UPDATE quote_payment_plans SET status='CANCELLED',cancel_reason=${input.reason},updated_at=now() WHERE quote_id=${id}::uuid AND status<>'CANCELLED' RETURNING id`;
      for (const p of plans)
        await db.$queryRaw`SELECT public.quote_payment_reschedule(${p.id}::uuid)`;
      await db.$executeRaw`UPDATE zyteron_monthly_plans SET status='PAUSED',reminders_enabled=false,updated_at=now() WHERE quote_id=${id}::uuid`;
      await db.$executeRaw`UPDATE zyteron_quote_collection_settings SET reminders_enabled=false,suspension_enabled=false,revision=revision+1,updated_at=now() WHERE quote_id=${id}::uuid`;
      await db.$executeRaw`UPDATE zyteron_billing_notices SET state='SUPPRESSED' WHERE plan_id IN(SELECT id FROM zyteron_monthly_plans WHERE quote_id=${id}::uuid) AND state='PENDING'`;
      await db.$executeRaw`INSERT INTO zyteron_archived_quotes(quote_id,client_id,reason,actor_id,native_quote_id,state) VALUES(${id}::uuid,${clientId}::uuid,${input.reason},${input.actorId},${nativeId ?? null},'ARCHIVED') ON CONFLICT(quote_id) DO UPDATE SET state='ARCHIVED'`;
      await db.clientAuditLog.create({
        data: {
          actorId: input.actorId,
          action: "CLIENT_QUOTE_ARCHIVED",
          entityType: "Quote",
          entityId: id,
          details: { clientId, reason: input.reason, paidHistoryPreserved: true },
        },
      });
    },
    { timeout: 20_000 },
  );
}
export async function finalizePendingQuoteArchive(rawId: string) {
  const rows = await prisma.$queryRaw<
    Array<{ quote_id: string; client_id: string; reason: string; actor_id: string | null }>
  >`SELECT quote_id,client_id,reason,actor_id FROM zyteron_archived_quotes WHERE native_quote_id=${rawId} AND state='PENDING_CANCELLATION'`;
  for (const row of rows)
    await archiveClientQuote(row.quote_id, {
      clientId: row.client_id,
      reason: row.reason,
      actorId: row.actor_id,
    });
}

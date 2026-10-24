import { assertSubscriptionArchivable } from "@/lib/full-control/subscription-archive-policy";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { boundedJson } from "@/lib/security/public-intake";
import { legacyViewId } from "@/lib/full-control/legacy-id";
import { parseQuoteMessage } from "@/lib/admin/quote";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const id = z.uuid().parse((await params).id);
    const body = z
      .object({ clientId: z.uuid(), reason: z.string().trim().min(3).max(500) })
      .strict()
      .parse(await boundedJson(req, 2048));
    await prisma.$transaction(
      async (db) => {
        await db.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${"monthly:" + id}))`;
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
            assertSubscriptionArchivable(
              meta.payment.subscription,
              undefined,
              operations.length > 0,
            );
          }
          const rows = await db.$queryRaw<
            Array<{ client_id: string }>
          >`SELECT client_id FROM zyteron_legacy_client_link WHERE user_id=${q.userId}`;
          clientId = rows[0]?.client_id || null;
        } else {
          const rows = await db.$queryRaw<
            Array<{ client_id: string | null }>
          >`SELECT client_id FROM quotes WHERE id=${id}::uuid FOR UPDATE`;
          clientId = rows[0]?.client_id || null;
        }
        if (!clientId || clientId !== body.clientId) throw Error("QUOTE_CLIENT_MISMATCH");
        await db.$queryRaw`SELECT id FROM quote_payment_plans WHERE quote_id=${id}::uuid FOR UPDATE`;
        const plans = await db.$queryRaw<
          Array<{ id: string }>
        >`UPDATE quote_payment_plans SET status='CANCELLED',cancel_reason=${body.reason},updated_at=now() WHERE quote_id=${id}::uuid AND status<>'CANCELLED' RETURNING id`;
        for (const p of plans)
          await db.$queryRaw`SELECT public.quote_payment_reschedule(${p.id}::uuid)`;
        await db.$executeRaw`UPDATE zyteron_monthly_plans SET status='PAUSED',reminders_enabled=false,updated_at=now() WHERE quote_id=${id}::uuid`;
        await db.$executeRaw`UPDATE zyteron_quote_collection_settings SET reminders_enabled=false,suspension_enabled=false,revision=revision+1,updated_at=now() WHERE quote_id=${id}::uuid`;
        await db.$executeRaw`UPDATE zyteron_billing_notices SET state='SUPPRESSED' WHERE plan_id IN(SELECT id FROM zyteron_monthly_plans WHERE quote_id=${id}::uuid) AND state='PENDING'`;
        await db.$executeRaw`INSERT INTO zyteron_archived_quotes(quote_id,client_id,reason,actor_id) VALUES(${id}::uuid,${clientId}::uuid,${body.reason},${auth.actorId ?? null}) ON CONFLICT(quote_id) DO NOTHING`;
        await db.clientAuditLog.create({
          data: {
            actorId: auth.actorId ?? null,
            action: "CLIENT_QUOTE_ARCHIVED",
            entityType: "Quote",
            entityId: id,
            details: { clientId, reason: body.reason, paidHistoryPreserved: true },
          },
        });
      },
      { timeout: 20_000 },
    );
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error: message.includes("FLOW_MANAGED")
          ? "Esta cotización tiene una autorización Flow. Cancela esa suscripción desde su administración antes de eliminarla."
          : "No fue posible eliminar la cotización. Actualiza la ficha y revisa su vinculación.",
      },
      { status: 409 },
    );
  }
}

import "server-only";
import { randomUUID } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { prisma } from "@/lib/prisma";
import { parseQuoteMessage } from "@/lib/admin/quote";
import { nativeQuote } from "@/lib/full-control/quote-commercial";
import {
  monthlyNextDate,
  billingPhase,
  billingToday,
  dueInstant,
  monthlyOnOrAfter,
} from "./monthly-calendar";
export type MonthlyPlan = {
  id: string;
  quote_id: string;
  native_quote_id: string | null;
  user_id: string;
  label: string;
  amount: number;
  anchor_date: string;
  next_due: string;
  status: "ACTIVE" | "PAUSED";
  reminders_enabled: boolean;
};
export async function monthlyPlan(quoteId: string) {
  const rows = await prisma.$queryRaw<
    MonthlyPlan[]
  >`SELECT id,quote_id,native_quote_id,user_id,label,amount,anchor_date::text,next_due::text,status,reminders_enabled FROM zyteron_monthly_plans WHERE quote_id=${quoteId}::uuid`;
  return rows[0] || null;
}
export async function configureMonthly(
  quoteId: string,
  input: { firstDate: string; status: "ACTIVE" | "PAUSED"; reminders: boolean },
  actorId: string | null,
) {
  const today = billingToday();
  await prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${"monthly:" + quoteId}))`;
    const [existing] = await db.$queryRaw<
      MonthlyPlan[]
    >`SELECT *,anchor_date::text AS anchor_date,next_due::text AS next_due FROM zyteron_monthly_plans WHERE quote_id=${quoteId}::uuid FOR UPDATE`;
    if (existing) {
      const next =
        existing.status === "PAUSED" && input.status === "ACTIVE" && existing.next_due < today
          ? monthlyOnOrAfter(existing.anchor_date, today)
          : existing.next_due;
      await db.$executeRaw`UPDATE zyteron_monthly_plans SET next_due=${next}::date,status=${input.status},reminders_enabled=${input.reminders},updated_at=now() WHERE id=${existing.id}::uuid`;
    } else {
      if (
        input.firstDate < today ||
        input.firstDate > Temporal.PlainDate.from(today).add({ years: 2 }).toString()
      )
        throw Error("MONTHLY_START_INVALID");
      const native = await nativeQuote(db, quoteId);
      let userId: string | null = null,
        amount = 0,
        label = "",
        nativeId: string | null = null;
      if (native) {
        const m = parseQuoteMessage(native.message) as ReturnType<typeof parseQuoteMessage> & {
          controlState?: string;
        };
        if (m.payment?.subscription?.subscriptionId || m.payment?.subscription?.registerToken)
          throw Error("MONTHLY_FLOW_MANAGED");
        if (
          m.payment?.billingType !== "SUBSCRIPTION" ||
          !(native.status === "WON" || m.controlState === "ACCEPTED") ||
          !native.userId
        )
          throw Error("MONTHLY_NOT_ACCEPTED");
        userId = native.userId;
        amount = native.total;
        nativeId = native.id;
        label = m.quoteCode || m.quoteNumber || "Servicio mensual";
      } else {
        const [q] = await db.$queryRaw<
          Array<{
            client_id: string;
            total_amount: number;
            currency: string;
            status: string;
            billing_type: string;
            quote_number: string;
          }>
        >`SELECT client_id,total_amount,currency,status,billing_type,quote_number FROM quotes WHERE id=${quoteId}::uuid FOR UPDATE`;
        if (
          !q ||
          !["ACCEPTED", "CONVERTED"].includes(q.status) ||
          q.billing_type !== "SUBSCRIPTION" ||
          q.currency.trim() !== "CLP"
        )
          throw Error("MONTHLY_NOT_ACCEPTED");
        const plans = await db.$queryRaw<
          Array<{ id: string }>
        >`SELECT id FROM quote_payment_plans WHERE quote_id=${quoteId}::uuid LIMIT 1`;
        if (plans.length) throw Error("MONTHLY_CALENDAR_EXISTS");
        const [l] = await db.$queryRaw<
          Array<{ user_id: string }>
        >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${q.client_id}::uuid`;
        userId = l?.user_id || null;
        amount = Number(q.total_amount);
        label = q.quote_number;
      }
      if (!userId || !Number.isSafeInteger(amount) || amount <= 0 || amount > 2147483647)
        throw Error("MONTHLY_NOT_ACCEPTED");
      await db.$executeRaw`INSERT INTO zyteron_monthly_plans(quote_id,native_quote_id,user_id,label,amount,anchor_date,next_due,status,reminders_enabled) VALUES(${quoteId}::uuid,${nativeId},${userId},${label},${amount},${input.firstDate}::date,${input.firstDate}::date,${input.status},${input.reminders})`;
    }
    await db.clientAuditLog.create({
      data: {
        actorId,
        action: "MONTHLY_CALENDAR_CONFIGURED",
        entityType: "Quote",
        entityId: quoteId,
        details: {
          status: input.status,
          reminders: input.reminders,
          firstDate: existing ? undefined : input.firstDate,
          automaticCardCharge: false,
        },
      },
    });
  });
  await generateMonthlyReceivables();
  return monthlyPlan(quoteId);
}
export async function generateMonthlyReceivables(now = new Date()) {
  const today = billingToday(now),
    horizon = Temporal.PlainDate.from(today).add({ days: 7 }).toString();
  return prisma.$transaction(
    async (db) => {
      const [lock] = await db.$queryRaw<
        Array<{ locked: boolean }>
      >`SELECT pg_try_advisory_xact_lock(hashtext('zyteron:monthly-billing')) AS locked`;
      if (!lock?.locked) return { generated: 0 };
      const plans = await db.$queryRaw<
        MonthlyPlan[]
      >`SELECT id,quote_id,native_quote_id,user_id,label,amount,anchor_date::text,next_due::text,status,reminders_enabled FROM zyteron_monthly_plans WHERE status='ACTIVE' AND next_due<=${horizon}::date ORDER BY next_due FOR UPDATE LIMIT 50`;
      let generated = 0;
      for (const p of plans) {
        // A provider authorization supersedes the manual calendar and must never create a second debt.
        if (p.native_quote_id) {
          const q = await db.quote.findUnique({ where: { id: p.native_quote_id } });
          const m = parseQuoteMessage(q?.message || null) as ReturnType<
            typeof parseQuoteMessage
          > & { controlState?: string };
          if (
            !q ||
            q.userId !== p.user_id ||
            !(q.status === "WON" || m.controlState === "ACCEPTED") ||
            m.payment?.subscription?.subscriptionId ||
            m.payment?.subscription?.registerToken
          ) {
            await db.$executeRaw`UPDATE zyteron_monthly_plans SET status='PAUSED',updated_at=now() WHERE id=${p.id}::uuid`;
            continue;
          }
        }
        if (!p.native_quote_id) {
          const [q] = await db.$queryRaw<
            Array<{ valid: boolean }>
          >`SELECT EXISTS(SELECT 1 FROM quotes q JOIN zyteron_legacy_client_link l ON l.client_id=q.client_id WHERE q.id=${p.quote_id}::uuid AND l.user_id=${p.user_id} AND q.status IN ('ACCEPTED','CONVERTED') AND q.billing_type='SUBSCRIPTION') AS valid`;
          if (!q?.valid) {
            await db.$executeRaw`UPDATE zyteron_monthly_plans SET status='PAUSED',updated_at=now() WHERE id=${p.id}::uuid`;
            continue;
          }
        }
        let date = p.next_due;
        for (let n = 0; n < 12 && date <= horizon; n++) {
          const due = dueInstant(date),
            sourceKey = `monthly:${p.id}:${date}`;
          await db.receivable.upsert({
            where: { sourceKey },
            update: {},
            create: {
              id: randomUUID(),
              sourceKey,
              clientId: p.user_id,
              quoteId: p.native_quote_id,
              description: `${p.label} · período ${date.slice(5, 7)}-${date.slice(0, 4)}`,
              kind: "MONTHLY",
              currency: "CLP",
              totalAmount: p.amount,
              dueAt: due,
              metadata: { monthlyPlanId: p.id, quoteId: p.quote_id, period: date },
            },
          });
          generated++;
          date = monthlyNextDate(p.anchor_date, date);
        }
        await db.$executeRaw`UPDATE zyteron_monthly_plans SET next_due=${date}::date,updated_at=now() WHERE id=${p.id}::uuid`;
      }
      return { generated };
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
export async function queueMonthlyNotices(now = new Date()) {
  const today = billingToday(now);
  return prisma.$transaction(
    async (db) => {
      const [lock] = await db.$queryRaw<
        Array<{ locked: boolean }>
      >`SELECT pg_try_advisory_xact_lock(hashtext('zyteron:monthly-notices')) AS locked`;
      if (!lock?.locked) return;
      const rows = await db.$queryRaw<
        Array<{
          id: string;
          plan_id: string;
          user_id: string;
          email: string;
          description: string;
          balance: number;
          due: Date;
        }>
      >`
 SELECT r.id,p.id AS plan_id,p.user_id,u.email,r.description,
 r."totalAmount"-COALESCE((SELECT sum(a.amount) FROM "PaymentAllocation" a JOIN "Payment" pay ON pay.id=a."paymentId" WHERE a."receivableId"=r.id AND pay.status='CONFIRMED' AND pay.currency=r.currency),0) AS balance,
 r."dueAt" AS due
 FROM "Receivable" r JOIN zyteron_monthly_plans p ON r.metadata->>'monthlyPlanId'=p.id::text JOIN "User" u ON u.id=p.user_id
 WHERE p.status='ACTIVE' AND p.reminders_enabled AND r.status NOT IN ('CANCELLED','VOID') AND r."clientId"=p.user_id
 AND u.role='CLIENT' AND u."accountStatus"='ACTIVE' AND u."emailVerifiedAt" IS NOT NULL
 AND (NOT EXISTS(SELECT 1 FROM zyteron_legacy_client_link l WHERE l.user_id=u.id) OR EXISTS(SELECT 1 FROM zyteron_legacy_client_link l JOIN client_portal_settings s ON s.client_id=l.client_id WHERE l.user_id=u.id AND s.enabled AND s.invoices_visible))
 ORDER BY r."dueAt" LIMIT 500`;
      for (const r of rows) {
        const due = billingToday(r.due);
        const phase = billingPhase(due, today);
        if (!phase || Number(r.balance) <= 0) continue;
        const title = phase === "UPCOMING" ? "Próximo pago mensual" : "Pago mensual pendiente";
        const amount = new Intl.NumberFormat("es-CL", {
          style: "currency",
          currency: "CLP",
          maximumFractionDigits: 0,
        }).format(Number(r.balance));
        const date = due.split("-").reverse().join("-");
        const body = `${r.description}. Saldo pendiente: ${amount}. Vencimiento: ${date}. Revisa el detalle y los medios de pago en https://www.zyteron.cl/portal. Si ya enviaste un comprobante, su validación aparecerá en tu cuenta.`;
        const inserted = await db.$queryRaw<
          Array<{ id: string }>
        >`INSERT INTO zyteron_billing_notices(plan_id,receivable_id,phase,recipient,balance,subject,body) VALUES(${r.plan_id}::uuid,${r.id},${phase},${r.email},${Number(r.balance)},${title},${body}) ON CONFLICT(receivable_id,phase) DO NOTHING RETURNING id`;
        if (inserted.length)
          await db.clientNotification.create({
            data: { userId: r.user_id, title, body, type: "PAYMENT", link: "/portal" },
          });
      }
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
export async function sendMonthlyNotices() {
  const key = process.env.RESEND_API_KEY,
    from = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
  if (!key || !from) return;
  const lease = randomUUID();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      plan_id: string;
      receivable_id: string;
      recipient: string;
      balance: number;
      subject: string;
      body: string;
      first_attempt_at: Date;
    }>
  >`UPDATE zyteron_billing_notices SET state='PROCESSING',lease=${lease}::uuid,lease_until=now()+interval '2 minutes',first_attempt_at=coalesce(first_attempt_at,now()) WHERE id IN(SELECT id FROM zyteron_billing_notices WHERE (state='PENDING' AND available_at<=now()) OR (state='PROCESSING' AND lease_until<now()) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 3) RETURNING *`;
  for (const row of rows) {
    let state = "PENDING",
      providerId: string | null = null;
    try {
      if (Date.now() - new Date(row.first_attempt_at).getTime() > 23 * 3600000) {
        state = "REVIEW_REQUIRED";
        throw Error("REVIEW");
      }
      const [p] = await prisma.$queryRaw<
        Array<{ status: string; reminders_enabled: boolean; user_id: string }>
      >`SELECT status,reminders_enabled,user_id FROM zyteron_monthly_plans WHERE id=${row.plan_id}::uuid`;
      const debt = await prisma.receivable.findUnique({
        where: { id: row.receivable_id },
        include: {
          client: {
            select: { email: true, accountStatus: true, emailVerifiedAt: true, role: true },
          },
          allocations: {
            where: { payment: { status: "CONFIRMED", currency: "CLP" } },
            select: { amount: true },
          },
        },
      });
      const balance = debt
        ? debt.totalAmount - debt.allocations.reduce((s, a) => s + a.amount, 0)
        : 0;
      const [access] = await prisma.$queryRaw<
        Array<{ allowed: boolean }>
      >`SELECT NOT EXISTS(SELECT 1 FROM zyteron_legacy_client_link WHERE user_id=${p?.user_id || ""}) OR EXISTS(SELECT 1 FROM zyteron_legacy_client_link l JOIN client_portal_settings s ON s.client_id=l.client_id WHERE l.user_id=${p?.user_id || ""} AND s.enabled AND s.invoices_visible) AS allowed`;
      if (
        !debt ||
        !p ||
        p.status !== "ACTIVE" ||
        !p.reminders_enabled ||
        !access?.allowed ||
        ["VOID", "CANCELLED"].includes(debt.status) ||
        debt.clientId !== p.user_id ||
        balance !== row.balance ||
        balance <= 0 ||
        debt.client.accountStatus !== "ACTIVE" ||
        !debt.client.emailVerifiedAt ||
        debt.client.email.toLowerCase() !== row.recipient.toLowerCase()
      ) {
        state = "SUPPRESSED";
        throw Error("SUPPRESS");
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "Idempotency-Key": "zyteron/billing/" + row.id,
        },
        body: JSON.stringify({ from, to: [row.recipient], subject: row.subject, text: row.body }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.id !== "string") throw Error("EMAIL_NOT_ACCEPTED");
      providerId = data.id;
      state = "ACCEPTED";
    } catch {}
    await prisma.$executeRaw`UPDATE zyteron_billing_notices SET state=${state},provider_id=${providerId},available_at=now()+interval '5 minutes',lease=NULL,lease_until=NULL WHERE id=${row.id}::uuid AND lease=${lease}::uuid`;
  }
}
export async function runMonthlyBilling() {
  await generateMonthlyReceivables();
  await queueMonthlyNotices();
  await sendMonthlyNotices();
}

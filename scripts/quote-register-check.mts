import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const config = JSON.parse(fs.readFileSync(process.env.ZYTERON_QUOTE_CONFIG!, "utf8"));
const url = new URL(config.DATABASE_URL);
if (
  !url.username.includes("bwybwrxrbzjkwpxhpkcr") &&
  !url.hostname.includes("bwybwrxrbzjkwpxhpkcr")
)
  throw Error("UNEXPECTED_DATABASE");
process.env.DATABASE_URL = config.DATABASE_URL;
const { prisma } = await import("../src/lib/prisma");
const { canonicalQuoteRegister, attachQuoteBilling } =
  await import("../src/lib/full-control/quote-register-data");
const { setWebsiteQuoteBilling } = await import("../src/lib/full-control/quote-billing-action");
const { duplicateWebsiteQuote } = await import("../src/lib/full-control/website-quote-actions");
const { parseQuoteMessage, serializeQuoteMessage } = await import("../src/lib/admin/quote");
const { legacyViewId } = await import("../src/lib/full-control/legacy-id");
const canonical = await canonicalQuoteRegister();
const native = await prisma.quote.findMany({ select: { id: true, message: true } });
const source = JSON.parse(fs.readFileSync(process.env.ZYTERON_QUOTE_SOURCE!, "utf8"));
const register = await attachQuoteBilling(source.items);
assert.equal(register.length, source.items.length);
assert.ok(register.every((q) => q.billing && q.billing.balance >= 0 && q.billing.paid >= 0));
assert.ok(register.every((q) => q.billing.state !== "PAID" || q.billing.paid > 0));
let checks = 3;
const rollback = Error("QUOTE_REGISTER_QA_ROLLBACK");
try {
  await prisma.$transaction(
    async (db) => {
      const seed = await db.quote.findFirstOrThrow({ where: { userId: { not: null } } });
      const copy = await duplicateWebsiteQuote(seed, null, db);
      const viewId = legacyViewId("quote", copy.id);
      await setWebsiteQuoteBilling(viewId, "MONTHLY", null, db);
      const monthly = await db.quote.findUniqueOrThrow({ where: { id: copy.id } });
      const meta = parseQuoteMessage(monthly.message);
      assert.equal(meta.payment?.billingType, "SUBSCRIPTION");
      checks++;
      assert.equal(meta.payment?.subscription?.status, "PENDING");
      checks++;
      assert.ok(!meta.payment?.subscription?.subscriptionId);
      checks++;
      const copiedMonthly = await duplicateWebsiteQuote(monthly, null, db);
      assert.equal(parseQuoteMessage(copiedMonthly.message).payment?.billingType, "SUBSCRIPTION");
      checks++;
      await setWebsiteQuoteBilling(viewId, "ONE_TIME", null, db);
      const fixed = await db.quote.findUniqueOrThrow({ where: { id: copy.id } });
      assert.equal(parseQuoteMessage(fixed.message).payment?.billingType, "ONE_TIME");
      checks++;
      await db.quote.update({ where: { id: copy.id }, data: { status: "SENT" } });
      await assert.rejects(
        setWebsiteQuoteBilling(viewId, "MONTHLY", null, db),
        /QUOTE_BILLING_LOCKED/,
      );
      checks++;
      await db.quote.update({
        where: { id: copy.id },
        data: {
          status: "PENDING",
          message: serializeQuoteMessage({
            ...parseQuoteMessage(fixed.message),
            payment: {
              ...parseQuoteMessage(fixed.message).payment,
              legalAcceptance: {
                acceptedAt: new Date().toISOString(),
                acceptedByUserId: seed.userId!,
              },
            },
          }),
        },
      });
      await assert.rejects(
        setWebsiteQuoteBilling(viewId, "MONTHLY", null, db),
        /QUOTE_BILLING_LOCKED/,
      );
      checks++;
      const id = randomUUID();
      await db.$executeRaw`INSERT INTO quotes(id,quote_number,client_id,company_name,status,subtotal,net_amount,total_amount,currency) VALUES(${id}::uuid,${"QA-" + id},${canonical.find((q) => q.clientId)!.clientId}::uuid,'QA ROLLBACK','DRAFT',1000,1000,1000,'CLP')`;
      const payload = JSON.stringify({
        id: randomUUID(),
        client_id: canonical.find((q) => q.clientId)!.clientId,
        company_name: "QA ROLLBACK RPC",
        status: "DRAFT",
        currency: "CLP",
        subtotal: 1000,
        discount_total: 0,
        net_amount: 1000,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: 1000,
        billing_type: "SUBSCRIPTION",
      });
      const [rpc] = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT public.create_sales_quote(${payload}::jsonb,'[]'::jsonb) AS id`;
      const [created] = await db.$queryRaw<
        Array<{ billing_type: string }>
      >`SELECT billing_type FROM quotes WHERE id=${rpc.id}::uuid`;
      assert.equal(created.billing_type, "SUBSCRIPTION");
      checks++;
      const [access] = await db.$queryRaw<
        Array<{ allowed: boolean }>
      >`SELECT has_function_privilege('anon','public.create_sales_quote(jsonb,jsonb)','EXECUTE') AS allowed`;
      assert.equal(access.allowed, false);
      checks++;
      await setWebsiteQuoteBilling(id, "MONTHLY", null, db);
      const [q] = await db.$queryRaw<
        Array<{ billing_type: string }>
      >`SELECT billing_type FROM quotes WHERE id=${id}::uuid`;
      assert.equal(q.billing_type, "SUBSCRIPTION");
      checks++;
      await db.$executeRaw`UPDATE quotes SET status='SENT' WHERE id=${id}::uuid`;
      await assert.rejects(
        setWebsiteQuoteBilling(id, "ONE_TIME", null, db),
        /QUOTE_BILLING_LOCKED/,
      );
      checks++;
      await db.$executeRaw`SAVEPOINT billing_guard_qa`;
      await assert.rejects(
        db.$executeRaw`UPDATE quotes SET billing_type='ONE_TIME' WHERE id=${id}::uuid`,
        /QUOTE_BILLING_LOCKED/,
      );
      checks++;
      await db.$executeRaw`ROLLBACK TO SAVEPOINT billing_guard_qa`;
      const pending = await db.paymentAllocation.count({
        where: { receivable: { quoteId: copy.id } },
      });
      assert.equal(pending, 0);
      checks++;
      throw rollback;
    },
    { timeout: 60000 },
  );
} catch (error) {
  if (error !== rollback) throw error;
} finally {
  await prisma.$disconnect();
}
console.log(
  JSON.stringify({
    canonical: canonical.length,
    native: native.length,
    register: register.length,
    checks,
    rolledBack: true,
    externalMessages: 0,
    charges: 0,
  }),
);

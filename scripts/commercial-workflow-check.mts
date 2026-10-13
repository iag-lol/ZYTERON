import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
const config = JSON.parse(fs.readFileSync(process.env.ZYTERON_COMERCIAL_CONFIG!, "utf8"));
const target = new URL(config.DATABASE_URL);
if (
  !target.username.includes("bwybwrxrbzjkwpxhpkcr") &&
  !target.hostname.includes("bwybwrxrbzjkwpxhpkcr")
)
  throw Error("Unexpected QA database");
process.env.DATABASE_URL = config.DATABASE_URL;
const { prisma } = await import("../src/lib/prisma");
const { duplicateWebsiteQuote, createWebsiteContract, createWebsiteWorkOrder } =
  await import("../src/lib/full-control/website-quote-actions");
const { parseQuoteMessage } = await import("../src/lib/admin/quote");
let checks = 0;
const check = (value: unknown) => {
  assert.ok(value);
  checks++;
};
const rollback = Error("TRANSACTIONAL_QA_ROLLBACK");
try {
  await prisma.$transaction(
    async (db) => {
      await db.$executeRawUnsafe(
        fs.readFileSync(
          "supabase/migrations/20261013044253_connect_web_leads_commercial_workflow.sql",
          "utf8",
        ),
      );
      const [link] = await db.$queryRaw<
        Array<{ user_id: string; client_id: string }>
      >`SELECT user_id,client_id::text FROM zyteron_legacy_client_link LIMIT 1`;
      assert.ok(link);
      const lead = await db.lead.create({
        data: {
          name: "Transaction-only commercial QA",
          email: "qa@example.invalid",
          source: "CHAT_IA",
          type: "CONTACT",
          userId: link.user_id,
        },
      });
      const h = createHash("sha256").update(`zyteron:legacy-view:lead:${lead.id}`).digest("hex");
      const expected = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
      const [mapped] = await db.$queryRaw<
        Array<{ id: string; status: string }>
      >`SELECT id::text,status FROM public.leads WHERE id=public.zyteron_web_lead_id(${lead.id})`;
      check(mapped.id === expected && mapped.status === "NEW");
      await db.$executeRawUnsafe("SAVEPOINT unqualified");
      await assert.rejects(
        db.$queryRaw`SELECT zyteron_convert_commercial_lead(${mapped.id}::uuid,NULL,'{}')`,
      );
      checks++;
      await db.$executeRawUnsafe("ROLLBACK TO SAVEPOINT unqualified");
      await db.$executeRaw`UPDATE public.leads SET status='QUALIFIED' WHERE id=${mapped.id}::uuid`;
      const [first] = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT zyteron_convert_commercial_lead(${mapped.id}::uuid,NULL,'{}')::text AS id`;
      const [second] = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT zyteron_convert_commercial_lead(${mapped.id}::uuid,NULL,'{}')::text AS id`;
      check(first.id === second.id);
      const [converted] = await db.$queryRaw<
        Array<{ status: string; count: number }>
      >`SELECT l.status,(SELECT count(*)::int FROM opportunities o WHERE o.lead_id=l.id) count FROM leads l WHERE l.id=${mapped.id}::uuid`;
      check(converted.status === "CONVERTED" && converted.count === 1);
      const salesBefore = await db.sale.count(),
        canonicalSales = (
          await db.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int n FROM sales`
        )[0].n;
      const quote = await db.quote.create({
        data: {
          name: "Transaction-only QA quote",
          email: "qa@example.invalid",
          company: "Transaction-only QA",
          userId: link.user_id,
          subtotal: 100,
          total: 100,
          status: "WON",
          message: JSON.stringify({
            quoteNumber: "TX_QA_" + randomUUID(),
            includeIva: false,
            items: [{ description: "Transaction-only service", qty: 1, unitPrice: 100 }],
            subtotal: 100,
            grandTotal: 100,
            payment: {
              totalPaid: 100,
              stages: [
                { key: "FULL", amount: 100, status: "PAID", flow: { token: "must-not-copy" } },
              ],
            },
            pdfPublicUrl: "https://example.invalid/paid.pdf",
            controlState: "APPROVED",
          }),
        },
      });
      const copy = await duplicateWebsiteQuote(quote, null, db),
        meta = parseQuoteMessage(copy.message);
      check(copy.id !== quote.id && copy.status === "PENDING");
      check(
        !meta.payment &&
          !meta.pdfPublicUrl &&
          Boolean(meta.quoteNumber) &&
          meta.quoteNumber !== parseQuoteMessage(quote.message).quoteNumber,
      );
      check(
        (await db.payment.count({
          where: { allocations: { some: { receivable: { quoteId: copy.id } } } },
        })) === 0,
      );
      const revision=await duplicateWebsiteQuote(quote,null,db,true);
    check((parseQuoteMessage(revision.message) as {controlVersion?:number}).controlVersion===2 && parseQuoteMessage(revision.message).quoteNumber!==meta.quoteNumber);
    const viewId = randomUUID();
      const contract = await createWebsiteContract(quote, viewId, link.client_id, null, db);
      const retry = await createWebsiteContract(quote, viewId, link.client_id, null, db);
      check(contract.id === retry.id && contract.created && !retry.created);
      const [draft] = await db.$queryRaw<
        Array<{ status: string; portal_visible: boolean }>
      >`SELECT status,portal_visible FROM client_contracts WHERE id=${contract.id}::uuid`;
      check(draft.status === "DRAFT" && !draft.portal_visible);
      await assert.rejects(
        createWebsiteWorkOrder(quote, viewId, link.client_id, null, db),
        /Falta confirmar/,
      );
      checks++;
      const receivable = await db.receivable.create({
        data: {
          clientId: link.user_id,
          quoteId: quote.id,
          description: "Transaction-only QA",
          kind: "MANUAL",
          sourceKey: randomUUID(),
          totalAmount: 100,
          status: "PENDING",
          currency: "CLP",
        },
      });
      const payment = await db.payment.create({
        data: {
          clientId: link.user_id,
          amount: 100,
          method: "TRANSFER",
          status: "PENDING",
          currency: "CLP",
          allocations: { create: { receivableId: receivable.id, amount: 100 } },
        },
      });
      await assert.rejects(
        createWebsiteWorkOrder(quote, viewId, link.client_id, null, db),
        /Falta confirmar/,
      );
      checks++;
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "CONFIRMED", metadata: { environment: "sandbox" } },
      });
      await assert.rejects(
        createWebsiteWorkOrder(quote, viewId, link.client_id, null, db),
        /Falta confirmar/,
      );
      checks++;
      await db.payment.update({
        where: { id: payment.id },
        data: { metadata: { environment: "LIVE" } },
      });
      const work = await createWebsiteWorkOrder(quote, viewId, link.client_id, null, db),
        workRetry = await createWebsiteWorkOrder(quote, viewId, link.client_id, null, db);
      check(work.workOrderId === workRetry.workOrderId && work.created && !workRetry.created);
      check((await db.sale.count()) === salesBefore);
      check(
        (await db.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int n FROM sales`)[0].n ===
          canonicalSales,
      );
      const [privateRpc] = await db.$queryRaw<
        Array<{ ok: boolean }>
      >`SELECT NOT has_function_privilege('anon','public.zyteron_convert_commercial_lead(uuid,uuid,jsonb)','EXECUTE') AS ok`;
      check(privateRpc.ok);
      throw rollback;
    },
    { timeout: 90000, maxWait: 15000 },
  );
} catch (error) {
  if (error !== rollback) throw error;
} finally {
  await prisma.$disconnect();
}
console.log({
  commercialWorkflowChecks: checks,
  passed: true,
  persistentQaRows: 0,
  emails: 0,
  charges: 0,
});

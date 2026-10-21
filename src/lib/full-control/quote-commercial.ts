import "server-only";
import { randomUUID, createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseQuoteMessage,
  serializeQuoteMessage,
  enrichQuoteRecord,
  buildQuoteMeta,
} from "@/lib/admin/quote";
import { quoteTotals } from "@/lib/client-experience/quote-totals";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";
import { legacyViewId } from "./legacy-id";
import { canonicalQuoteRegister } from "./quote-register-data";
import { commercialTotals, nativeQuoteLocked, type QuoteEdit } from "./quote-edit-model";
const revision = (message: string | null, userId: string | null) =>
  createHash("sha256")
    .update(JSON.stringify([message, userId]))
    .digest("hex");
export async function nativeQuote(db: Prisma.TransactionClient, viewId: string) {
  const ids = await db.quote.findMany({ select: { id: true } });
  const source = ids.find((q) => legacyViewId("quote", q.id) === viewId);
  if (!source) return null;
  await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${source.id} FOR UPDATE`;
  return db.quote.findUniqueOrThrow({ where: { id: source.id } });
}
export async function quoteCommercial(viewId: string) {
  const raw = await prisma.$transaction((db) => nativeQuote(db, viewId));
  if (raw) {
    const e = enrichQuoteRecord({ ...raw, createdAt: raw.createdAt.toISOString() }),
      m = e.meta;
    const links = await prisma.$queryRaw<
      Array<{ client_id: string }>
    >`SELECT client_id FROM zyteron_legacy_client_link WHERE user_id=${raw.userId}`;
    return {
      id: viewId,
      revision: revision(raw.message, raw.userId),
      source: "WEBSITE",
      clientId: links[0]?.client_id || null,
      quoteNumber: e.displayNumber,
      currency: "CLP",
      contactName: raw.name,
      contactEmail: raw.email,
      companyName: raw.company || raw.name,
      validUntil: m.validUntil || "",
      paymentTerms: m.paymentTerms || "",
      commercialTerms: m.terms || "",
      notes: m.notes || "",
      taxRate: m.includeIva ? 19 : 0,
      items: m.items.map((i) => ({
        description: i.description,
        quantity: i.qty,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPct || 0,
        taxable: i.taxable !== false,
      })),
      editable: !nativeQuoteLocked(
        raw.status,
        m,
        await prisma.receivable.count({ where: { quoteId: raw.id } }),
      ),
    };
  }
  const q = (await canonicalQuoteRegister()).find((q) => q.id === viewId);
  if (!q) throw Error("QUOTE_NOT_FOUND");
  return {
    ...q,
    revision: q.updatedAt,
    source: "CONTROL",
    validUntil: q.validUntil || "",
    paymentTerms: q.paymentTerms || "",
    commercialTerms: q.commercialTerms || "",
    notes: q.notes || "",
    contactName: q.contactName || q.companyName,
    contactEmail: q.contactEmail || "",
    editable:
      ["DRAFT", "REJECTED"].includes(q.status) &&
      !q.documentId &&
      !q.sentAt &&
      !q.acceptedAt &&
      !q.saleId,
  };
}
export async function editQuote(viewId: string, body: QuoteEdit, actorId: string | null) {
  return prisma.$transaction(
    async (db) => {
      const q = await nativeQuote(db, viewId);
      if (q) {
        const m = parseQuoteMessage(q.message);
        if (revision(q.message, q.userId) !== body.revision) throw Error("QUOTE_STALE");
        if (nativeQuoteLocked(q.status, m, await db.receivable.count({ where: { quoteId: q.id } })))
          throw Error("QUOTE_EDIT_LOCKED");
        const items = body.items.map((i) => ({
          id: randomUUID(),
          description: i.description,
          qty: i.quantity,
          unitPrice: i.unitPrice,
          discountPct: i.discountPercent,
          taxable: i.taxable,
          unit: "unidad",
        }));
        const totals = quoteTotals(items, body.taxRate > 0);
        if (totals.grandTotal > 2147483647) throw Error("QUOTE_TOTAL_LIMIT");
        const meta = normalizeQuoteMetaPayment({
          ...m,
          ...totals,
          items,
          includeIva: body.taxRate > 0,
          notes: body.notes,
          paymentTerms: body.paymentTerms,
          terms: body.commercialTerms,
          validUntil: body.validUntil || undefined,
          payment: {
            billingType: m.payment?.billingType || "ONE_TIME",
            enabled: false,
            ...(m.payment?.billingType === "SUBSCRIPTION"
              ? {
                  subscription: {
                    interval: "MONTHLY" as const,
                    amount: totals.grandTotal,
                    status: "PENDING" as const,
                  },
                }
              : {}),
          },
        });
        await db.quote.update({
          where: { id: q.id },
          data: {
            name: body.contactName,
            email: body.contactEmail.toLowerCase(),
            company: body.companyName,
            subtotal: totals.subtotal,
            discount: totals.totalDescuento,
            total: totals.grandTotal,
            message: serializeQuoteMessage({
              ...meta,
              controlState: "DRAFT",
              commercialUpdatedAt: new Date().toISOString(),
            } as typeof meta),
          },
        });
        await db.clientAuditLog.create({
          data: {
            actorId,
            targetUserId: q.userId,
            action: "QUOTE_COMMERCIAL_UPDATED",
            entityType: "Quote",
            entityId: q.id,
            details: {
              previous: {
                message: q.message,
                total: q.total,
                name: q.name,
                email: q.email,
                company: q.company,
              },
              total: totals.grandTotal,
            },
          },
        });
      } else {
        const [row] = await db.$queryRaw<
          Array<{
            status: string;
            updated_at: Date;
            document_id: string | null;
            sent_at: Date | null;
            accepted_at: Date | null;
            sale_id: string | null;
            currency: string;
          }>
        >`SELECT status,updated_at,document_id,sent_at,accepted_at,sale_id,currency FROM quotes WHERE id=${viewId}::uuid FOR UPDATE`;
        if (!row) throw Error("QUOTE_NOT_FOUND");
        if (row.updated_at.toISOString() !== body.revision) throw Error("QUOTE_STALE");
        const commitments = await db.$queryRaw<
          Array<{ id: string }>
        >`SELECT id FROM quote_payment_plans WHERE quote_id=${viewId}::uuid LIMIT 1`;
        if (
          !["DRAFT", "REJECTED"].includes(row.status) ||
          row.document_id ||
          row.sent_at ||
          row.accepted_at ||
          row.sale_id ||
          commitments.length
        )
          throw Error("QUOTE_EDIT_LOCKED");
        const before =
          await db.$queryRaw`SELECT to_jsonb(q) AS quote,(SELECT jsonb_agg(to_jsonb(i)) FROM quote_items i WHERE i.quote_id=q.id) AS items FROM quotes q WHERE q.id=${viewId}::uuid`;
        const t = commercialTotals(body.items, body.taxRate, row.currency.trim());
        await db.$executeRaw`DELETE FROM quote_items WHERE quote_id=${viewId}::uuid`;
        for (const [index, i] of body.items.entries())
          await db.$executeRaw`INSERT INTO quote_items(quote_id,description,quantity,unit_price,discount_percent,taxable,subtotal,position) VALUES(${viewId}::uuid,${i.description},${i.quantity},${i.unitPrice},${i.discountPercent},${i.taxable},${Math.round(i.quantity * i.unitPrice * (1 - i.discountPercent / 100) * 100) / 100},${index})`;
        await db.$executeRaw`UPDATE quotes SET company_name=${body.companyName},contact_name=${body.contactName},contact_email=${body.contactEmail},valid_until=${body.validUntil || null}::date,payment_terms=${body.paymentTerms},commercial_terms=${body.commercialTerms},notes=${body.notes},subtotal=${t.subtotal},discount_total=${t.discount},net_amount=${t.net},tax_rate=${body.taxRate},tax_amount=${t.tax},total_amount=${t.total},status='DRAFT',updated_at=now() WHERE id=${viewId}::uuid`;
        await db.clientAuditLog.create({
          data: {
            actorId,
            action: "QUOTE_COMMERCIAL_UPDATED",
            entityType: "quotes",
            entityId: viewId,
            details: { previous: JSON.parse(JSON.stringify(before)), total: t.total },
          },
        });
      }
      return { ok: true, id: viewId };
    },
    { timeout: 20000 },
  );
}
export async function linkQuoteClient(viewId: string, clientId: string, actorId: string | null) {
  return prisma.$transaction(async (db) => {
    const [link] = await db.$queryRaw<
      Array<{ user_id: string }>
    >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${clientId}::uuid`;
    if (!link) throw Error("CLIENT_PORTAL_LINK_REQUIRED");
    const user = await db.user.findUnique({
      where: { id: link.user_id },
      select: { email: true, role: true },
    });
    if (!user || user.role !== "CLIENT") throw Error("CLIENT_PORTAL_LINK_REQUIRED");
    const q = await nativeQuote(db, viewId);
    if (q) {
      if (q.userId && q.userId !== link.user_id) throw Error("QUOTE_OWNER_LOCKED");
      // An explicit selection can attach an unowned proposal; existing debts remain with their owner.
      const other = await db.receivable.count({
        where: { quoteId: q.id, clientId: { not: link.user_id } },
      });
      if (other) throw Error("QUOTE_OWNER_LOCKED");
      if (q.email.trim().toLowerCase() !== user.email.trim().toLowerCase())
        throw Error("QUOTE_EMAIL_MISMATCH");
      await db.quote.update({ where: { id: q.id }, data: { userId: link.user_id } });
    } else {
      const [q] = await db.$queryRaw<
        Array<{ client_id: string | null }>
      >`SELECT client_id FROM quotes WHERE id=${viewId}::uuid FOR UPDATE`;
      if (!q) throw Error("QUOTE_NOT_FOUND");
      if (q.client_id && q.client_id !== clientId) throw Error("QUOTE_OWNER_LOCKED");
      await db.$executeRaw`UPDATE quotes SET client_id=${clientId}::uuid,updated_at=now() WHERE id=${viewId}::uuid`;
    }
    await db.clientAuditLog.create({
      data: {
        actorId,
        targetUserId: link.user_id,
        action: "QUOTE_PORTAL_LINKED",
        entityType: "Quote",
        entityId: viewId,
        details: { clientId },
      },
    });
    return { ok: true };
  });
}
export async function prepareLeadQuote(viewId: string, actorId: string | null) {
  return prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${"lead-draft:" + viewId}))`;
    const [mapped] = await db.$queryRaw<
      Array<{ quote_id: string }>
    >`SELECT quote_id FROM zyteron_lead_quote_drafts WHERE lead_id=${viewId}`;
    if (mapped) return { id: legacyViewId("quote", mapped.quote_id), created: false };
    const [lead] = await db.$queryRaw<
      Array<{
        id: string;
        status: string;
        company_name: string;
        contact_name: string | null;
        email: string | null;
        phone: string | null;
        interest: string | null;
        notes: string | null;
        whatsapp_conversation_id: string | null;
        client_id: string | null;
      }>
    >`SELECT id,status,company_name,contact_name,email,phone,interest,notes,whatsapp_conversation_id,client_id FROM leads WHERE id=${viewId}::uuid FOR UPDATE`;
    if (!lead) throw Error("LEAD_NOT_FOUND");
    if (!["QUALIFIED", "CONVERTED"].includes(lead.status)) throw Error("LEAD_QUALIFY_REQUIRED");
    const [existingCanonical] = await db.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM quotes WHERE lead_id=${viewId}::uuid AND status IN ('DRAFT','REJECTED') ORDER BY created_at DESC LIMIT 1`;
    if (existingCanonical) return { id: existingCanonical.id, created: false };
    let quoteId: string | null = null;
    if (lead.whatsapp_conversation_id) {
      const [c] = await db.$queryRaw<
        Array<{ lead_id: string | null }>
      >`SELECT lead_id FROM whatsapp_conversations WHERE id=${lead.whatsapp_conversation_id}::uuid`;
      if (
        c?.lead_id &&
        (await db.quote.findUnique({ where: { id: c.lead_id }, select: { id: true } }))
      )
        quoteId = c.lead_id;
    }
    if (!quoteId) {
      const number = (
        await db.$queryRaw<Array<{ number: string }>>`SELECT next_sales_quote_number() AS number`
      )[0]!.number;
      const [link] = await db.$queryRaw<
        Array<{ user_id: string }>
      >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${lead.client_id}::uuid`;
      const meta = buildQuoteMeta({
        quoteNumber: number,
        items: [
          {
            description: (lead.interest || "Servicio solicitado").slice(0, 2000),
            detail: lead.notes || "",
            qty: 1,
            unitPrice: 0,
            unit: "unidad",
            taxable: true,
          },
        ],
        notes: lead.notes || "",
        payment: { enabled: false, billingType: "ONE_TIME" },
      });
      const q = await db.quote.create({
        data: {
          id: randomUUID(),
          userId: link?.user_id || null,
          name: lead.contact_name || lead.company_name,
          email: lead.email || "",
          phone: lead.phone,
          company: lead.company_name,
          subtotal: 0,
          discount: 0,
          total: 0,
          status: "PENDING",
          message: serializeQuoteMessage({
            ...meta,
            controlState: "DRAFT",
            commercialLeadId: viewId,
          } as typeof meta),
        },
      });
      quoteId = q.id;
    }
    await db.$executeRaw`INSERT INTO zyteron_lead_quote_drafts(lead_id,quote_id) VALUES(${viewId},${quoteId})`;
    await db.clientAuditLog.create({
      data: {
        actorId,
        action: "LEAD_QUOTE_PREPARED",
        entityType: "leads",
        entityId: viewId,
        details: { quoteId },
      },
    });
    return { id: legacyViewId("quote", quoteId), created: true };
  });
}

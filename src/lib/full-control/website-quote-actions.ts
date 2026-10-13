import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma, Quote } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildQuoteMeta,
  enrichQuoteRecord,
  parseQuoteMessage,
  serializeQuoteMessage,
} from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";

export async function duplicateWebsiteQuote(
  raw: Quote,
  actorId: string | null,
  transaction?: Prisma.TransactionClient,
  revision = false,
) {
  const original = parseQuoteMessage(raw.message);
  const fresh = buildQuoteMeta({
    ...original,
    quoteNumber: undefined,
    pdfPublicUrl: undefined,
    pdfStoragePath: undefined,
    pdfGeneratedAt: undefined,
    payment: undefined,
  });
  return inTransaction(transaction, async (db) => {
    const [reserved] = await db.$queryRaw<
      Array<{ number: string }>
    >`SELECT next_sales_quote_number() AS number`;
    fresh.quoteNumber = reserved.number;
    const controlVersion = revision
      ? Math.max(
          1,
          Number((original as typeof original & { controlVersion?: number }).controlVersion) || 1,
        ) + 1
      : 1;
    const created = await db.quote.create({
      data: {
        userId: raw.userId,
        name: raw.name,
        email: raw.email,
        phone: raw.phone,
        company: raw.company,
        planId: raw.planId,
        subtotal: raw.subtotal,
        discount: raw.discount,
        total: raw.total,
        status: "PENDING",
        message: serializeQuoteMessage({
          ...fresh,
          controlState: "DRAFT",
          controlVersion,
          sourceQuoteId: raw.id,
        } as typeof fresh),
      },
    });
    await db.clientAuditLog.create({
      data: {
        actorId,
        targetUserId: raw.userId,
        action: "CONTROL_QUOTE_DUPLICATED",
        entityType: "Quote",
        entityId: created.id,
        details: { sourceQuoteId: raw.id },
      },
    });
    return created;
  });
}

async function operationalQuote(
  db: Prisma.TransactionClient,
  raw: Quote,
  viewId: string,
  clientId: string,
) {
  const e = enrichQuoteRecord({ ...raw, createdAt: raw.createdAt.toISOString() });
  const meta = parseQuoteMessage(raw.message);
  await db.$executeRaw`INSERT INTO public.quotes(id,quote_number,client_id,company_name,contact_name,contact_email,status,currency,subtotal,discount_total,net_amount,tax_rate,tax_amount,total_amount,notes)
    VALUES(${viewId}::uuid,${e.displayNumber},${clientId}::uuid,${raw.company || raw.name},${raw.name},${raw.email},'ACCEPTED','CLP',${raw.subtotal},${raw.discount},${Math.max(0, raw.total - meta.iva)},${meta.includeIva ? 19 : 0},${meta.iva},${raw.total},${`Origen web: ${raw.id}`}) ON CONFLICT(id) DO NOTHING`;
}

/** Creates a draft compatible with the existing contract builder; creates no sale or payment. */
export async function createWebsiteContract(
  raw: Quote,
  viewId: string,
  clientId: string,
  actorId: string | null,
  transaction?: Prisma.TransactionClient,
) {
  if (raw.status !== "WON")
    throw new Error("La propuesta debe estar aceptada antes de preparar el contrato.");
  return inTransaction(transaction, async (db) => {
    await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${raw.id} FOR UPDATE`;
    const existing = await db.$queryRaw<
      Array<{ id: string; contractNumber: string }>
    >`SELECT id,contract_number AS "contractNumber" FROM public.client_contracts WHERE quote_id=${viewId}::uuid AND archived_at IS NULL ORDER BY created_at LIMIT 1`;
    if (existing[0]) return { ...existing[0], created: false };
    await operationalQuote(db, raw, viewId, clientId);
    const meta = parseQuoteMessage(raw.message),
      e = enrichQuoteRecord({ ...raw, createdAt: raw.createdAt.toISOString() });
    const values = JSON.stringify({
      cotizacion: { numero: e.displayNumber, version: "1" },
      precio: {
        moneda: "CLP",
        neto: String(raw.total - meta.iva),
        impuestos: String(meta.iva),
        total: String(raw.total),
      },
    });
    const snapshot = JSON.stringify({
      sourceQuoteId: raw.id,
      quoteNumber: e.displayNumber,
      total: raw.total,
      clientId,
    });
    const [contract] = await db.$queryRaw<
      Array<{ id: string; contractNumber: string }>
    >`INSERT INTO public.client_contracts(client_id,quote_id,name,description,contract_type,status,start_date,renewal_type,renewal_notice_days,billing_frequency,currency,subtotal,tax,total,portal_visible,template_codes,builder_values,source_snapshot)
      VALUES(${clientId}::uuid,${viewId}::uuid,${`Contrato ${e.displayNumber}`},${meta.items.map((i) => i.description).join(", ") || meta.projectSummary || e.displayNumber},'DESARROLLO','DRAFT',CURRENT_DATE,'NONE',30,'ONE_TIME','CLP',${Math.max(0, raw.total - meta.iva)},${meta.iva},${raw.total},false,ARRAY['ZT-PROYECTO-CL','ZT-CONDICIONES-CL'],${values}::jsonb,${snapshot}::jsonb)
      RETURNING id,contract_number AS "contractNumber"`;
    await db.clientAuditLog.create({
      data: {
        actorId,
        targetUserId: raw.userId,
        action: "CONTROL_CONTRACT_DRAFT_CREATED",
        entityType: "client_contracts",
        entityId: contract.id,
        details: { sourceQuoteId: raw.id },
      },
    });
    return { ...contract, created: true };
  });
}

export async function createWebsiteWorkOrder(
  raw: Quote,
  viewId: string,
  clientId: string,
  actorId: string | null,
  transaction?: Prisma.TransactionClient,
) {
  return inTransaction(transaction, async (db) => {
    await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${raw.id} FOR UPDATE`;
    const existing = await db.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM public.work_orders WHERE quote_id=${viewId}::uuid LIMIT 1`;
    if (existing[0]) return { workOrderId: existing[0].id, created: false };
    const current = await db.quote.findUniqueOrThrow({ where: { id: raw.id } });
    if (current.status !== "WON")
      throw new Error("La propuesta debe estar aceptada antes de crear la orden de trabajo.");
    // Lock the actual ledger evidence. A proposal status or uploaded proof is insufficient.
    const paid = await db.$queryRaw<
      Array<{ id: string; amount: number }>
    >`SELECT p.id,a.amount FROM "Payment" p
      JOIN "PaymentAllocation" a ON a."paymentId"=p.id JOIN "Receivable" r ON r.id=a."receivableId"
      JOIN public.zyteron_legacy_client_link l ON l.user_id=p."clientId"
      WHERE r."quoteId"=${raw.id} AND l.client_id=${clientId}::uuid AND p.status='CONFIRMED' AND p."voidedAt" IS NULL
        AND p.currency='CLP' AND r.status NOT IN ('VOID','CANCELLED')
        AND upper(coalesce(p.metadata->>'environment','LIVE')) NOT IN ('SANDBOX','TEST')
        AND coalesce(p.metadata->>'sandbox','false')!='true'
      FOR SHARE OF p,a,r`;
    const meta = normalizeQuoteMetaPayment(parseQuoteMessage(current.message));
    const initial = meta.payment?.stages?.find((stage) => stage.key === "INITIAL");
    const required = initial?.amount || current.total;
    const confirmed = paid.reduce((sum, p) => sum + Number(p.amount), 0);
    if (required <= 0 || confirmed < required)
      throw new Error(
        `Falta confirmar el pago requerido de $${required.toLocaleString("es-CL")} CLP. Confirmado para esta cotización: $${confirmed.toLocaleString("es-CL")} CLP.`,
      );
    await operationalQuote(db, current, viewId, clientId);
    const workOrderId = randomUUID();
    const snapshot = JSON.stringify({
      sourceQuoteId: raw.id,
      requiredPayment: required,
      confirmedPayment: confirmed,
      paymentIds: [...new Set(paid.map((p) => p.id))],
    });
    const scope =
      meta.items.map((item) => item.description).join("\n") ||
      meta.projectSummary ||
      meta.notes ||
      `Alcance según cotización ${raw.id}`;
    await db.$executeRaw`INSERT INTO public.work_orders(id,client_id,quote_id,quote_version,title,scope,status,commercial_snapshot)
      VALUES(${workOrderId}::uuid,${clientId}::uuid,${viewId}::uuid,1,${current.company || current.name},${scope},'READY_FOR_HANDOFF',${snapshot}::jsonb)`;
    await db.clientAuditLog.create({
      data: {
        actorId,
        targetUserId: current.userId,
        action: "CONTROL_WORK_ORDER_CREATED",
        entityType: "work_orders",
        entityId: workOrderId,
        details: { sourceQuoteId: current.id, confirmedPayment: confirmed },
      },
    });
    return { workOrderId, created: true };
  });
}

function inTransaction<T>(
  transaction: Prisma.TransactionClient | undefined,
  run: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return transaction ? run(transaction) : prisma.$transaction(run);
}

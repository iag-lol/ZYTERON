import "server-only";
import { Prisma } from "@prisma/client";
import type { SalesQuote } from "@zyteron/contracts";
import { prisma } from "@/lib/prisma";
import { parseQuoteMessage } from "@/lib/admin/quote";
import { legacyViewId } from "./legacy-id";
import { collectionSummary, type QuoteBilling, type QuoteEvidence } from "./quote-register";
type Row = Record<string, unknown>;
const stamp = (value: unknown) =>
  value instanceof Date ? value.toISOString() : String(value || "");
export async function canonicalQuoteRegister(): Promise<SalesQuote[]> {
  const rows = await prisma.$queryRaw<Array<Row & { items: Row[] }>>`
    SELECT q.*, COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.position) FROM quote_items i WHERE i.quote_id=q.id),'[]'::jsonb) AS items
    FROM quotes q ORDER BY q.created_at DESC,q.id DESC`;
  return rows.map((r) => ({
    billingType: r.billing_type as SalesQuote["billingType"],
    id: String(r.id),
    quoteNumber: String(r.quote_number),
    version: Number(r.version),
    clientId: r.client_id as string | null,
    leadId: r.lead_id as string | null,
    opportunityId: r.opportunity_id as string | null,
    companyName: String(r.company_name),
    contactName: r.contact_name as string | null,
    contactEmail: r.contact_email as string | null,
    ownerId: r.owner_id as string | null,
    status: r.status as SalesQuote["status"],
    currency: String(r.currency).trim() as SalesQuote["currency"],
    subtotal: Number(r.subtotal),
    discountTotal: Number(r.discount_total),
    netAmount: Number(r.net_amount),
    taxRate: Number(r.tax_rate),
    taxAmount: Number(r.tax_amount),
    totalAmount: Number(r.total_amount),
    validUntil: r.valid_until ? stamp(r.valid_until).slice(0, 10) : null,
    paymentTerms: r.payment_terms as string | null,
    commercialTerms: r.commercial_terms as string | null,
    notes: r.notes as string | null,
    documentId: r.document_id as string | null,
    documentHash: r.document_hash as string | null,
    sentAt: r.sent_at ? stamp(r.sent_at) : null,
    acceptedAt: r.accepted_at ? stamp(r.accepted_at) : null,
    saleId: r.sale_id as string | null,
    createdAt: stamp(r.created_at),
    updatedAt: stamp(r.updated_at),
    items: r.items.map((i) => ({
      id: String(i.id),
      quoteId: String(i.quote_id),
      catalogServiceId: i.catalog_service_id as string | null,
      description: String(i.description),
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      discountPercent: Number(i.discount_percent),
      taxable: Boolean(i.taxable),
      subtotal: Number(i.subtotal),
    })),
  }));
}
/** Batch all sources; never add a native projection and its operational mirror twice. */
export async function attachQuoteBilling(
  items: SalesQuote[],
): Promise<Array<SalesQuote & { billing: QuoteBilling }>> {
  if (!items.length) return [];
  const natives = await prisma.quote.findMany({
    select: { id: true, message: true, status: true },
  });
  const byView = new Map(natives.map((q) => [legacyViewId("quote", q.id), q]));
  const nativeIds = items.flatMap((q) => (byView.has(q.id) ? [byView.get(q.id)!.id] : []));
  const canonicalIds = items.filter((q) => !byView.has(q.id)).map((q) => q.id);
  const nativeReceivables = await prisma.receivable.findMany({
    where: {
      OR: [{ quoteId: { in: nativeIds } }, { kind: "MONTHLY" }],
      status: { notIn: ["CANCELLED", "VOID"] },
      currency: "CLP",
    },
    include: {
      allocations: { where: { payment: { status: "CONFIRMED" } }, select: { amount: true } },
    },
  });
  const plans = canonicalIds.length
    ? await prisma.$queryRaw<Row[]>`
    SELECT p.*, COALESCE((SELECT jsonb_agg(to_jsonb(i)) FROM quote_payment_installments i WHERE i.plan_id=p.id),'[]'::jsonb) AS installments
    FROM quote_payment_plans p WHERE p.quote_id IN (${Prisma.join(canonicalIds.map((id) => Prisma.sql`${id}::uuid`))})`
    : [];
  const ledger = canonicalIds.length
    ? await prisma.$queryRaw<Array<{ quote_id: string; amount: number; due_date: string | null }>>`
    SELECT COALESCE(s.quote_id,pr.quote_id) AS quote_id,a.amount,i.due_date::text AS due_date
    FROM payment_allocations a JOIN payments pay ON pay.id=a.payment_id JOIN invoices i ON i.id=a.invoice_id
    LEFT JOIN sales s ON s.id=i.sale_id LEFT JOIN projects pr ON pr.id=i.project_id
    WHERE a.reversed_at IS NULL AND pay.status='CONFIRMED' AND pay.currency=i.currency
      AND pay.currency=(SELECT currency FROM quotes WHERE id=COALESCE(s.quote_id,pr.quote_id))
      AND i.status NOT IN ('CANCELLED','VOID') AND COALESCE(s.quote_id,pr.quote_id) IN (${Prisma.join(canonicalIds.map((id) => Prisma.sql`${id}::uuid`))})`
    : [];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return items.map((q) => {
    const native = byView.get(q.id),
      plan = plans.find((p) => p.quote_id === q.id);
    const meta = native ? parseQuoteMessage(native.message) : null;
    const frequency: QuoteBilling["frequency"] = native
      ? meta?.payment?.billingType === "SUBSCRIPTION"
        ? "MONTHLY"
        : "ONE_TIME"
      : plan?.frequency === "MONTHLY"
        ? "MONTHLY"
        : plan?.frequency === "ONE_TIME"
          ? "ONE_TIME"
          : q.billingType === "SUBSCRIPTION"
            ? "MONTHLY"
            : q.billingType === "ONE_TIME"
              ? "ONE_TIME"
              : null;
    let evidence: QuoteEvidence[];
    if (native)
      evidence = nativeReceivables
        .filter((r) => r.quoteId === native.id)
        .map((r) => ({
          amount: r.totalAmount,
          paid: r.allocations.reduce((sum, a) => sum + a.amount, 0),
          dueDate: r.dueAt?.toISOString(),
          initial: r.quoteStageKey === "INITIAL",
        }));
    else if (plan) {
      const installments = plan.installments as Row[];
      evidence = installments
        .filter((i) => i.status !== "CANCELLED")
        .map((i) => ({
          amount: Number(i.amount),
          paid: i.status === "PAID" ? Number(i.paid_amount || 0) : 0,
          dueDate: String(i.due_date),
        }));
      const missing = Math.max(0, Number(plan.total_installments || 0) - installments.length);
      if (missing) evidence.push({ amount: missing * Number(plan.amount), paid: 0 });
    } else
      evidence = ledger
        .filter((r) => r.quote_id === q.id)
        .map((r) => ({ amount: Number(r.amount), paid: Number(r.amount), dueDate: r.due_date }));
    if (!native)
      evidence.push(
        ...nativeReceivables
          .filter(
            (r) =>
              r.kind === "MONTHLY" &&
              r.metadata &&
              typeof r.metadata === "object" &&
              !Array.isArray(r.metadata) &&
              r.metadata.quoteId === q.id,
          )
          .map((r) => ({
            amount: r.totalAmount,
            paid: r.allocations.reduce((s, a) => s + a.amount, 0),
            dueDate: r.dueAt?.toISOString(),
          })),
      );
    const finite = frequency !== "MONTHLY" || Boolean(plan?.total_installments);
    const totals = collectionSummary({
      total: plan && frequency === "ONE_TIME" ? Number(plan.amount) : q.totalAmount,
      frequency,
      finite,
      evidence,
      today,
    });
    const billing: QuoteBilling = {
      ...totals,
      source: native ? "WEBSITE" : "CONTROL",
      frequency,
      finite,
      editable: !native
        ? q.status === "DRAFT" && !plan && !q.documentId && !q.sentAt && !q.acceptedAt
        : Boolean(
            native &&
            q.status === "DRAFT" &&
            !nativeReceivables.some((r) => r.quoteId === native.id) &&
            !meta?.payment?.subscription?.subscriptionId &&
            !meta?.payment?.subscription?.registerToken &&
            !meta?.pdfGeneratedAt &&
            !meta?.payment?.stages?.some(
              (s) =>
                s.flow?.token ||
                ["PAID", "PROCESSING", "PENDING_TRANSFER_REVIEW"].includes(s.status),
            ) &&
            !meta?.payment?.legalAcceptance?.acceptedAt,
          ),
      basis: plan ? "CALENDAR" : frequency === "MONTHLY" ? "ISSUED_PERIODS" : "QUOTE",
      paidThrough: meta?.payment?.subscription?.paidThrough || null,
      monthlyAmount: frequency === "MONTHLY" ? Number(plan?.amount || q.totalAmount) : null,
      currency: String(plan?.currency || q.currency).trim(),
    };
    return { ...q, billing };
  });
}

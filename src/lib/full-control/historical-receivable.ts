import { legacyViewId } from "./legacy-id";

export type HistoricalReceivable = {
  id: string; clientId: string; description: string; currency: string; totalAmount: number;
  status: string; quoteId: string | null; saleId: string | null; projectId: string | null;
  taxDocumentId: string | null; issuedAt: Date; dueAt: Date | null; createdAt: Date; updatedAt: Date;
  client: { company: string | null; name: string | null };
  allocations: Array<{ id: string; paymentId: string; amount: number; createdAt: Date; payment: { status: string; currency: string } }>;
};

export function projectHistoricalReceivable(source: HistoricalReceivable, clientId: string | null, asOf: Date) {
  const allocations = source.allocations.filter(a => a.payment.status === "CONFIRMED" && a.payment.currency === source.currency);
  const paid = allocations.reduce((sum, a) => sum + a.amount, 0);
  const balance = Math.max(0, source.totalAmount - paid);
  const overdue = Boolean(source.dueAt && source.dueAt < asOf && balance > 0);
  const status = ["VOID", "CANCELLED"].includes(source.status) ? "CANCELLED" : balance === 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "ISSUED";
  return {
    id: legacyViewId("receivable", source.id), sourceId: source.id, legacySource: true,
    sourceType: "HISTORICAL_RECEIVABLE", invoiceNumber: "AR-" + source.id.slice(0, 8).toUpperCase(), documentTypeCode: 0,
    clientId, clientName: source.client.company || source.client.name, saleId: source.saleId,
    contractId: null, projectId: source.projectId ? legacyViewId("project", source.projectId) : null,
    clientServiceId: null, billingScheduleId: null, referenceInvoiceId: null, referenceCode: null, referenceReason: null,
    currency: source.currency, exchangeRate: 1, netAmount: null, exemptAmount: null, taxAmount: null,
    totalAmount: source.totalAmount, taxRate: null, taxRuleVersionId: null, amountPaid: paid,
    amountCredited: 0, balanceDue: balance, overallocatedAmount: Math.max(0, paid - source.totalAmount),
    status, effectiveStatus: status !== "CANCELLED" && overdue ? "OVERDUE" : status,
    issueDate: source.issuedAt.toISOString().slice(0, 10), dueDate: source.dueAt?.toISOString().slice(0, 10) || null,
    paymentTermsDays: null, paymentTerms: null, description: source.description,
    notes: "Obligación histórica; no constituye una factura ni autoriza emitir un DTE.",
    clientSnapshot: { legalName: source.client.company || source.client.name }, taxDocumentId: source.taxDocumentId,
    quoteId: source.quoteId, approvalRequired: false, approvedBy: null, approvedAt: null,
    issuedAt: source.issuedAt.toISOString(), cancelledAt: null, cancelReason: null, createdBy: null,
    createdAt: source.createdAt.toISOString(), updatedAt: source.updatedAt.toISOString(), lines: [],
    daysOverdue: overdue ? Math.floor((asOf.getTime() - source.dueAt!.getTime()) / 86400000) : 0,
    allocations: allocations.map(a => ({ id: a.id, paymentId: legacyViewId("payment", a.paymentId), invoiceId: legacyViewId("receivable", source.id), amount: a.amount, allocatedAt: a.createdAt.toISOString(), reversedAt: null })),
    taxDocuments: [], relatedNotes: [], events: [],
  };
}

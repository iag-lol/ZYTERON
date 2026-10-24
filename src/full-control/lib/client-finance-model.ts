import type { ClientRecurring } from "@/lib/payments/client-recurring-projection";
import type { SalesQuote, ClientFinanceSummary } from "@zyteron/contracts";
import type { QuoteBilling } from "@/lib/full-control/quote-register";
import type { SerializableClientFinanceSummary } from "@/components/admin/client-finance-panel";

export type ClientQuote = SalesQuote & {
  billing?: QuoteBilling;
  archivedAt?: string | null;
  archivePending?: boolean;
};
export type ClientReceivable = SerializableClientFinanceSummary["receivables"][number];
export type PortalFinance = {
  recurring?: ClientRecurring[];
  userId: string | null;
  summary: SerializableClientFinanceSummary | null;
};
export type FinanceSection = "overview" | "quotes" | "receivables" | "payments" | "invoices";
export type PaymentRegisterRow = {
  id: string;
  key: string;
  source: "commercial" | "accounting";
  reference: string;
  amount: number;
  allocated: number;
  credit: number;
  currency: string;
  status: string;
  method: string;
  receivedAt: string;
  voidReason?: string | null;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  APPROVED: "Aprobada",
  READY_TO_SEND: "Lista para enviar",
  SENT: "Enviada",
  VIEWED: "Vista",
  NEGOTIATING: "En negociación",
  ACCEPTED: "Aceptada",
  CONVERTED: "Convertida en venta",
  REJECTED: "Rechazada",
  CANCELLED: "Anulada",
  EXPIRED: "Vencida",
  CONFIRMED: "Confirmado",
  PENDING: "Pendiente",
  PENDING_VERIFICATION: "Por verificar",
  PARTIAL: "Abono parcial",
  PAID: "Pagado",
  OVERDUE: "Vencido",
  VOIDED: "Anulado",
  FAILED: "Fallido",
  UNPAID: "Sin pagos",
  CURRENT: "Al día",
  PARTIALLY_PAID: "Pago parcial",
  ARCHIVED: "Eliminada",
};
export const financeStatusLabel = (value: string) => statusLabels[value] || value;
export const paymentMethodLabel = (value: string) =>
  ({
    BANK_TRANSFER: "Transferencia",
    TRANSFER: "Transferencia",
    CARD: "Tarjeta",
    CASH: "Efectivo",
    CHECK: "Cheque",
    FLOW: "Flow",
    MERCADOPAGO: "Mercado Pago",
    OTHER: "Otro",
  })[value] || value;
const text = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
export const matchesFinanceSearch = (query: string, ...values: unknown[]) =>
  text(values.join(" ")).includes(text(query.trim()));
export const isOpenReceivable = (r: ClientReceivable) =>
  r.balanceAmount > 0 && !["CANCELLED", "PAID"].includes(r.status);
export const isLiveQuote = (q: ClientQuote) =>
  !q.archivedAt && !q.archivePending && !["CANCELLED", "REJECTED", "EXPIRED"].includes(q.status);

export function receivableCaption(r: ClientReceivable, quotes: readonly ClientQuote[]) {
  const q = quotes.find((q) => q.id === (r.quoteViewId || r.quoteId));
  if (!q || r.description.includes(q.quoteNumber)) return r.description;
  return `${r.description} · ${q.quoteNumber} · ${q.billing?.frequency === "MONTHLY" ? "Mensual" : "Pago único"}`;
}

export const receivablesForQuote = (rows: readonly ClientReceivable[], quoteId: string) =>
  rows.filter((r) => (r.quoteViewId || r.quoteId) === quoteId);

export const receivablesForPayment = (rows: readonly ClientReceivable[], paymentId: string) =>
  rows.filter((r) => r.paymentLinks?.some((link) => link.paymentId === paymentId));

/** Fechas civiles de Chile; un instante cercano a medianoche no pertenece necesariamente al mismo día UTC. */
export function financeCivilDay(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function receivableState(r: ClientReceivable, today: string) {
  return isOpenReceivable(r) && r.dueAt && financeCivilDay(r.dueAt) < today ? "OVERDUE" : r.status;
}
export function selectClientQuotes(
  rows: readonly ClientQuote[],
  options: { query: string; frequency: string; status: string; archived: boolean; sort: string },
) {
  return rows
    .filter(
      (q) =>
        (options.archived || !q.archivedAt) &&
        matchesFinanceSearch(
          options.query,
          q.quoteNumber,
          (q.items ?? []).map((i) => i.description).join(" "),
          financeStatusLabel(q.status),
        ) &&
        (options.frequency === "ALL" || q.billing?.frequency === options.frequency) &&
        (options.status === "ALL" ||
          (options.status === "BALANCE"
            ? isLiveQuote(q) && (q.billing?.balance ?? 0) > 0
            : q.status === options.status)),
    )
    .sort((a, b) =>
      options.sort === "balance"
        ? (b.billing?.balance ?? 0) - (a.billing?.balance ?? 0) ||
          b.createdAt.localeCompare(a.createdAt)
        : options.sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
    );
}
export function nextReceivables(rows: readonly ClientReceivable[], today: string) {
  return rows.filter(isOpenReceivable).sort((a, b) => {
    const aDay = financeCivilDay(a.dueAt),
      bDay = financeCivilDay(b.dueAt);
    const aOver = aDay && aDay < today ? 0 : 1,
      bOver = bDay && bDay < today ? 0 : 1;
    return (
      aOver - bOver ||
      (aDay || "9999").localeCompare(bDay || "9999") ||
      b.balanceAmount - a.balanceAmount
    );
  });
}
/** Los libros conservan su identidad: referencias iguales no demuestran que dos pagos sean el mismo. */
export function clientPaymentRows(
  portal: SerializableClientFinanceSummary | null | undefined,
  accounting: ClientFinanceSummary | null | undefined,
): PaymentRegisterRow[] {
  return [
    ...(portal?.available
      ? portal.payments.map((p) => ({
          id: p.id,
          key: `commercial:${p.id}`,
          source: "commercial" as const,
          reference: p.reference || "Sin referencia",
          amount: p.amount,
          allocated: p.allocatedAmount,
          credit: p.creditAmount,
          currency: "CLP",
          status: p.status,
          method: p.method,
          receivedAt: p.receivedAt,
          voidReason: p.voidReason,
        }))
      : []),
    ...(accounting?.payments ?? []).map((p) => ({
      id: p.id,
      key: `accounting:${p.id}`,
      source: "accounting" as const,
      reference: p.paymentReference,
      amount: p.grossAmount,
      allocated: p.allocatedAmount,
      credit: p.unappliedAmount,
      currency: p.currency,
      status: p.status,
      method: p.provider,
      receivedAt: p.receivedAt,
    })),
  ].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
export function selectClientPayments(
  rows: readonly PaymentRegisterRow[],
  options: { query: string; source: string; status: string; from: string; to: string },
) {
  return rows.filter(
    (p) =>
      (options.source === "ALL" || p.source === options.source) &&
      (options.status === "ALL" ||
        (options.status === "CREDIT"
          ? p.status === "CONFIRMED" && p.credit > 0
          : p.status === options.status)) &&
      matchesFinanceSearch(
        options.query,
        p.reference,
        paymentMethodLabel(p.method),
        financeStatusLabel(p.status),
      ) &&
      (!options.from || financeCivilDay(p.receivedAt) >= options.from) &&
      (!options.to || financeCivilDay(p.receivedAt) <= options.to),
  );
}
/** El prefijo evita que Excel ejecute fórmulas procedentes de referencias o textos del cliente. */
export function financeCsv(headers: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    const raw = String(v ?? "");
    const safe = /^[\s]*[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
}

import { getProjects, getWorkOrders, safeSelect, type Project, type WorkOrder } from "@/lib/admin/repository";

export type AccountingTaxPeriod = {
  id: string;
  period: string;
  declared_in_sii: boolean;
  declared_at?: string | null;
  declared_by?: string | null;
  locked: boolean;
  f29_document_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AccountingCompany = {
  id: string;
  type: "CLIENT" | "SUPPLIER" | "BOTH" | string;
  name: string;
  rut: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  business_activity?: string | null;
  notes?: string | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AccountingTransaction = {
  id: string;
  type: "IN" | "OUT" | string;
  category: string;
  status: "PENDIENTE" | "PAGADO" | "ANULADO" | "OBSERVADO" | string;
  tax_period: string;
  project_id?: string | null;
  company_id?: string | null;
  document_number?: string | null;
  document_date: string;
  due_date?: string | null;
  issuer_name?: string | null;
  issuer_rut?: string | null;
  receiver_name?: string | null;
  receiver_rut?: string | null;
  description?: string | null;
  neto?: number | null;
  iva?: number | null;
  total?: number | null;
  paid_at?: string | null;
  payment_method?: string | null;
  document_url?: string | null;
  document_storage_path?: string | null;
  locked?: boolean | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AccountingBusinessDocument = {
  id: string;
  transaction_id?: string | null;
  project_id?: string | null;
  tax_period?: string | null;
  file_name: string;
  file_type: string;
  storage_path: string;
  public_url?: string | null;
  document_kind: string;
  uploaded_by?: string | null;
  created_at?: string | null;
  document_number?: string | null;
  document_date?: string | null;
  transaction_status?: string | null;
  transaction_total?: number | null;
  project_name?: string | null;
};

export type AccountingMonthlySummary = {
  period: string;
  declared_in_sii: boolean;
  declared_at?: string | null;
  locked: boolean;
  f29_document_url?: string | null;
  transactions_count?: number | null;
  income_count?: number | null;
  expense_count?: number | null;
  income_neto?: number | null;
  income_iva?: number | null;
  income_total?: number | null;
  expense_neto?: number | null;
  expense_iva?: number | null;
  expense_total?: number | null;
  iva_debito?: number | null;
  iva_credito?: number | null;
  iva_balance?: number | null;
  pending_total?: number | null;
  paid_total?: number | null;
  transactions_without_support?: number | null;
  transactions_with_support?: number | null;
};

export type AccountingProjectTraceability = {
  project_id: string;
  quote_id?: string | null;
  ot_number?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  client_rut?: string | null;
  project_name: string;
  project_status?: string | null;
  estimated_total?: number | null;
  invoiced_total?: number | null;
  paid_total?: number | null;
  expected_invoice_date?: string | null;
  accounting_transactions?: number | null;
  last_tax_period?: string | null;
  created_at?: string | null;
};

export type AccountingAlert = {
  alert_key: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | string;
  title: string;
  message: string;
  module: string;
  related_table?: string | null;
  related_id?: string | null;
  tax_period?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type AccountingDashboardData = {
  selectedPeriod: string;
  availablePeriods: string[];
  schemaReady: boolean;
  periods: AccountingTaxPeriod[];
  companies: AccountingCompany[];
  transactions: AccountingTransaction[];
  documents: AccountingBusinessDocument[];
  projectTraceability: AccountingProjectTraceability[];
  alerts: AccountingAlert[];
  summary: AccountingMonthlySummary;
};

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePeriod(value?: string | null) {
  const candidate = String(value || "").trim();
  return /^[0-9]{4}-[0-9]{2}$/.test(candidate) ? candidate : "";
}

function comparePeriodsDesc(a: string, b: string) {
  return b.localeCompare(a);
}

function buildFallbackSummary(period: string, periods: AccountingTaxPeriod[], transactions: AccountingTransaction[]) {
  const periodMeta = periods.find((item) => item.period === period);
  const rows = transactions.filter((item) => item.tax_period === period);
  const income = rows.filter((item) => item.type === "IN" && item.status !== "ANULADO");
  const expense = rows.filter((item) => item.type === "OUT" && item.status !== "ANULADO");

  return {
    period,
    declared_in_sii: periodMeta?.declared_in_sii ?? false,
    declared_at: periodMeta?.declared_at ?? null,
    locked: periodMeta?.locked ?? false,
    f29_document_url: periodMeta?.f29_document_url ?? null,
    transactions_count: rows.length,
    income_count: income.length,
    expense_count: expense.length,
    income_neto: income.reduce((acc, item) => acc + toNumber(item.neto), 0),
    income_iva: income.reduce((acc, item) => acc + toNumber(item.iva), 0),
    income_total: income.reduce((acc, item) => acc + toNumber(item.total), 0),
    expense_neto: expense.reduce((acc, item) => acc + toNumber(item.neto), 0),
    expense_iva: expense.reduce((acc, item) => acc + toNumber(item.iva), 0),
    expense_total: expense.reduce((acc, item) => acc + toNumber(item.total), 0),
    iva_debito: income.reduce((acc, item) => acc + toNumber(item.iva), 0),
    iva_credito: expense.reduce((acc, item) => acc + toNumber(item.iva), 0),
    iva_balance:
      income.reduce((acc, item) => acc + toNumber(item.iva), 0) -
      expense.reduce((acc, item) => acc + toNumber(item.iva), 0),
    pending_total: rows
      .filter((item) => item.status === "PENDIENTE")
      .reduce((acc, item) => acc + toNumber(item.total), 0),
    paid_total: rows
      .filter((item) => item.status === "PAGADO")
      .reduce((acc, item) => acc + toNumber(item.total), 0),
    transactions_without_support: rows.filter(
      (item) => !String(item.document_url || "").trim() && !String(item.document_storage_path || "").trim(),
    ).length,
    transactions_with_support: rows.filter(
      (item) => String(item.document_url || "").trim() || String(item.document_storage_path || "").trim(),
    ).length,
  } satisfies AccountingMonthlySummary;
}

function buildFallbackAlerts(period: string, transactions: AccountingTransaction[], periods: AccountingTaxPeriod[]) {
  const alerts: AccountingAlert[] = [];
  const periodMeta = periods.find((item) => item.period === period);

  if (periodMeta && !periodMeta.declared_in_sii && period < currentPeriod()) {
    alerts.push({
      alert_key: `PERIOD_UNDECLARED_${period}`,
      severity: "WARNING",
      title: "Periodo pendiente de declaracion",
      message: `El periodo ${period} aun no esta declarado en SII.`,
      module: "tax-periods",
      related_table: "tax_periods",
      tax_period: period,
      status: "OPEN",
      created_at: periodMeta.created_at || null,
    });
  }

  for (const transaction of transactions) {
    if (transaction.status === "PENDIENTE" && transaction.due_date && transaction.due_date < new Date().toISOString().slice(0, 10)) {
      alerts.push({
        alert_key: `TX_OVERDUE_${transaction.id}`,
        severity: "CRITICAL",
        title: "Documento vencido pendiente de pago",
        message: `El documento ${transaction.document_number || transaction.id} esta vencido y sigue pendiente.`,
        module: "transactions",
        related_table: "transactions",
        related_id: transaction.id,
        tax_period: transaction.tax_period,
        status: "OPEN",
        created_at: transaction.created_at || null,
      });
    }

    if (
      transaction.status !== "ANULADO" &&
      !String(transaction.document_url || "").trim() &&
      !String(transaction.document_storage_path || "").trim()
    ) {
      alerts.push({
        alert_key: `TX_SUPPORT_${transaction.id}`,
        severity: "WARNING",
        title: "Documento sin respaldo adjunto",
        message: `La transaccion ${transaction.document_number || transaction.id} no tiene archivo de respaldo.`,
        module: "documents",
        related_table: "transactions",
        related_id: transaction.id,
        tax_period: transaction.tax_period,
        status: "OPEN",
        created_at: transaction.created_at || null,
      });
    }
  }

  return alerts.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

function buildFallbackProjects(projects: Project[], workOrders: WorkOrder[]): AccountingProjectTraceability[] {
  const projectRows = projects.map((project) => ({
    project_id: project.id,
    quote_id: project.quoteId || null,
    ot_number: null,
    client_id: project.clientId || null,
    client_name: null,
    client_rut: null,
    project_name: project.title,
    project_status: project.status || "COTIZADO",
    estimated_total: toNumber(project.totalCharge),
    invoiced_total: 0,
    paid_total: 0,
    expected_invoice_date: null,
    accounting_transactions: 0,
    last_tax_period: null,
    created_at: project.createdAt || null,
  }));

  const workOrderRows = workOrders.map((order) => ({
    project_id: order.id,
    quote_id: order.quoteId || null,
    ot_number: order.code,
    client_id: order.clientId || null,
    client_name: null,
    client_rut: null,
    project_name: order.title,
    project_status: order.status || "ACTIVE",
    estimated_total: toNumber(order.budget),
    invoiced_total: 0,
    paid_total: 0,
    expected_invoice_date: order.dueDate || order.plannedDate || null,
    accounting_transactions: 0,
    last_tax_period: null,
    created_at: order.createdAt || null,
  }));

  const merged = new Map<string, AccountingProjectTraceability>();
  for (const row of [...projectRows, ...workOrderRows]) {
    if (!merged.has(row.project_id)) {
      merged.set(row.project_id, row);
    }
  }

  return Array.from(merged.values()).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

export async function getAccountingDashboardData(requestedPeriod?: string | null): Promise<AccountingDashboardData> {
  const [
    periods,
    companies,
    summaries,
    transactions,
    documents,
    projectTraceability,
    alerts,
    projectsFallback,
    workOrdersFallback,
  ] = await Promise.all([
    safeSelect<AccountingTaxPeriod>(
      "tax_periods",
      "id, period, declared_in_sii, declared_at, declared_by, locked, f29_document_url, notes, created_at, updated_at",
      { orderBy: "period", ascending: false },
    ),
    safeSelect<AccountingCompany>(
      "companies",
      "id, type, name, rut, email, phone, address, business_activity, notes, active, created_at, updated_at",
      { orderBy: "name", ascending: true },
    ),
    safeSelect<AccountingMonthlySummary>(
      "accounting_monthly_summary",
      "period, declared_in_sii, declared_at, locked, f29_document_url, transactions_count, income_count, expense_count, income_neto, income_iva, income_total, expense_neto, expense_iva, expense_total, iva_debito, iva_credito, iva_balance, pending_total, paid_total, transactions_without_support, transactions_with_support",
      { orderBy: "period", ascending: false },
    ),
    safeSelect<AccountingTransaction>(
      "transactions",
      "id, type, category, status, tax_period, project_id, company_id, document_number, document_date, due_date, issuer_name, issuer_rut, receiver_name, receiver_rut, description, neto, iva, total, paid_at, payment_method, document_url, document_storage_path, locked, created_by, updated_by, created_at, updated_at",
      { orderBy: "document_date", ascending: false },
    ),
    safeSelect<AccountingBusinessDocument>(
      "accounting_document_registry",
      "id, transaction_id, project_id, tax_period, file_name, file_type, storage_path, public_url, document_kind, uploaded_by, created_at, document_number, document_date, transaction_status, transaction_total, project_name",
      { orderBy: "created_at", ascending: false },
    ),
    safeSelect<AccountingProjectTraceability>(
      "accounting_project_traceability",
      "project_id, quote_id, ot_number, client_id, client_name, client_rut, project_name, project_status, estimated_total, invoiced_total, paid_total, expected_invoice_date, accounting_transactions, last_tax_period, created_at",
      { orderBy: "created_at", ascending: false },
    ),
    safeSelect<AccountingAlert>(
      "accounting_generated_alerts",
      "alert_key, severity, title, message, module, related_table, related_id, tax_period, status, created_at",
      { orderBy: "created_at", ascending: false },
    ),
    getProjects(),
    getWorkOrders(),
  ]);

  const availablePeriods = Array.from(
    new Set(
      [currentPeriod(), ...periods.map((item) => item.period), ...summaries.map((item) => item.period), ...transactions.map((item) => item.tax_period)]
        .map((item) => normalizePeriod(item))
        .filter(Boolean),
    ),
  ).sort(comparePeriodsDesc);

  const selectedPeriod =
    normalizePeriod(requestedPeriod) && availablePeriods.includes(normalizePeriod(requestedPeriod))
      ? normalizePeriod(requestedPeriod)
      : availablePeriods[0] || currentPeriod();

  const filteredTransactions = transactions.filter((item) => item.tax_period === selectedPeriod);
  const filteredDocuments = documents.filter((item) => String(item.tax_period || "").trim() === selectedPeriod);
  const filteredAlerts = alerts.filter((item) => !item.tax_period || item.tax_period === selectedPeriod);
  const summary =
    summaries.find((item) => item.period === selectedPeriod) ||
    buildFallbackSummary(selectedPeriod, periods, filteredTransactions);

  return {
    selectedPeriod,
    availablePeriods,
    schemaReady:
      periods.length > 0 ||
      companies.length > 0 ||
      transactions.length > 0 ||
      documents.length > 0 ||
      summaries.length > 0 ||
      alerts.length > 0 ||
      projectsFallback.length > 0 ||
      workOrdersFallback.length > 0,
    periods,
    companies,
    transactions: filteredTransactions,
    documents: filteredDocuments,
    projectTraceability:
      projectTraceability.length > 0
        ? projectTraceability
        : buildFallbackProjects(projectsFallback, workOrdersFallback),
    alerts: filteredAlerts.length > 0 ? filteredAlerts : buildFallbackAlerts(selectedPeriod, filteredTransactions, periods),
    summary,
  };
}

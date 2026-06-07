import * as XLSX from "xlsx";
import type { AccountingDashboardData } from "@/lib/admin/accounting";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function buildAccountingWorkbook(data: AccountingDashboardData) {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    { indicador: "Periodo", valor: data.selectedPeriod },
    { indicador: "Ingresos netos", valor: formatCurrency(Number(data.summary.income_neto || 0)) },
    { indicador: "Egresos netos", valor: formatCurrency(Number(data.summary.expense_neto || 0)) },
    { indicador: "IVA debito", valor: formatCurrency(Number(data.summary.iva_debito || 0)) },
    { indicador: "IVA credito", valor: formatCurrency(Number(data.summary.iva_credito || 0)) },
    { indicador: "Balance IVA", valor: formatCurrency(Number(data.summary.iva_balance || 0)) },
    { indicador: "Pendiente por cobrar/pagar", valor: formatCurrency(Number(data.summary.pending_total || 0)) },
    { indicador: "Pagado", valor: formatCurrency(Number(data.summary.paid_total || 0)) },
    { indicador: "Periodo declarado", valor: data.summary.declared_in_sii ? "Si" : "No" },
    { indicador: "Periodo bloqueado", valor: data.summary.locked ? "Si" : "No" },
  ];

  const periodsRows = data.periods.map((item) => ({
    periodo: item.period,
    declarado_en_sii: item.declared_in_sii ? "Si" : "No",
    bloqueado: item.locked ? "Si" : "No",
    fecha_declaracion: formatDate(item.declared_at),
    f29_url: item.f29_document_url || "",
    notas: item.notes || "",
  }));

  const transactionRows = data.transactions.map((item) => ({
    periodo: item.tax_period,
    fecha_documento: formatDate(item.document_date),
    tipo: item.type,
    categoria: item.category,
    estado: item.status,
    numero_documento: item.document_number || "",
    emisor: item.issuer_name || "",
    receptor: item.receiver_name || "",
    neto: Number(item.neto || 0),
    iva: Number(item.iva || 0),
    total: Number(item.total || 0),
    vencimiento: formatDate(item.due_date),
    pagado_el: formatDate(item.paid_at),
    metodo_pago: item.payment_method || "",
    documento_url: item.document_url || "",
    detalle: item.description || "",
  }));

  const documentsRows = data.documents.map((item) => ({
    periodo: item.tax_period || "",
    tipo: item.document_kind,
    archivo: item.file_name,
    mime: item.file_type,
    numero_documento: item.document_number || "",
    fecha_documento: formatDate(item.document_date),
    proyecto: item.project_name || "",
    estado_transaccion: item.transaction_status || "",
    total_transaccion: Number(item.transaction_total || 0),
    url_publica: item.public_url || "",
    storage_path: item.storage_path,
  }));

  const projectsRows = data.projectTraceability.map((item) => ({
    proyecto_id: item.project_id,
    proyecto: item.project_name,
    estado: item.project_status || "",
    cliente: item.client_name || "",
    rut_cliente: item.client_rut || "",
    cotizacion: item.quote_id || "",
    ot: item.ot_number || "",
    estimado: Number(item.estimated_total || 0),
    facturado: Number(item.invoiced_total || 0),
    pagado: Number(item.paid_total || 0),
    periodo_ultimo_movimiento: item.last_tax_period || "",
    fecha_esperada_factura: formatDate(item.expected_invoice_date),
  }));

  const alertRows = data.alerts.map((item) => ({
    severidad: item.severity,
    titulo: item.title,
    mensaje: item.message,
    modulo: item.module,
    periodo: item.tax_period || "",
    estado: item.status || "",
    creado: formatDate(item.created_at),
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumen");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(periodsRows), "Periodos");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionRows), "Transacciones");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(documentsRows), "Documentos");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(projectsRows), "Proyectos");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(alertRows), "Alertas");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

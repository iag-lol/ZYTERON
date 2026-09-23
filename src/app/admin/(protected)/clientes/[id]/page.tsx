import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  CircleDollarSign,
  CircleX,
  FileCheck2,
  FileText,
  FolderKanban,
  KeyRound,
  LifeBuoy,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  Workflow,
} from "lucide-react";
import { AdminCommunicationsCenter } from "@/components/admin/admin-communications-center";
import {
  ClientFinancePanel,
  type SerializableClientFinanceSummary,
} from "@/components/admin/client-finance-panel";
import { PortalClientAdminActions } from "@/components/admin/portal-client-admin-actions";
import { getClientFinanceSummary } from "@/lib/admin/client-finance";
import { getOperationsDashboard } from "@/lib/admin/operations";
import { OPERATION_STAGES } from "@/lib/admin/operations-workflow";
import { getClientWorkspace } from "@/lib/admin/repository";
import { prisma } from "@/lib/prisma";
import { getPortalAdminClientDetail } from "@/lib/portal/data";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

function currency(value?: number | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function dateLabel(value?: Date | string | null, includeTime = false) {
  if (!value) return "Sin fecha";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(parsed);
}

function serializeFinance(
  summary: Awaited<ReturnType<typeof getClientFinanceSummary>>,
): SerializableClientFinanceSummary {
  return {
    ...summary,
    receivables: summary.receivables.map((item) => ({
      ...item,
      issuedAt: item.issuedAt.toISOString(),
      dueAt: item.dueAt?.toISOString() || null,
    })),
    payments: summary.payments.map((item) => ({
      ...item,
      receivedAt: item.receivedAt.toISOString(),
      voidedAt: item.voidedAt?.toISOString() || null,
    })),
  };
}

function accountTone(status: string) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "DISABLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function operationStatusLabel(status: string) {
  if (status === "ACTIVE") return "Activo";
  if (status === "ON_HOLD") return "En pausa";
  if (status === "CLOSED") return "Cerrado";
  return "Cancelado";
}

export default async function ClienteDetallePage({ params }: Params) {
  const { id } = await params;
  const [workspace, portalDetail, finance, operationsDashboard, workOrders] = await Promise.all([
    getClientWorkspace(id),
    getPortalAdminClientDetail(id).catch(() => null),
    getClientFinanceSummary(id),
    getOperationsDashboard(),
    prisma.workOrder
      .findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          code: true,
          status: true,
          priority: true,
          title: true,
          dueDate: true,
          assignedTo: true,
          pdfUrl: true,
          createdAt: true,
        },
      })
      .catch(() => []),
  ]);

  if (!workspace.client && !portalDetail?.user) notFound();

  const baseClient = workspace.client;
  const portalUser = portalDetail?.user;
  const clientName = portalUser?.name || baseClient?.name || "Cliente";
  const company = portalUser?.company || baseClient?.company || null;
  const email = portalUser?.email || baseClient?.email || null;
  const phone = portalUser?.phone || baseClient?.phone || null;
  const operations = operationsDashboard.operations.filter(
    (operation) => operation.client.id === id,
  );
  const primaryOperation =
    operations.find((operation) => operation.status === "ACTIVE") || operations[0] || null;
  const activeStageIndex = primaryOperation
    ? OPERATION_STAGES.findIndex((stage) => stage.key === primaryOperation.stage)
    : -1;
  const portalDocuments = portalDetail?.documents || [];
  const tickets = portalDetail?.tickets || [];
  const credentials = portalDetail?.credentials || [];
  const communications = portalDetail?.communications || [];
  const audit = portalDetail?.audit || [];
  const financeSummary = serializeFinance(finance);
  const totalQuoted = workspace.quotes.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  const quickMetrics = [
    {
      label: "Expedientes",
      value: operations.length,
      helper: primaryOperation
        ? `${primaryOperation.stageProgress}% · ${primaryOperation.stage.replaceAll("_", " ")}`
        : "Sin proceso abierto",
      icon: Workflow,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Cotizado",
      value: currency(totalQuoted),
      helper: `${workspace.quotes.length} cotizaciones`,
      icon: FileText,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Saldo pendiente",
      value: currency(finance.totals.outstandingAmount),
      helper: finance.available ? `${finance.receivables.length} cuentas` : "Migración pendiente",
      icon: CircleDollarSign,
      tone:
        finance.totals.overdueAmount > 0
          ? "bg-rose-50 text-rose-700"
          : "bg-amber-50 text-amber-700",
    },
    {
      label: "Ejecución",
      value: workspace.projects.length + workOrders.length,
      helper: `${workspace.projects.length} proyectos · ${workOrders.length} OT`,
      icon: FolderKanban,
      tone: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Portal y soporte",
      value: portalDocuments.length + tickets.length,
      helper: `${portalDocuments.length} archivos · ${tickets.length} tickets`,
      icon: LifeBuoy,
      tone: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-6 md:px-7">
          <div className="pointer-events-none absolute top-0 right-8 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-3">
              <Link
                href="/admin/clientes"
                className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold tracking-[0.2em] text-blue-600 uppercase">
                    Ficha cliente 360°
                  </p>
                  {portalUser ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${accountTone(portalUser.accountStatus)}`}
                    >
                      Portal{" "}
                      {portalUser.accountStatus === "ACTIVE"
                        ? "activo"
                        : portalUser.accountStatus === "DISABLED"
                          ? "bloqueado"
                          : "pendiente"}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                  {company || clientName}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {company ? `${clientName} · ` : ""}
                  {email || "Sin correo registrado"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/cotizaciones/nueva?clientId=${id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                <FileText className="h-4 w-4" /> Nueva cotización
              </Link>
              <Link
                href={`/admin/sii/nuevo?clientId=${id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <Receipt className="h-4 w-4" /> Emitir documento
              </Link>
              <a
                href="#finanzas"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <CircleDollarSign className="h-4 w-4" /> Registrar pago
              </a>
            </div>
          </div>
        </div>
        <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-5">
          {quickMetrics.map((metric) => (
            <article key={metric.label} className="flex items-center gap-3 bg-slate-50 px-4 py-4">
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${metric.tone}`}
              >
                <metric.icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold text-slate-950">{metric.value}</p>
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {metric.label}
                </p>
                <p className="truncate text-[11px] text-slate-400">{metric.helper}</p>
              </div>
            </article>
          ))}
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-blue-600 uppercase">
              Proceso paso a paso
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">
              Ruta comercial, operativa y financiera
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Un expediente conserva el contexto completo desde el primer contacto hasta postventa.
            </p>
          </div>
          <Link
            href={
              primaryOperation
                ? `/admin/operaciones?focus=${primaryOperation.id}`
                : "/admin/operaciones"
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            Gestionar operaciones <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          {OPERATION_STAGES.map((stage, index) => {
            const isCurrent = index === activeStageIndex;
            const isDone = index < activeStageIndex;
            return (
              <div
                key={stage.key}
                className={`relative rounded-xl border px-3 py-3 ${isCurrent ? "border-blue-400 bg-blue-50 shadow-sm" : isDone ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50/70"}`}
                title={stage.description}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold ${isCurrent ? "bg-blue-700 text-white" : isDone ? "bg-emerald-600 text-white" : "bg-white text-slate-400"}`}
                  >
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                    {stage.area}
                  </span>
                </div>
                <p
                  className={`mt-2 text-xs font-bold ${isCurrent ? "text-blue-800" : isDone ? "text-emerald-800" : "text-slate-600"}`}
                >
                  {stage.shortLabel}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {operations.slice(0, 3).map((operation) => (
            <article
              key={operation.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                    {operation.code}
                  </p>
                  <h3 className="mt-1 text-sm font-extrabold text-slate-900">{operation.title}</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {operationStatusLabel(operation.status)}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${operation.stageProgress}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <p>
                  <span className="text-slate-400">Etapa</span>
                  <br />
                  <span className="font-bold text-slate-700">
                    {operation.stage.replaceAll("_", " ")}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">Próxima acción</span>
                  <br />
                  <span className="font-bold text-slate-700">
                    {operation.nextAction || "Por definir"}
                  </span>
                </p>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Actualizado {dateLabel(operation.updatedAt, true)}
              </p>
            </article>
          ))}
          {operations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-7 lg:col-span-3">
              <p className="text-sm font-bold text-slate-700">
                Aún no existe un expediente normalizado.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Créalo desde Operaciones usando este cliente o una de sus cotizaciones para enlazar
                todo sin duplicados.
              </p>
              <Link
                href="/admin/operaciones"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700"
              >
                Abrir Operaciones <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <ClientFinancePanel clientId={id} initialSummary={financeSummary} />

      <section className="grid gap-5 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Cotizaciones y ventas</h2>
          </div>
          <div className="mt-4 space-y-2">
            {workspace.quotes.slice(0, 5).map((quote) => (
              <Link
                key={quote.id}
                href={`/admin/cotizaciones/${quote.id}`}
                className="block rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{quote.displayNumber}</p>
                  <span className="text-xs font-extrabold text-blue-700">
                    {currency(quote.totalAmount)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {quote.status} · {dateLabel(quote.issuedAt)}
                </p>
              </Link>
            ))}
            {workspace.quotes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                Sin cotizaciones.
              </p>
            ) : null}
          </div>
          {workspace.sales.length > 0 ? (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <ShoppingBag className="mr-1 inline h-3.5 w-3.5" />
              {workspace.sales.length} ventas legacy ·{" "}
              {currency(workspace.sales.reduce((sum, sale) => sum + (sale.total || 0), 0))}
            </p>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-cyan-600" />
            <h2 className="text-sm font-extrabold text-slate-900">OT y proyectos</h2>
          </div>
          <div className="mt-4 space-y-2">
            {workOrders.slice(0, 3).map((order) => (
              <div key={order.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{order.code}</p>
                  <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700">
                    {order.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{order.title}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {order.assignedTo || "Sin responsable"} · {dateLabel(order.dueDate)}
                </p>
              </div>
            ))}
            {workspace.projects.slice(0, 3).map((project) => (
              <div key={project.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">{project.title}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Proyecto · {project.status || "Planificado"} ·{" "}
                  {project.owner || "Sin responsable"}
                </p>
              </div>
            ))}
            {workOrders.length === 0 && workspace.projects.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                Sin ejecución asociada.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Documentos tributarios</h2>
          </div>
          <div className="mt-4 space-y-2">
            {workspace.documents.slice(0, 6).map((document) => (
              <div key={document.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    {document.type || "Documento"}{" "}
                    {document.documentNumber ? `· ${document.documentNumber}` : ""}
                  </p>
                  <p className="text-xs font-extrabold text-emerald-700">
                    {currency(document.totalAmount)}
                  </p>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {document.status || "Registrado"} · pago {document.paymentStatus || "pendiente"} ·{" "}
                  {dateLabel(document.issueDate)}
                </p>
              </div>
            ))}
            {workspace.documents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                Sin documentos tributarios.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-blue-700" />
                <h2 className="text-sm font-extrabold text-slate-900">Identidad y seguridad</h2>
              </div>
              {portalUser?.emailVerifiedAt ? (
                <CircleCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <CircleX className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {email || "Sin correo"}
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                {phone || "Sin teléfono"}
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                {[baseClient?.address, baseClient?.city].filter(Boolean).join(", ") ||
                  "Sin dirección"}
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                {portalUser?.emailVerifiedAt
                  ? `Correo verificado · ${dateLabel(portalUser.emailVerifiedAt)}`
                  : "Verificación pendiente"}
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <KeyRound className="h-4 w-4 text-slate-400" />
                {credentials.length} accesos cifrados
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Activity className="h-4 w-4 text-slate-400" />
                {audit.length} eventos auditados
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Notas internas
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {portalUser?.notes || baseClient?.notes || "Sin notas internas."}
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-extrabold text-slate-900">
                Archivos privados del cliente
              </h2>
            </div>
            <div className="mt-4 space-y-2">
              {portalDocuments.slice(0, 8).map((document) => (
                <a
                  key={document.id}
                  href={`/api/portal/documents/${document.id}/download`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{document.title}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {document.category} · {document.fileName}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                </a>
              ))}
              {portalDocuments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                  Sin archivos compartidos.
                </p>
              ) : null}
            </div>
          </article>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-orange-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Agenda, solicitudes y soporte</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {workspace.visits.slice(0, 4).map((visit) => (
              <div key={visit.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">
                  Visita · {visit.status || "Programada"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{dateLabel(visit.date, true)}</p>
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                  {visit.notes || "Sin notas"}
                </p>
              </div>
            ))}
            {workspace.requests.slice(0, 4).map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">{request.subject}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {request.channel || "Solicitud"} · {request.status || "Abierta"}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                  {request.description || "Sin detalle"}
                </p>
              </div>
            ))}
            {tickets.slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">{ticket.title}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Ticket · {ticket.status} · {ticket.priority}
                </p>
              </div>
            ))}
            {workspace.visits.length === 0 &&
            workspace.requests.length === 0 &&
            tickets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400 md:col-span-2">
                Sin actividad de soporte registrada.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      {portalUser ? (
        <section className="space-y-5">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-blue-600 uppercase">
              Administración del portal
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">
              Perfil, accesos, archivos y atención
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Todos los controles del cliente quedan centralizados en una sola ficha.
            </p>
          </div>
          <PortalClientAdminActions
            userId={portalUser.id}
            initial={{
              firstName: portalUser.firstName || portalUser.name.split(" ")[0] || "",
              lastName: portalUser.lastName || portalUser.name.split(" ").slice(1).join(" ") || "",
              company: portalUser.company || "",
              phone: portalUser.phone || "",
              notes: portalUser.notes || "",
              accountStatus: portalUser.accountStatus,
            }}
          />

          <div>
            <div className="mb-4 flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-blue-700" />
              <h2 className="text-lg font-extrabold text-slate-950">Centro de comunicaciones</h2>
            </div>
            <AdminCommunicationsCenter
              userId={portalUser.id}
              initialCommunications={communications.map((item) => ({
                id: item.id,
                subject: item.subject,
                message: item.message,
                direction: item.direction,
                channel: item.channel,
                createdAt: item.createdAt.toISOString(),
              }))}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

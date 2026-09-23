import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Flag,
  Layers3,
  PauseCircle,
  PlusCircle,
  Search,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import {
  PROCESS_PRIORITIES,
  PROCESS_STATUSES,
  getOperationsDashboard,
  operationStageGroups,
  type AlertSeverity,
  type OperationRecord,
  type ProcessStatus,
} from "@/lib/admin/operations";
import {
  OPERATION_STAGES,
  isOperationStage,
  operationStageDefinition,
} from "@/lib/admin/operations-workflow";

export const dynamic = "force-dynamic";

type PageQuery = {
  q?: string;
  stage?: string;
  status?: string;
  alert?: string;
  source?: string;
  process_created?: string;
  process_reused?: string;
  process_updated?: string;
  operation_error?: string;
  focus?: string;
};

type PageProps = {
  searchParams?: PageQuery | Promise<PageQuery>;
};

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateLabel(value?: string | null, includeTime = false) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(parsed);
}

function datetimeLocal(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function statusLabel(status: ProcessStatus) {
  if (status === "ACTIVE") return "Activo";
  if (status === "ON_HOLD") return "En pausa";
  if (status === "CLOSED") return "Cerrado";
  return "Cancelado";
}

function statusStyles(status: ProcessStatus) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "ON_HOLD") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "CLOSED") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function outcomeStyles(outcome: OperationRecord["outcome"]) {
  if (outcome === "WON") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (outcome === "LOST") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-white text-slate-500";
}

function priorityLabel(priority: OperationRecord["priority"]) {
  if (priority === "URGENT") return "Urgente";
  if (priority === "HIGH") return "Alta";
  if (priority === "LOW") return "Baja";
  return "Normal";
}

function priorityStyles(priority: OperationRecord["priority"]) {
  if (priority === "URGENT") return "text-rose-700";
  if (priority === "HIGH") return "text-orange-700";
  if (priority === "LOW") return "text-slate-500";
  return "text-blue-700";
}

function alertStyles(severity: AlertSeverity) {
  if (severity === "CRITICAL") return "border-rose-200 bg-rose-50 text-rose-700";
  if (severity === "WARNING") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function financialStatusLabel(status: OperationRecord["financials"]["status"]) {
  if (status === "PAID") return "Pagado";
  if (status === "PARTIAL") return "Abono parcial";
  if (status === "OVERPAID") return "Con crédito";
  return "Pendiente";
}

function flashError(code?: string) {
  const messages: Record<string, string> = {
    origin: "La solicitud fue rechazada por seguridad. Recarga la página e inténtalo nuevamente.",
    schema_missing:
      "La migración operativa aún no está instalada; la vista legacy continúa disponible en modo lectura.",
    source_required: "Selecciona una cotización o un cliente para crear el expediente.",
    quote_not_found: "No se encontró la cotización seleccionada.",
    client_not_found: "No se encontró un cliente válido.",
    process_not_found: "El expediente ya no existe o fue movido.",
    process_conflict:
      "Otra sesión actualizó este expediente. Recarga la página antes de guardar nuevamente.",
    invalid_transition:
      "La transición no es válida. Los saltos, retrocesos y reaperturas requieren excepción y razón.",
    invalid_date: "La fecha de próxima acción no es válida.",
    invalid_stage: "La etapa seleccionada no es válida.",
    invalid_status: "El estado seleccionado no es válido.",
    invalid_outcome: "El resultado comercial seleccionado no es válido.",
    unexpected: "No se pudo completar la operación. Revisa los datos e inténtalo nuevamente.",
  };
  return code ? messages[code] || messages.unexpected : null;
}

function relationLinks(operation: OperationRecord) {
  return [
    operation.relations.quoteId
      ? { href: `/admin/cotizaciones/${operation.relations.quoteId}`, label: "Cotización" }
      : null,
    operation.relations.workOrderId ? { href: "/admin/ordenes-trabajo", label: "OT" } : null,
    operation.relations.projectId ? { href: "/admin/proyectos", label: "Proyecto" } : null,
    operation.relations.taxDocumentId ? { href: "/admin/sii", label: "Documento" } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));
}

export default async function OperacionesPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const dashboard = await getOperationsDashboard();
  const textFilter = String(query?.q || "")
    .trim()
    .toLowerCase();
  const stageFilter = isOperationStage(query?.stage) ? query.stage : null;
  const statusFilter = PROCESS_STATUSES.includes(String(query?.status || "") as ProcessStatus)
    ? (String(query?.status) as ProcessStatus)
    : null;
  const alertFilter = String(query?.alert || "ALL").toUpperCase();
  const sourceFilter = String(query?.source || "ALL").toUpperCase();

  const operations = dashboard.operations.filter((operation) => {
    if (stageFilter && operation.stage !== stageFilter) return false;
    if (statusFilter && operation.status !== statusFilter) return false;
    if (sourceFilter === "PERSISTED" && operation.source !== "PERSISTED") return false;
    if (sourceFilter === "LEGACY" && operation.source !== "LEGACY") return false;
    if (
      alertFilter === "CRITICAL" &&
      !operation.alerts.some((alert) => alert.severity === "CRITICAL")
    )
      return false;
    if (
      alertFilter === "OVERDUE" &&
      !operation.alerts.some((alert) => alert.code === "NEXT_ACTION_OVERDUE")
    )
      return false;
    if (alertFilter === "MISSING" && operation.nextAction) return false;
    if (textFilter) {
      const searchable = [
        operation.code,
        operation.title,
        operation.client.name,
        operation.client.email,
        operation.client.company,
        operation.owner,
        operation.nextAction,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(textFilter)) return false;
    }
    return true;
  });

  const errorMessage = flashError(query?.operation_error);
  const stageGroups = operationStageGroups();

  return (
    <div className="space-y-7">
      {query?.process_created === "1" ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Expediente creado y relaciones legacy enlazadas
          correctamente.
        </div>
      ) : null}
      {query?.process_reused === "1" ? (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          <ShieldCheck className="h-4 w-4" /> El registro ya tenía un expediente activo; se abrió
          sin duplicarlo.
        </div>
      ) : null}
      {query?.process_updated === "1" ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Etapa, estado y próxima acción actualizados con
          evento de auditoría.
        </div>
      ) : null}
      {errorMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}
        </div>
      ) : null}
      {dashboard.warning ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Modo de compatibilidad</p>
            <p className="mt-0.5">{dashboard.warning}</p>
          </div>
        </div>
      ) : null}

      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold tracking-[0.2em] text-blue-600 uppercase">
              Control operacional 360°
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${dashboard.mode === "NATIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : dashboard.mode === "HYBRID" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
            >
              {dashboard.mode === "NATIVE"
                ? "Datos normalizados"
                : dashboard.mode === "HYBRID"
                  ? "Migración progresiva"
                  : "Vista legacy"}
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
            Operaciones
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Un expediente por servicio para controlar cliente, cotización, OT, proyecto,
            facturación, cobranza y postventa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/admin/contactos"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
          >
            Ver contactos
          </Link>
          <Link
            href="/admin/cotizaciones/nueva"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Nueva cotización
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          {
            label: "Expedientes",
            value: dashboard.metrics.total,
            helper: `${dashboard.metrics.active} activos`,
            icon: Layers3,
            tone: "bg-blue-50 text-blue-700",
          },
          {
            label: "En pausa",
            value: dashboard.metrics.onHold,
            helper: "requieren desbloqueo",
            icon: PauseCircle,
            tone: "bg-amber-50 text-amber-700",
          },
          {
            label: "Acciones vencidas",
            value: dashboard.metrics.overdueActions,
            helper: `${dashboard.metrics.withoutNextAction} sin próxima acción`,
            icon: Clock3,
            tone: "bg-rose-50 text-rose-700",
          },
          {
            label: "Ganados",
            value: dashboard.metrics.won,
            helper: `${dashboard.metrics.lost} perdidos`,
            icon: Target,
            tone: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Saldo pendiente",
            value: currency(dashboard.metrics.pendingAmount),
            helper: "por cobrar",
            icon: CircleDollarSign,
            tone: "bg-violet-50 text-violet-700",
          },
          {
            label: "Pagado",
            value: currency(dashboard.metrics.paidAmount),
            helper: `${dashboard.metrics.criticalAlerts} alertas críticas`,
            icon: Banknote,
            tone: "bg-cyan-50 text-cyan-700",
          },
        ].map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.tone}`}>
              <metric.icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-3 truncate text-xl font-extrabold text-slate-950">{metric.value}</p>
            <p className="text-xs font-bold text-slate-700">{metric.label}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">{metric.helper}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase">
              Pipeline completo
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold text-slate-900">Carga por etapa</h2>
          </div>
          <p className="text-xs text-slate-400">
            Selecciona una etapa para filtrar los expedientes
          </p>
        </div>
        <div className="space-y-4">
          {stageGroups.map((group) => (
            <div key={group.area}>
              <p className="mb-2 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                {group.area}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {group.stages.map((stage) => {
                  const active = stageFilter === stage.key;
                  return (
                    <Link
                      key={stage.key}
                      href={`/admin/operaciones?stage=${stage.key}`}
                      className={`group rounded-xl border px-3 py-3 transition-all ${active ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50/60 hover:border-blue-200 hover:bg-blue-50/50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-bold ${active ? "text-blue-700" : "text-slate-600"}`}
                        >
                          {stage.shortLabel}
                        </span>
                        <span
                          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold ${active ? "bg-blue-700 text-white" : "bg-white text-slate-700"}`}
                        >
                          {dashboard.stageCounts[stage.key]}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Abrir desde cotización</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Crea el expediente y enlaza automáticamente OT, proyecto, venta y documentos
            relacionados.
          </p>
          <form
            action="/admin/operaciones/ensure/stage"
            method="post"
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <input type="hidden" name="action" value="ensure" />
            <select
              name="quoteId"
              required
              disabled={!dashboard.schemaReady || dashboard.quoteCandidates.length === 0}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Selecciona una cotización sin expediente...</option>
              {dashboard.quoteCandidates.map((quote) => (
                <option key={quote.id} value={quote.id}>
                  {quote.label} · {currency(quote.total || 0)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!dashboard.schemaReady || dashboard.quoteCandidates.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PlusCircle className="h-4 w-4" /> Crear
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Abrir desde cliente</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Reutiliza el expediente activo del cliente o inicia uno nuevo en calificación.
          </p>
          <form
            action="/admin/operaciones/ensure/stage"
            method="post"
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <input type="hidden" name="action" value="ensure" />
            <select
              name="clientId"
              required
              disabled={!dashboard.schemaReady || dashboard.clientCandidates.length === 0}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Selecciona un cliente...</option>
              {dashboard.clientCandidates.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!dashboard.schemaReady || dashboard.clientCandidates.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PlusCircle className="h-4 w-4" /> Abrir
            </button>
          </form>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form
          method="get"
          className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_180px_160px_170px_150px_auto]"
        >
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={query?.q || ""}
              placeholder="Código, cliente, proyecto, responsable..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <select
            name="stage"
            defaultValue={stageFilter || "ALL"}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="ALL">Todas las etapas</option>
            {OPERATION_STAGES.map((stage) => (
              <option key={stage.key} value={stage.key}>
                {stage.shortLabel}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={statusFilter || "ALL"}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="ALL">Todos los estados</option>
            {PROCESS_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <select
            name="alert"
            defaultValue={alertFilter}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="ALL">Todas las alertas</option>
            <option value="CRITICAL">Alertas críticas</option>
            <option value="OVERDUE">Acción vencida</option>
            <option value="MISSING">Sin próxima acción</option>
          </select>
          <select
            name="source"
            defaultValue={sourceFilter}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="ALL">Todas las fuentes</option>
            <option value="PERSISTED">Normalizados</option>
            <option value="LEGACY">Por migrar</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Filtrar
            </button>
            <Link
              href="/admin/operaciones"
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Limpiar
            </Link>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Expedientes operativos</h2>
            <p className="text-xs text-slate-400">
              {operations.length} de {dashboard.operations.length} registros visibles
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Crítico
            <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" /> Atención
          </div>
        </div>

        {operations.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <BriefcaseBusiness className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">
              No hay expedientes para estos filtros
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Limpia los filtros o crea uno desde una cotización o cliente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {operations.map((operation) => {
              const stage = operationStageDefinition(operation.stage);
              const links = relationLinks(operation);
              const highlighted = query?.focus === operation.id;
              const processReason =
                operation.status === "ON_HOLD"
                  ? operation.blockedReason
                  : operation.status === "CANCELLED"
                    ? operation.cancelReason
                    : operation.outcome === "LOST"
                      ? operation.lostReason
                      : null;
              return (
                <article
                  id={`process-${operation.id}`}
                  key={operation.id}
                  className={`scroll-mt-24 px-5 py-5 transition-colors ${highlighted ? "bg-blue-50/60" : "hover:bg-slate-50/40"}`}
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(260px,1.25fr)_minmax(190px,.8fr)_minmax(220px,1fr)_minmax(190px,.8fr)]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold tracking-wide text-blue-700 uppercase">
                          {operation.code}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyles(operation.status)}`}
                        >
                          {statusLabel(operation.status)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${outcomeStyles(operation.outcome)}`}
                        >
                          {operation.outcome === "WON"
                            ? "Ganado"
                            : operation.outcome === "LOST"
                              ? "Perdido"
                              : "Sin resultado"}
                        </span>
                        {operation.source === "LEGACY" ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Por normalizar
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 truncate text-base font-extrabold text-slate-950">
                        {operation.title}
                      </h3>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                        {operation.client.company || operation.client.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {operation.client.email || "Sin correo vinculado"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {links.map((link) => (
                          <Link
                            key={link.label}
                            href={link.href}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 hover:border-blue-300 hover:text-blue-700"
                          >
                            {link.label}
                          </Link>
                        ))}
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500">
                          {operation.relations.documentCount} docs.
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Etapa actual
                      </p>
                      <div className="mt-2 flex items-start gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-800">{stage.label}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {operation.stageProgress}% del recorrido
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${operation.stageProgress}%` }}
                        />
                      </div>
                      <div
                        className={`mt-3 flex items-center gap-1 text-xs font-bold ${priorityStyles(operation.priority)}`}
                      >
                        <Flag className="h-3.5 w-3.5" /> Prioridad{" "}
                        {priorityLabel(operation.priority)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Responsable: {operation.owner || "Sin asignar"}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {operation.requiresInitialPayment
                          ? "Inicio condicionado a anticipo"
                          : "Inicio sin anticipo obligatorio"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Próxima acción
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {operation.nextAction || "Sin próxima acción definida"}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <CalendarClock className="h-3.5 w-3.5" />{" "}
                        {dateLabel(operation.nextActionAt, true)}
                      </div>
                      {operation.lastEvent ? (
                        <p className="mt-2 line-clamp-2 text-[11px] text-slate-400">
                          Último evento: {operation.lastEvent.title} ·{" "}
                          {dateLabel(operation.lastEvent.createdAt)}
                        </p>
                      ) : null}
                      {processReason ? (
                        <p className="mt-2 line-clamp-2 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-medium text-slate-600">
                          Motivo: {processReason}
                        </p>
                      ) : null}
                      {operation.alerts.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {operation.alerts.slice(0, 3).map((alert) => (
                            <span
                              key={alert.code}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${alertStyles(alert.severity)}`}
                            >
                              {alert.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Sin alertas
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Posición financiera
                      </p>
                      <p className="mt-2 text-lg font-extrabold text-slate-950">
                        {currency(operation.financials.pending)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        saldo pendiente · {financialStatusLabel(operation.financials.status)}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <dt className="text-slate-400">Cotizado</dt>
                        <dd className="text-right font-semibold text-slate-700">
                          {currency(operation.financials.quoted)}
                        </dd>
                        <dt className="text-slate-400">Facturado</dt>
                        <dd className="text-right font-semibold text-slate-700">
                          {currency(operation.financials.billed)}
                        </dd>
                        <dt className="text-slate-400">Pagado</dt>
                        <dd className="text-right font-semibold text-emerald-700">
                          {currency(operation.financials.paid)}
                        </dd>
                        {operation.financials.credit > 0 ? (
                          <>
                            <dt className="text-slate-400">Crédito</dt>
                            <dd className="text-right font-semibold text-blue-700">
                              {currency(operation.financials.credit)}
                            </dd>
                          </>
                        ) : null}
                      </dl>
                    </div>
                  </div>

                  {operation.source === "PERSISTED" ? (
                    <details className="group mt-4 rounded-xl border border-slate-200 bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:text-blue-700">
                        Actualizar etapa, responsable y próxima acción
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                      </summary>
                      <form
                        action={`/admin/operaciones/${operation.id}/stage`}
                        method="post"
                        className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-4"
                      >
                        <input type="hidden" name="action" value="transition" />
                        <input type="hidden" name="version" value={operation.version} />
                        <label className="text-xs font-bold text-slate-600">
                          Etapa
                          <select
                            name="stage"
                            defaultValue={operation.stage}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-blue-400"
                          >
                            {OPERATION_STAGES.map((item) => (
                              <option key={item.key} value={item.key}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          Estado operativo
                          <select
                            name="status"
                            defaultValue={operation.status}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-blue-400"
                          >
                            {PROCESS_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          Resultado comercial
                          <select
                            name="outcome"
                            defaultValue={operation.outcome || "NONE"}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-blue-400"
                          >
                            <option value="NONE">Sin resultado</option>
                            <option value="WON">Ganado</option>
                            <option value="LOST">Perdido</option>
                          </select>
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          Prioridad
                          <select
                            name="priority"
                            defaultValue={operation.priority}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-blue-400"
                          >
                            {PROCESS_PRIORITIES.map((priority) => (
                              <option key={priority} value={priority}>
                                {priorityLabel(priority)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          Responsable
                          <input
                            name="owner"
                            defaultValue={operation.owner || ""}
                            maxLength={120}
                            placeholder="Nombre o equipo"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400"
                          />
                        </label>
                        <label className="text-xs font-bold text-slate-600 md:col-span-1 xl:col-span-2">
                          Próxima acción
                          <input
                            name="nextAction"
                            defaultValue={operation.nextAction || ""}
                            maxLength={240}
                            placeholder="Acción concreta, responsable y resultado esperado"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400"
                          />
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          Fecha límite
                          <input
                            type="datetime-local"
                            name="nextActionAt"
                            defaultValue={datetimeLocal(operation.nextActionAt)}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 md:col-span-2 xl:col-span-1">
                          <input
                            type="checkbox"
                            name="requiresInitialPayment"
                            value="1"
                            defaultChecked={operation.requiresInitialPayment}
                            className="h-4 w-4 rounded border-slate-300 text-blue-700"
                          />{" "}
                          Requiere anticipo para iniciar
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 md:col-span-2 xl:col-span-1">
                          <input
                            type="checkbox"
                            name="allowOverride"
                            value="1"
                            className="h-4 w-4 rounded border-slate-300 text-blue-700"
                          />{" "}
                          Excepción autorizada
                        </label>
                        <label className="text-xs font-bold text-slate-600 md:col-span-2 xl:col-span-1">
                          Razón de excepción, pérdida o cancelación
                          <input
                            name="reason"
                            maxLength={500}
                            placeholder="Obligatoria para saltos, retrocesos, reaperturas y cierres excepcionales"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400"
                          />
                        </label>
                        <div className="flex items-end justify-end md:col-span-2 xl:col-span-1">
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
                          >
                            Guardar y auditar
                          </button>
                        </div>
                      </form>
                    </details>
                  ) : operation.relations.quoteId && dashboard.schemaReady ? (
                    <form
                      action="/admin/operaciones/ensure/stage"
                      method="post"
                      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                    >
                      <input type="hidden" name="action" value="ensure" />
                      <input type="hidden" name="quoteId" value={operation.relations.quoteId} />
                      <p className="text-xs text-amber-800">
                        <strong>Registro legacy:</strong> crea el expediente para habilitar
                        transiciones y auditoría.
                      </p>
                      <button
                        type="submit"
                        className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800"
                      >
                        Normalizar expediente
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

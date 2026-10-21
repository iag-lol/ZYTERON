"use client";
import Link from "@control/components/routed-link";
import { HrSiiWorkspace } from "./hr-sii-workspace";
import { useEffect, useMemo, useState } from "react";
import type {
  Employee,
  EmployeeDetail,
  HrAttentionItem,
  HrProviderReadiness,
  HrWorkspace as HrWorkspaceData,
  Role,
} from "@zyteron/contracts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSignature,
  FolderLock,
  GraduationCap,
  IdCard,
  Landmark,
  Network,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAccess } from "@control/components/access-context";
import { formatDate, formatDateTime } from "@control/lib/date-time";
import {
  hrCanReadDocuments,
  hrCanReadPerformance,
  hrProviderPresentation,
  hrSourceState,
  hrStatusTone,
  hrLifecycleProgress,
  resolveHrRoute,
  selectHrRecord,
} from "@control/lib/hr-presentation";
import {
  HrApiError,
  type HrPerformanceRecord,
  type HrScheduleRecord,
  hrApi,
  readHrView,
} from "@control/lib/hr-api";

const views: Record<string, { eyebrow: string; title: string; description: string }> = {
  command: {
    eyebrow: "PEOPLE OPERATIONS",
    title: "People Command Center",
    description: "Una fuente laboral maestra para personas, contratos, ausencias y ciclo de vida.",
  },
  employees: {
    eyebrow: "EMPLOYEE MASTER",
    title: "Personal",
    description: "Directorio laboral controlado, sin duplicar identidades de Auth.",
  },
  "org-chart": {
    eyebrow: "ORGANIZATIONAL DESIGN",
    title: "Organigrama",
    description: "Estructura derivada de jefaturas, áreas, equipos y cargos reales.",
  },
  departments: {
    eyebrow: "ORGANIZATION",
    title: "Departamentos",
    description: "Áreas, responsables y centros de costo.",
  },
  teams: {
    eyebrow: "WORKFORCE STRUCTURE",
    title: "Equipos",
    description: "Equipos principales y membresías adicionales.",
  },
  positions: {
    eyebrow: "JOB ARCHITECTURE",
    title: "Cargos",
    description: "Cargos laborales separados de los roles de sistema.",
  },
  contracts: {
    eyebrow: "EMPLOYMENT CONTROL",
    title: "Contratos laborales",
    description: "Contratos y documentos laborales con su estado de firma y registro.",
  },
  annexes: {
    eyebrow: "EMPLOYMENT CHANGES",
    title: "Anexos",
    description: "Cambios laborales registrados, con fecha y documentos de respaldo.",
  },
  files: {
    eyebrow: "DIGITAL EMPLOYEE FILE",
    title: "Expedientes laborales",
    description: "Acceso a los documentos vinculados al expediente de cada colaborador.",
  },
  onboarding: {
    eyebrow: "JOINER WORKFLOW",
    title: "Onboarding",
    description: "Datos, contrato, accesos, activos, inducción y activación.",
  },
  offboarding: {
    eyebrow: "LEAVER CONTROL",
    title: "Offboarding",
    description: "Revocación, devolución, transferencia y cierre sin omitir bloqueos.",
  },
  vacations: {
    eyebrow: "LEAVE MANAGEMENT",
    title: "Vacaciones",
    description: "Solicitudes, aprobaciones y saldo derivado desde ledger.",
  },
  permissions: {
    eyebrow: "TIME AWAY",
    title: "Permisos",
    description: "Ausencias por día, medio día u horas con aprobación.",
  },
  "medical-leave": {
    eyebrow: "MEDICAL PRIVACY",
    title: "Licencias",
    description: "Información laboral estrictamente restringida; jefaturas solo ven ausencia.",
  },
  absences: {
    eyebrow: "WORKFORCE AVAILABILITY",
    title: "Ausencias",
    description:
      "Solicitudes de ausencia aprobadas, actuales y próximas; las licencias se consultan por separado.",
  },
  schedules: {
    eyebrow: "WORKING TIME",
    title: "Jornadas y turnos",
    description: "Horarios versionables, zonas horarias y turnos cross-midnight.",
  },
  attendance: {
    eyebrow: "ATTENDANCE ARCHITECTURE",
    title: "Asistencia",
    description: "Puerto de integración preparado; no presume cumplimiento legal.",
  },
  payroll: {
    eyebrow: "PAYROLL PREPARATION",
    title: "Remuneraciones",
    description: "Cálculo laboral versionado, separado de la contabilidad de Finance.",
  },
  lre: {
    eyebrow: "LABOR REPORTING",
    title: "LRE / DT",
    description: "Exportación validada y declaración solo con evidencia externa.",
  },
  assets: {
    eyebrow: "COMPANY PROPERTY",
    title: "Activos asignados",
    description: "Entrega, condición, evidencia y devolución por colaborador.",
  },
  performance: {
    eyebrow: "PERFORMANCE",
    title: "Evaluaciones",
    description: "Evaluaciones registradas en su fuente, separadas de los objetivos.",
  },
  goals: {
    eyebrow: "OBJECTIVES",
    title: "Objetivos",
    description: "Resultados, progreso y evidencia aprobada.",
  },
  training: {
    eyebrow: "PEOPLE DEVELOPMENT",
    title: "Capacitación",
    description: "Cursos, asignaciones, vigencia y certificados en Documents.",
  },
  requests: {
    eyebrow: "EMPLOYEE SERVICES",
    title: "Solicitudes",
    description: "Service Desk RR.HH. restringido; no existe un inbox paralelo.",
  },
  expirations: {
    eyebrow: "LABOR COMPLIANCE",
    title: "Vencimientos",
    description: "Contratos, obligaciones y documentos que requieren acción.",
  },
  reports: {
    eyebrow: "WORKFORCE INTELLIGENCE",
    title: "Informes RR.HH.",
    description: "Métricas definidas y sin benchmarks inventados.",
  },
  settings: {
    eyebrow: "PEOPLE GOVERNANCE",
    title: "Configuración RR.HH.",
    description: "Políticas, reglas vigentes, proveedores y privacidad.",
  },
};
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
const name = (employee: Employee) =>
  `${employee.preferredName || employee.firstName} ${employee.lastName}`;
const statusTone = hrStatusTone;
const fallbackReadiness = (data: HrWorkspaceData): HrProviderReadiness[] => [
  {
    key: "signature",
    label: "Firma electrónica",
    status: data.providers.signature,
    state: data.providers.signature === "NOT_CONFIGURED" ? "ACTION_REQUIRED" : "READY",
    title:
      data.providers.signature === "NOT_CONFIGURED"
        ? "Pendiente de configurar"
        : "Proveedor conectado",
    detail: "Los contratos sólo pasan a firma cuando existe un proveedor real configurado.",
    actionHref: "/settings/integrations?code=ELECTRONIC_SIGNATURE",
    actionLabel: "Revisar integración",
  },
  {
    key: "laborAuthority",
    label: "Mi DT / REL",
    status: data.providers.laborAuthority,
    state: "EXTERNAL_STEP",
    title: "Operativo con trámite externo",
    detail: "Zyteron prepara los datos y exige el comprobante del trámite oficial.",
    actionHref: "/hr/lre",
    actionLabel: "Ver flujo LRE",
  },
  {
    key: "attendance",
    label: "Asistencia",
    status: data.providers.attendance,
    state: data.providers.attendance === "NOT_CONFIGURED" ? "ACTION_REQUIRED" : "READY",
    title:
      data.providers.attendance === "NOT_CONFIGURED"
        ? "Pendiente de configurar"
        : "Proveedor conectado",
    detail: "No se importan marcaciones hasta conectar un proveedor autorizado.",
    actionHref: "/hr/attendance",
    actionLabel: "Revisar asistencia",
  },
  {
    key: "payrollSubmission",
    label: "Previsional",
    status: data.providers.payrollSubmission,
    state: "EXTERNAL_STEP",
    title: "Exportación controlada",
    detail: "La presentación se realiza externamente y exige comprobante.",
    actionHref: "/hr/lre",
    actionLabel: "Ver exportaciones",
  },
];
const providerItems = (data: HrWorkspaceData) =>
  fallbackReadiness(data).map((fallback) =>
    hrProviderPresentation(
      data.providerReadiness?.find((item) => item.key === fallback.key) ?? fallback,
    ),
  );
const providerItem = (data: HrWorkspaceData, key: HrProviderReadiness["key"]) =>
  providerItems(data).find((item) => item.key === key)!;

export function HrWorkspace({ segments }: { segments: string[] }) {
  const { role } = useAccess(),
    route = resolveHrRoute(segments);
  if (route.invalid)
    return (
      <main className="hrPage">
        <ViewState
          title="Ruta RR.HH. no disponible"
          text="Esta dirección no corresponde a una vista o registro compatible."
          href="/hr"
          action="Volver al resumen"
        />
      </main>
    );
  if (route.view === "sii") return <HrSiiWorkspace key={role} role={role} documentTypeCode={route.documentTypeCode ?? 33}/>;
  return (
    <HrWorkspaceContent
      key={`${role}:${route.view}:${route.employeeId ?? route.recordId ?? "list"}`}
      role={role}
      route={route}
    />
  );
}

function HrWorkspaceContent({
  role,
  route,
}: {
  role: Role;
  route: ReturnType<typeof resolveHrRoute>;
}) {
  const { employeeId, recordId, view } = route;
  const copy = (
    employeeId
      ? {
          eyebrow: "EMPLOYEE 360°",
          title: "Expediente individual",
          description: "Resumen laboral y documentos vinculados al colaborador.",
        }
      : (views[view] ?? views.command)
  )!;
  const [data, setData] = useState<HrWorkspaceData | null>(null),
    [detail, setDetail] = useState<EmployeeDetail | null>(null),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [errorStatus, setErrorStatus] = useState<number | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [create, setCreate] = useState(false),
    [revision, setRevision] = useState(0);
  function load() {
    setError("");
    setErrorStatus(null);
    setData(null);
    setDetail(null);
    setRevision((value) => value + 1);
  }
  useEffect(() => {
    let cancelled = false;
    async function read() {
      try {
        const employee = await readHrView(role, employeeId, setData, () => !cancelled);
        if (!cancelled) setDetail(employee);
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "No fue posible cargar RR.HH.");
        setErrorStatus(reason instanceof HrApiError ? reason.status : null);
      }
    }
    void read();
    return () => {
      cancelled = true;
    };
  }, [role, employeeId, revision]);
  const employees = useMemo(() => {
    const term = query.toLowerCase().trim();
    return !term
      ? (data?.employees ?? [])
      : (data?.employees ?? []).filter((item) =>
          [item.employeeNumber, item.rut, name(item), item.corporateEmail].some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(term),
          ),
        );
  }, [data, query]);
  async function act(action: () => Promise<unknown>, message: string) {
    try {
      setBusy(true);
      setError("");
      await action();
      setNotice(message);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La operación no pudo completarse.");
    } finally {
      setBusy(false);
    }
  }
  if (!data && !error)
    return (
      <main className="hrLoading">
        <UsersRound />
        <span>Cargando RR.HH.…</span>
      </main>
    );
  if (!data)
    return (
      <main className="hrPage">
        <ViewState
          title={
            errorStatus === 403
              ? "Sin acceso a esta vista"
              : errorStatus === 401
                ? "Sesión requerida"
                : "Fuente no disponible"
          }
          text={error}
        />
        <button onClick={() => void load()}>Reintentar</button>
      </main>
    );
  const selectedDetail = detail?.employee.id === employeeId ? detail : null;
  const selection = selectHrRecord(data, view, recordId),
    source = hrSourceState(data.sourceStatus);
  return (
    <main className="hrPage">
      <header className="hrPageHeader">
        <div>
          <p>{copy.eyebrow}</p>
          <h1>{employeeId && selectedDetail ? name(selectedDetail.employee) : copy.title}</h1>
          <span>{copy.description}</span>
        </div>
        <div className="hrHeaderActions">
          <button onClick={() => void load()} disabled={busy}>
            <RefreshCw />
            Actualizar
          </button>
          {role === "RRHH" &&
          source === "available" &&
          ["command", "employees"].includes(view) &&
          !employeeId ? (
            <button className="hrPrimary" onClick={() => setCreate(true)}>
              <Plus />
              Nuevo colaborador
            </button>
          ) : null}
        </div>
      </header>
      {error ? (
        <div className="hrAlert" role="alert">
          <AlertTriangle />
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="hrNotice" role="status">
          <CheckCircle2 />
          {notice}
        </div>
      ) : null}
      {source !== "available" ? (
        <ViewState
          title={
            source === "not-configured"
              ? "Fuente de datos no configurada"
              : "Disponibilidad de la fuente sin verificar"
          }
          text={
            source === "not-configured"
              ? "No se ha confirmado persistencia para RR.HH. Los contadores y vacíos no se interpretan como ausencia de personal ni como procesos resueltos."
              : "El servidor no informa el estado de persistencia. Los registros visibles no certifican que la sección esté completa."
          }
        />
      ) : null}
      {source === "not-configured" ? null : employeeId ? (
        selectedDetail ? (
          <>
            <Link className="hrBackLink" href="/hr/employees">
              Volver a Personal
            </Link>
            <EmployeeRecord data={selectedDetail} role={role} />
          </>
        ) : (
          <ViewState
            title={
              errorStatus === 403
                ? "Sin acceso al expediente"
                : error
                  ? "Expediente no disponible"
                  : "Cargando expediente…"
            }
            text={error || "Consultando el registro seleccionado."}
            href="/hr/employees"
            action="Volver a Personal"
          />
        )
      ) : !selection.found ? (
        <ViewState
          title="Registro no disponible en esta vista"
          text="Puede haber cambiado, estar fuera del filtro o no estar visible para tu cuenta. No se muestra otro registro en su lugar."
          href={`/hr/${view}`}
          action="Volver al listado"
        />
      ) : (
        <>
          {recordId ? (
            <div className="hrNotice">
              Registro seleccionado · <Link href={`/hr/${view}`}>Ver listado completo</Link>
            </div>
          ) : null}
          {view === "command" ? (
            <CommandCenter data={data} />
          ) : (
            <ViewContent
              view={view}
              data={selection.data}
              employees={employees}
              query={query}
              setQuery={setQuery}
              role={role}
              act={act}
              revision={revision}
              selectedRecordId={recordId}
            />
          )}
        </>
      )}
      {create ? (
        <CreateEmployee
          close={() => setCreate(false)}
          busy={busy}
          save={(value) =>
            act(async () => {
              await hrApi.createEmployee(role, value);
              setCreate(false);
            }, "Colaborador creado con expediente laboral inicial.")
          }
        />
      ) : null}
    </main>
  );
}

function ViewState({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href?: string;
  action?: string;
}) {
  return (
    <section className="hrViewState" role="status">
      <AlertTriangle />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
        {href ? (
          <Link href={href}>
            {action || "Abrir"}
            <ArrowRight />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function CommandCenter({ data }: { data: HrWorkspaceData }) {
  const metrics: [string, number, string, LucideIcon][] = [
    ["Personal activo", data.summary.activeEmployees, "/hr/employees", UsersRound],
    ["Ingresos del mes", data.summary.hiresThisMonth, "/hr/employees", UserCheck],
    ["Salidas", data.summary.terminationsThisMonth, "/hr/offboarding", UserMinus],
    ["Onboarding activos", data.summary.onboardingActive, "/hr/onboarding", IdCard],
    ["Vacaciones próximas", data.summary.vacationsUpcoming, "/hr/vacations", CalendarDays],
    ["Ausencias actuales", data.summary.absencesToday, "/hr/absences", Clock3],
    ["Contratos por vencer", data.summary.contractsExpiring, "/hr/contracts", FileSignature],
    ["Anexos por firma", data.summary.annexesPendingSignature, "/hr/annexes", FileCheck2],
    ["Contratos sin documento", data.summary.documentsPending, "/hr/files", FolderLock],
    ["Ausencias por aprobar", data.summary.requestsPending, "/hr/vacations", Activity],
    ["LRE pendiente", data.summary.lrePending, "/hr/lre", Landmark],
    [
      "Salidas y reglas pendientes",
      data.summary.offboardingPending,
      "/hr/offboarding",
      ShieldCheck,
    ],
  ];
  return (
    <>
      <section className="hrHero">
        <div>
          <p>CONTROL DE PERSONAS</p>
          <h2>Estado de la operación laboral</h2>
          <span>
            Consulta los registros disponibles y las integraciones que requieren configuración o
            evidencia externa.
          </span>
        </div>
        <div className="hrProviderPanel">
          <b>Estado de integraciones</b>
          {providerItems(data).map((item) => (
            <Provider key={item.key} item={item} />
          ))}
        </div>
      </section>
      <section className="hrMetricGrid">
        {metrics.map(([title, value, href, Icon]) => (
          <Link href={href} key={title}>
            <Icon />
            <strong>{hrSourceState(data.sourceStatus) === "available" ? value : "—"}</strong>
            <span>{title}</span>
            <ArrowRight />
          </Link>
        ))}
      </section>
      <section className="hrCommandGrid">
        <Panel eyebrow="PRIORIDAD LABORAL" title="Requiere atención" count={data.attention.length}>
          {data.attention.length ? (
            <div className="hrAttention">
              {data.attention.slice(0, 7).map((item) => (
                <Attention key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          ) : (
            <Empty
              icon={CheckCircle2}
              title="Sin alertas visibles"
              text="La cola consultada no contiene alertas. Revisa también configuración, integraciones y evidencias externas."
            />
          )}
        </Panel>
        <Panel
          eyebrow="WORKFORCE SNAPSHOT"
          title="Movimiento reciente"
          count={data.activity.length}
        >
          {data.activity.length ? (
            <div className="hrTimeline">
              {data.activity.slice(0, 7).map((item) => (
                <div key={item.id}>
                  <span />
                  <div>
                    <strong>{label(item.eventType)}</strong>
                    <small>{formatDateTime(item.occurredAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Activity}
              title="Sin actividad registrada"
              text="Los eventos aparecerán al iniciar procesos reales."
            />
          )}
        </Panel>
      </section>
    </>
  );
}
function Provider({ item }: { item: HrProviderReadiness }) {
  return (
    <Link
      href={item.actionHref}
      className={`hrProviderState ${item.state.toLowerCase()}`}
      title={item.detail}
    >
      <span>{item.label}</span>
      <strong>{item.title}</strong>
      <ArrowRight />
    </Link>
  );
}
function Attention({ item }: { item: HrAttentionItem }) {
  return (
    <Link href={item.href}>
      <span className={`hrSeverity ${item.severity}`} />
      <div>
        <strong>{item.title}</strong>
        <small>
          {item.reason}
          {item.dueAt ? ` · ${formatDate(item.dueAt)}` : ""}
        </small>
      </div>
      <ArrowRight />
    </Link>
  );
}

export function ViewContent({
  view,
  data,
  employees,
  query,
  setQuery,
  role,
  act,
  revision,
  selectedRecordId,
}: {
  view: string;
  data: HrWorkspaceData;
  employees: Employee[];
  query: string;
  setQuery: (value: string) => void;
  role: Role;
  act: (action: () => Promise<unknown>, message: string) => Promise<void>;
  revision: number;
  selectedRecordId?: string | null;
}) {
  if (view === "employees")
    return (
      <>
        <Toolbar value={query} change={setQuery} />
        <Panel eyebrow="PEOPLE DIRECTORY" title="Directorio laboral" count={employees.length}>
          <div className="hrPeopleGrid">
            {employees.map((employee) => (
              <Link href={`/hr/employees/${employee.id}`} key={employee.id}>
                <div className="hrAvatar">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </div>
                <div>
                  <strong>{name(employee)}</strong>
                  <span>
                    {employee.employeeNumber} · {employee.rut}
                  </span>
                  <small>{employee.corporateEmail || "Sin correo corporativo"}</small>
                </div>
                <em className={statusTone(employee.status)}>{label(employee.status)}</em>
              </Link>
            ))}
            {!employees.length ? (
              <Empty
                icon={UsersRound}
                title="Sin resultados visibles"
                text="No hay colaboradores visibles para esta cuenta en la fuente consultada."
              />
            ) : null}
          </div>
        </Panel>
      </>
    );
  if (["departments", "teams", "positions"].includes(view)) {
    const items =
      view === "departments" ? data.departments : view === "teams" ? data.teams : data.positions;
    return (
      <Panel
        eyebrow="ORGANIZATION CATALOG"
        title={views[view]?.title || "Organización"}
        count={items.length}
      >
        <div className="hrCatalog">
          {items.map((item) => (
            <article key={item.id}>
              <Building2 />
              <div>
                <strong>{item.name}</strong>
                <span>
                  {("code" in item ? item.code : null) ||
                    label(("level" in item ? item.level : null) || "Equipo")}
                </span>
              </div>
              <em>{item.active ? "ACTIVO" : "INACTIVO"}</em>
            </article>
          ))}
          {!items.length ? (
            <Empty
              icon={Building2}
              title="Sin estructura configurada"
              text="No hay registros visibles en este catálogo. La gestión de estructura aún no tiene formulario en esta vista."
            />
          ) : null}
        </div>
      </Panel>
    );
  }
  if (view === "org-chart") return <OrgChart data={data} />;
  if (view === "files") return <EmployeeFiles data={data} />;
  if (["contracts", "annexes"].includes(view))
    return <DocumentsArea view={view} data={data} role={role} />;
  if (["onboarding", "offboarding"].includes(view)) return <Lifecycle view={view} data={data} />;
  if (view === "medical-leave") return <MedicalLeaveArea data={data} role={role} />;
  if (["vacations", "permissions", "absences"].includes(view))
    return (
      <LeaveArea
        view={view}
        data={data}
        role={role}
        act={act}
        selectedRecordId={selectedRecordId}
      />
    );
  if (view === "schedules" || view === "performance")
    return (
      <WorkforceRecords key={`${view}-${role}-${revision}`} view={view} role={role} data={data} />
    );
  if (view === "attendance") return <TimeArea view={view} data={data} />;
  if (["payroll", "lre"].includes(view))
    return ["RRHH", "FINANZAS"].includes(role) ? (
      <PayrollArea view={view} data={data} />
    ) : (
      <ViewState
        title="Información restringida"
        text="Remuneraciones y LRE requieren un perfil autorizado. Un listado oculto no significa que no existan períodos."
      />
    );
  if (view === "assets")
    return (
      <SimpleRecords
        title="Activos por trabajador"
        eyebrow="CUSTODY"
        items={data.assets.map((item) => ({
          id: item.id,
          title: `Activo ${item.assetId.slice(0, 8)}`,
          meta: item.returnedAt
            ? `Devuelto ${formatDate(item.returnedAt)}`
            : `Asignado ${formatDate(item.assignedAt)}`,
          status: item.returnedAt ? "RETURNED" : "ASSIGNED",
        }))}
        icon={PackageCheck}
      />
    );
  if (view === "goals")
    return (
      <SimpleRecords
        title={view === "goals" ? "Objetivos activos" : "Ciclos de evaluación"}
        eyebrow="PEOPLE DEVELOPMENT"
        items={data.goals.map((item) => ({
          id: item.id,
          title: item.title,
          meta: `${item.period} · ${item.progress}%`,
          status: item.status,
        }))}
        icon={UserCheck}
      />
    );
  if (view === "training")
    return (
      <SimpleRecords
        title="Asignaciones de capacitación"
        eyebrow="LEARNING"
        items={data.training.map((item) => ({
          id: item.id,
          title: `Curso ${item.courseId.slice(0, 8)}`,
          meta: item.dueDate ? `Vence ${formatDate(item.dueDate)}` : "Sin vencimiento",
          status: item.status,
        }))}
        icon={GraduationCap}
      />
    );
  if (view === "expirations")
    return (
      <Panel
        eyebrow="COMPLIANCE QUEUE"
        title="Vencimientos y obligaciones"
        count={data.attention.length}
      >
        {data.attention.length ? (
          <div className="hrAttention">
            {data.attention.map((item) => (
              <Attention key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Empty
            icon={CheckCircle2}
            title="Sin alertas visibles"
            text="No hay alertas en la cola consultada. Esto no confirma que todas las obligaciones estén configuradas o resueltas."
          />
        )}
      </Panel>
    );
  if (view === "requests")
    return (
      <ViewState
        title="Solicitudes en Service Desk"
        text="La gestión de solicitudes RR.HH. utiliza la cola restringida HR. Esta vista no consulta sus tickets ni muestra un contador de solicitudes resueltas o pendientes."
        href="/support/tickets"
        action="Abrir Service Desk"
      />
    );
  if (view === "reports") return <Reports data={data} />;
  return <Settings data={data} />;
}

function Toolbar({ value, change }: { value: string; change: (value: string) => void }) {
  return (
    <div className="hrToolbar">
      <label>
        <Search />
        <input
          value={value}
          onChange={(event) => change(event.target.value)}
          placeholder="Buscar por nombre, RUT, número o correo"
        />
      </label>
    </div>
  );
}
function OrgChart({ data }: { data: HrWorkspaceData }) {
  return (
    <Panel
      eyebrow="LIVE ORGANIZATION"
      title="Empresa → áreas → equipos → personas"
      count={data.departments.length}
    >
      <div className="hrOrg">
        <div className="hrOrgRoot">
          <Network />
          <strong>Zyteron</strong>
          <span>
            {hrSourceState(data.sourceStatus) === "available" ? data.summary.activeEmployees : "—"}{" "}
            personas activas
          </span>
        </div>
        <div className="hrOrgBranches">
          {data.departments.map((department) => {
            const relationships = data.relationships.filter(
              (item) => item.departmentId === department.id && item.status === "ACTIVE",
            );
            return (
              <article key={department.id}>
                <header>
                  <Building2 />
                  <div>
                    <strong>{department.name}</strong>
                    <span>{relationships.length} personas</span>
                  </div>
                </header>
                {relationships.map((relationship) => {
                  const employee = data.employees.find(
                      (item) => item.id === relationship.employeeId,
                    ),
                    position = data.positions.find(
                      (item) => item.id === relationship.jobPositionId,
                    );
                  return employee ? (
                    <Link href={`/hr/employees/${employee.id}`} key={employee.id}>
                      <div className="hrAvatar">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </div>
                      <div>
                        <strong>{name(employee)}</strong>
                        <small>{position?.name || "Cargo no asignado"}</small>
                      </div>
                    </Link>
                  ) : null;
                })}
                {!relationships.length ? <small>Sin asignaciones activas</small> : null}
              </article>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
export function EmployeeFiles({ data }: { data: HrWorkspaceData }) {
  return (
    <>
      <ViewState
        title="Expedientes por colaborador"
        text="Selecciona una persona para consultar los documentos vinculados a su expediente. No se utilizan los anexos como sustituto de la biblioteca documental."
      />
      <Panel
        eyebrow="EMPLOYEE FILES"
        title="Expedientes individuales"
        count={data.employees.length}
      >
        <div className="hrRecords">
          {data.employees.map((employee) => (
            <article key={employee.id}>
              <FolderLock />
              <div>
                <strong>{name(employee)}</strong>
                <span>{employee.employeeNumber}</span>
              </div>
              <Link href={`/hr/employees/${employee.id}#expediente`}>
                Ver expediente
                <ArrowRight />
              </Link>
            </article>
          ))}
          {!data.employees.length ? (
            <Empty
              icon={FolderLock}
              title="Sin expedientes visibles"
              text="No hay colaboradores visibles en la fuente consultada. No se concluye que no existan documentos en Documents."
            />
          ) : null}
        </div>
      </Panel>
    </>
  );
}

function WorkforceRecords({
  view,
  role,
  data,
}: {
  view: "schedules" | "performance";
  role: Role;
  data: HrWorkspaceData;
}) {
  const [records, setRecords] = useState<Array<HrScheduleRecord | HrPerformanceRecord> | null>(
      null,
    ),
    [error, setError] = useState<{ message: string; status: number | null } | null>(null);
  const fullPerformanceScope = hrCanReadPerformance(role);
  useEffect(() => {
    if (view === "performance" && !fullPerformanceScope) return;
    let cancelled = false;
    const request = view === "schedules" ? hrApi.schedules(role) : hrApi.performance(role);
    void request
      .then((items) => {
        if (!cancelled) setRecords(items);
      })
      .catch((reason) => {
        if (!cancelled)
          setError({
            message:
              reason instanceof Error ? reason.message : "No fue posible consultar esta fuente.",
            status: reason instanceof HrApiError ? reason.status : null,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [view, role, fullPerformanceScope]);
  if (view === "performance" && !fullPerformanceScope)
    return (
      <ViewState
        title="Consulta individual no disponible"
        text="Esta vista requiere una fuente de evaluaciones con alcance individual verificado. No se sustituyen evaluaciones por objetivos ni se muestran registros fuera de ese alcance."
      />
    );
  if (error)
    return (
      <ViewState
        title={
          error.status === 403
            ? "Sin acceso a esta vista"
            : error.status === 401
              ? "Sesión requerida"
              : "Fuente no disponible"
        }
        text={error.message}
      />
    );
  if (!records)
    return (
      <ViewState
        title="Consultando registros…"
        text={
          view === "schedules"
            ? "Cargando jornadas configuradas."
            : "Cargando evaluaciones registradas."
        }
      />
    );
  return (
    <>
      <ViewState
        title="Consulta de registros"
        text={
          view === "schedules"
            ? "Se muestran las jornadas registradas. La asignación individual y la gestión de turnos no están disponibles en esta vista."
            : "Se muestran evaluaciones registradas, separadas de los objetivos. La gestión de ciclos y evaluaciones no está disponible en esta vista."
        }
      />
      <SimpleRecords
        title={view === "schedules" ? "Jornadas registradas" : "Evaluaciones registradas"}
        eyebrow={view === "schedules" ? "WORKING TIME" : "PERFORMANCE REVIEWS"}
        icon={view === "schedules" ? Clock3 : UserCheck}
        items={records.map((item) =>
          "weeklyHours" in item
            ? {
                id: item.id,
                title: item.name,
                meta: `${item.weeklyHours} horas · ${item.timezone} · ${label(item.scheduleType)}`,
                status: item.active ? "ACTIVE" : "INACTIVE",
              }
            : {
                id: item.id,
                title: `Evaluación ${item.id.slice(0, 8)}`,
                meta: data.employees.find((employee) => employee.id === item.employeeId)
                  ? name(data.employees.find((employee) => employee.id === item.employeeId)!)
                  : "Colaborador no visible en el directorio",
                status: item.status,
              },
        )}
      />
    </>
  );
}

function DocumentsArea({ view, data, role }: { view: string; data: HrWorkspaceData; role: Role }) {
  const items = view === "contracts" ? data.contracts : data.annexes,
    signature = providerItem(data, "signature"),
    labor = providerItem(data, "laborAuthority");
  return (
    <>
      <section className="hrStatusStrip">
        <div>
          <FolderLock />
          <span>Clasificación por defecto</span>
          <strong>Acceso restringido</strong>
        </div>
        <div>
          <FileSignature />
          <span>Firma electrónica</span>
          <strong>{signature.title}</strong>
        </div>
        <div>
          <ShieldCheck />
          <span>Registro laboral</span>
          <strong>{labor.title}</strong>
        </div>
      </section>
      <Panel
        eyebrow="EMPLOYMENT RECORDS"
        title={views[view]?.title || "Documentos"}
        count={items.length}
      >
        {items.length ? (
          <div className="hrRecords">
            {items.map((item) => (
              <article key={item.id}>
                <FileCheck2 />
                <div>
                  <strong>
                    {"contractNumber" in item ? item.contractNumber : label(item.annexType)}
                  </strong>
                  <span>
                    {"startDate" in item
                      ? formatDate(item.startDate)
                      : formatDate(item.effectiveDate)}
                  </span>
                </div>
                <em className={statusTone(item.status)}>{label(item.status)}</em>
                {item.documentId && hrCanReadDocuments(role) ? (
                  <Link href={`/documents/${item.documentId}`} prefetch={false}>
                    Ver documento
                    <ArrowRight />
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={FolderLock}
            title="Sin registros visibles"
            text="No hay registros visibles en esta fuente. La creación y tramitación no están disponibles en esta vista."
          />
        )}
      </Panel>
    </>
  );
}
export function Lifecycle({ view, data }: { view: string; data: HrWorkspaceData }) {
  const items = view === "onboarding" ? data.onboarding : data.offboarding;
  return (
    <Panel
      eyebrow={view === "onboarding" ? "JOINER PIPELINE" : "LEAVER PIPELINE"}
      title={views[view]?.title || "Ciclo laboral"}
      count={items.length}
    >
      <div className="hrLifecycle">
        {items.map((item) => {
          const employee = data.employees.find((person) => person.id === item.employeeId),
            progress = hrLifecycleProgress(view, item);
          return (
            <article key={item.id}>
              <header>
                <strong>{employee ? name(employee) : "Colaborador"}</strong>
                <em className={statusTone(item.status)}>{label(item.status)}</em>
              </header>
              {progress !== null ? (
                <div
                  className="hrProgress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="Tareas marcadas como completas"
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
              ) : null}
              <small>
                {view === "onboarding"
                  ? `${progress ?? "—"}% de tareas marcadas como completas`
                  : "effectiveDate" in item
                    ? `Fecha efectiva ${formatDate(item.effectiveDate)} · ${item.criticalBlockers} bloqueos registrados`
                    : ""}
              </small>
              <p className="hrRecordNote">
                El estado registrado no verifica por sí solo contratos, accesos ni evidencia
                externa.
              </p>
            </article>
          );
        })}
        {!items.length ? (
          <Empty
            icon={view === "onboarding" ? UserCheck : UserMinus}
            title={`Sin procesos de ${view} visibles`}
            text="No hay procesos visibles en la fuente consultada."
          />
        ) : null}
      </div>
    </Panel>
  );
}

function LeaveArea({
  view,
  data,
  role,
  act,
  selectedRecordId,
}: {
  selectedRecordId?: string | null;
  view: string;
  data: HrWorkspaceData;
  role: Role;
  act: (action: () => Promise<unknown>, message: string) => Promise<void>;
}) {
  let items = data.leave;
  if (view === "vacations") items = items.filter((item) => item.leaveType === "VACATION");
  if (view === "permissions")
    items = items.filter((item) => item.leaveType === "ADMINISTRATIVE_LEAVE");
  const today = new Date().toISOString().slice(0, 10);
  if (view === "absences" && !selectedRecordId)
    items = items.filter((item) => item.status === "APPROVED" && item.endDate >= today);
  return (
    <>
      <section className="hrLeaveSnapshot">
        <div>
          <CalendarDays />
          <strong>
            {
              items.filter(
                (item) =>
                  item.status === "APPROVED" && item.startDate <= today && item.endDate >= today,
              ).length
            }
          </strong>
          <span>Hoy</span>
        </div>
        <div>
          <Clock3 />
          <strong>
            {items.filter((item) => ["PENDING_MANAGER", "PENDING_HR"].includes(item.status)).length}
          </strong>
          <span>Pendientes</span>
        </div>
        <div>
          <UserCheck />
          <strong>
            {items.filter((item) => item.status === "APPROVED" && item.startDate > today).length}
          </strong>
          <span>Próximas</span>
        </div>
      </section>
      <Panel eyebrow="LEAVE BOARD" title={views[view]?.title || "Ausencias"} count={items.length}>
        {items.length ? (
          <div className="hrLeaveList">
            {items.map((item) => (
              <article key={item.id}>
                <CalendarDays />
                <div>
                  <strong>{label(item.leaveType)}</strong>
                  <span>
                    {formatDate(item.startDate)} → {formatDate(item.endDate)} ·{" "}
                    {item.requestedUnits} {label(item.unit)}
                  </span>
                </div>
                <em className={statusTone(item.status)}>{label(item.status)}</em>
                {role === "RRHH" && ["PENDING_MANAGER", "PENDING_HR"].includes(item.status) ? (
                  <button
                    onClick={() =>
                      void act(
                        () => hrApi.approveLeave(role, item.id),
                        "Ausencia aprobada y ledger actualizado.",
                      )
                    }
                  >
                    <CheckCircle2 />
                    Aprobar
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={CalendarDays}
            title="Sin solicitudes"
            text="No existen ausencias reales para este filtro."
          />
        )}
      </Panel>
    </>
  );
}
function MedicalLeaveArea({ data, role }: { data: HrWorkspaceData; role: Role }) {
  if (role !== "RRHH")
    return (
      <Panel eyebrow="MEDICAL RESTRICTED" title="Licencias médicas" count={0}>
        <Empty
          icon={ShieldCheck}
          title="Información restringida"
          text="Las jefaturas reciben únicamente el estado de ausencia, sin diagnóstico ni documento clínico."
        />
      </Panel>
    );
  return (
    <Panel eyebrow="MEDICAL RESTRICTED" title="Licencias médicas" count={data.medical.length}>
      {data.medical.length ? (
        <div className="hrRecords">
          {data.medical.map((item) => (
            <article key={item.id}>
              <ShieldCheck />
              <div>
                <strong>Licencia {item.id.slice(0, 8)}</strong>
                <span>
                  {formatDate(item.startDate)} → {formatDate(item.endDate)} · {item.days} días
                </span>
              </div>
              <em className={statusTone(item.status)}>{label(item.status)}</em>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={ShieldCheck}
          title="Sin licencias registradas"
          text="Esta sección no expone diagnósticos y solo admite evidencias reales con acceso restringido."
        />
      )}
    </Panel>
  );
}
function TimeArea({ view, data }: { view: string; data: HrWorkspaceData }) {
  const attendance = providerItem(data, "attendance");
  return (
    <section className="hrTime">
      <div>
        <Clock3 />
        <p>{view === "attendance" ? "PROVEEDOR DE ASISTENCIA" : "JORNADAS DE TRABAJO"}</p>
        <h2>{view === "attendance" ? attendance.title : "Jornadas"}</h2>
        <span>
          {view === "attendance"
            ? attendance.detail
            : "La arquitectura soporta zonas horarias y turnos que terminan al día siguiente."}
        </span>
        {view === "attendance" ? (
          <Link className="hrProviderAction" href="/hr/settings#integraciones">
            Ver configuración y límites
            <ArrowRight />
          </Link>
        ) : null}
      </div>
      <aside>
        <b>Privacidad operacional</b>
        <p>No se activa GPS continuo ni vigilancia invasiva.</p>
        <b>Formato</b>
        <p>24 horas · America/Santiago · persistencia UTC cuando corresponde.</p>
      </aside>
    </section>
  );
}
function PayrollArea({ view, data }: { view: string; data: HrWorkspaceData }) {
  const items = view === "payroll" ? data.payroll : data.lre,
    steps =
      view === "payroll"
        ? ["Abierto", "Cálculo", "Revisión", "Aprobado", "Pagado", "Cerrado"]
        : ["Nómina cerrada", "Generar", "Validar", "Exportar", "Adjuntar respaldo", "Declarado"];
  return (
    <>
      <div className="hrSourceBanner" role="note"><ShieldCheck/><div><strong>Preparación laboral pendiente de validación integral</strong><p>El motor actual no acredita el cálculo completo de cotizaciones previsionales e impuestos. La consulta de períodos o exportaciones no confirma pagos ni presentación oficial.</p><Link href="/hr/sii">Ver conexión tributaria y circuitos laborales</Link></div></div>
      <section className="hrPayrollFlow">
        {steps.map((item, index) => (
          <div key={item}>
            <span>{index + 1}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </section>
      <Panel
        eyebrow={view === "payroll" ? "PERÍODOS DE REMUNERACIÓN" : "CONTROL LRE"}
        title={views[view]?.title || "Remuneraciones"}
        count={items.length}
      >
        {items.length ? (
          <div className="hrRecords">
            {items.map((item) => (
              <article key={item.id}>
                <WalletCards />
                <div>
                  <strong>
                    {"period" in item
                      ? item.period
                      : `Exportación ${data.payroll.find((period) => period.id === item.payrollPeriodId)?.period || item.id.slice(0, 8)}`}
                  </strong>
                  <span>
                    {"ruleVersionId" in item
                      ? item.ruleVersionId
                        ? `Reglas ${item.ruleVersionId.slice(0, 8)}`
                        : "Sin versión calculada"
                      : `Esquema ${item.schemaVersionId.slice(0, 8)}`}
                  </span>
                </div>
                <em className={statusTone(item.status)}>{label(item.status)}</em>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={WalletCards}
            title="Sin períodos visibles"
            text="No hay períodos o exportaciones visibles en la fuente consultada. Esto no acredita pagos, declaraciones ni cierres."
          />
        )}
      </Panel>
    </>
  );
}
function Reports({ data }: { data: HrWorkspaceData }) {
  return (
    <section className="hrReports">
      <article>
        <UsersRound />
        <strong>Headcount</strong>
        <b>
          {hrSourceState(data.sourceStatus) === "available" ? data.summary.activeEmployees : "—"}
        </b>
        <span>Estado ACTIVE al corte actual.</span>
      </article>
      <article>
        <UserCheck />
        <strong>Altas del mes</strong>
        <b>
          {hrSourceState(data.sourceStatus) === "available" ? data.summary.hiresThisMonth : "—"}
        </b>
        <span>Según fecha de ingreso.</span>
      </article>
      <article>
        <UserMinus />
        <strong>Bajas del mes</strong>
        <b>
          {hrSourceState(data.sourceStatus) === "available"
            ? data.summary.terminationsThisMonth
            : "—"}
        </b>
        <span>Según fecha de término.</span>
      </article>
      <article>
        <Activity />
        <strong>Rotación</strong>
        <b>—</b>
        <span>Requiere una serie histórica completa.</span>
      </article>
    </section>
  );
}
function Settings({ data }: { data: HrWorkspaceData }) {
  return (
    <>
      <section className="hrSettings">
        <div>
          <ShieldCheck />
          <h2>Privacidad por campo</h2>
          <p>
            Datos generales, visibilidad de jefatura, información confidencial de RR.HH.,
            remuneraciones restringidas y antecedentes médicos especialmente protegidos.
          </p>
        </div>
        <div>
          <Landmark />
          <h2>Reglas versionadas</h2>
          <p>
            Vacaciones, remuneraciones, LRE y obligaciones requieren una versión vigente y una
            fuente verificable antes de operar.
          </p>
        </div>
        <div>
          <FileSignature />
          <h2>Estados y evidencia</h2>
          <p>
            Los estados del sistema deben contrastarse con evidencia. Los trámites externos
            requieren referencia y comprobante; esta vista no los verifica ni los da por cerrados.
          </p>
        </div>
      </section>
      <section className="hrIntegrationGrid" id="integraciones">
        {providerItems(data).map((item) => (
          <article key={item.key} className={item.state.toLowerCase()}>
            <header>
              <div>
                <small>{item.label}</small>
                <h2>{item.title}</h2>
              </div>
              <span>
                {item.state === "READY"
                  ? "Disponible"
                  : item.state === "EXTERNAL_STEP"
                    ? "Paso externo"
                    : "Requiere acción"}
              </span>
            </header>
            <p>{item.detail}</p>
            <Link href={item.actionHref}>
              {item.actionLabel}
              <ArrowRight />
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
function SimpleRecords({
  title,
  eyebrow,
  items,
  icon: Icon,
}: {
  title: string;
  eyebrow: string;
  items: Array<{ id: string; title: string; meta: string; status: string }>;
  icon: LucideIcon;
}) {
  return (
    <Panel eyebrow={eyebrow} title={title} count={items.length}>
      {items.length ? (
        <div className="hrRecords">
          {items.map((item) => (
            <article key={item.id}>
              <Icon />
              <div>
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </div>
              <em className={statusTone(item.status)}>{label(item.status)}</em>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={Icon}
          title="Sin registros"
          text="No hay registros visibles en la fuente consultada para esta cuenta."
        />
      )}
    </Panel>
  );
}

export function EmployeeRecord({ data, role }: { data: EmployeeDetail; role: Role }) {
  const tabs = [
    ["Resumen", "resumen"],
    ["Expediente", "expediente"],
    ["Asignaciones", "asignaciones"],
    ["Actividad", "actividad"],
  ];
  return (
    <>
      <section className="hrEmployeeHero">
        <div className="hrAvatar large">
          {data.employee.firstName[0]}
          {data.employee.lastName[0]}
        </div>
        <div>
          <p>{data.employee.employeeNumber}</p>
          <h2>{name(data.employee)}</h2>
          <span>
            {data.employee.rut} · {label(data.employee.status)}
          </span>
        </div>
        <aside>
          <span>Ingreso</span>
          <strong>{formatDate(data.employee.hireDate)}</strong>
          <span>Relación</span>
          <strong>
            {data.relationship ? label(data.relationship.employmentType) : "No configurada"}
          </strong>
        </aside>
      </section>
      <nav className="hrRecordTabs">
        {tabs.map(([title, id]) => (
          <a href={`#${id}`} key={id}>
            {title}
          </a>
        ))}
      </nav>
      <section className="hrEmployeeGrid">
        <Panel id="resumen" eyebrow="LABOR SNAPSHOT" title="Resumen" count={0}>
          <dl className="hrDefinition">
            <div>
              <dt>Estado</dt>
              <dd>{label(data.employee.status)}</dd>
            </div>
            <div>
              <dt>Fecha ingreso</dt>
              <dd>{formatDate(data.employee.hireDate)}</dd>
            </div>
            <div>
              <dt>Jornada</dt>
              <dd>
                {data.relationship?.weeklyHours
                  ? `${data.relationship.weeklyHours} horas`
                  : "Sin configurar"}
              </dd>
            </div>
            <div>
              <dt>Vacaciones disponibles</dt>
              <dd>{data.balance ? `${data.balance.available} días` : "—"}</dd>
            </div>
          </dl>
        </Panel>
        <Panel
          id="expediente"
          eyebrow="DOCUMENT CONTROL"
          title="Expediente"
          count={data.documents?.total || 0}
        >
          <dl className="hrDefinition">
            <div>
              <dt>Contratos</dt>
              <dd>{data.contracts.length}</dd>
            </div>
            <div>
              <dt>Anexos</dt>
              <dd>{data.annexes.length}</dd>
            </div>
            <div>
              <dt>Documentos</dt>
              <dd>{data.documents?.total || 0}</dd>
            </div>
            <div>
              <dt>Pendientes firma</dt>
              <dd>{data.documents?.pendingSignature || 0}</dd>
            </div>
          </dl>
          {hrCanReadDocuments(role) && data.documents?.documents.length ? (
            <div className="hrRecords">
              {data.documents.documents.map((document) => (
                <article key={document.id}>
                  <FileCheck2 />
                  <div>
                    <strong>{document.title}</strong>
                    <span>{label(document.status)}</span>
                  </div>
                  <Link href={`/documents/${document.id}`} prefetch={false}>
                    Abrir documento
                    <ArrowRight />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="hrRecordNote">
              {hrCanReadDocuments(role)
                ? "No hay documentos visibles en este expediente para tu cuenta."
                : "Consulta documental individual no disponible: el alcance de archivos y enlaces no está verificado para esta vista. Se conserva el resumen del expediente."}
            </p>
          )}
        </Panel>
        <Panel id="asignaciones" eyebrow="WORKFORCE" title="Asignaciones" count={0}>
          <dl className="hrDefinition">
            <div>
              <dt>Activos</dt>
              <dd>{data.assets.filter((item) => !item.returnedAt).length}</dd>
            </div>
            <div>
              <dt>Capacitaciones</dt>
              <dd>{data.training.length}</dd>
            </div>
            <div>
              <dt>Objetivos</dt>
              <dd>{data.goals.length}</dd>
            </div>
            <div>
              <dt>Remuneración</dt>
              <dd>{data.compensationVisible ? data.compensation?.length || 0 : "Restringida"}</dd>
            </div>
          </dl>
        </Panel>
      </section>
      <Panel
        id="actividad"
        eyebrow="EMPLOYMENT TIMELINE"
        title="Actividad laboral"
        count={data.activity.length}
      >
        {data.activity.length ? (
          <div className="hrTimeline">
            {data.activity.map((item) => (
              <div key={item.id}>
                <span />
                <div>
                  <strong>{label(item.eventType)}</strong>
                  <small>{formatDateTime(item.occurredAt)}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={Activity}
            title="Sin actividad"
            text="El historial se conservará sin eliminación destructiva."
          />
        )}
      </Panel>
    </>
  );
}

function CreateEmployee({
  close,
  save,
  busy,
}: {
  close: () => void;
  save: (value: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    rut: "",
    firstName: "",
    lastName: "",
    corporateEmail: "",
    hireDate: "",
    employmentType: "INDEFINITE",
  });
  return (
    <div className="hrModalBackdrop">
      <form
        className="hrModal"
        onSubmit={(event) => {
          event.preventDefault();
          void save(form);
        }}
      >
        <header>
          <div>
            <p>EMPLOYEE MASTER</p>
            <h2>Nuevo colaborador</h2>
          </div>
          <button type="button" onClick={close}>
            ×
          </button>
        </header>
        <div className="hrFormGrid">
          <label>
            RUT
            <input
              required
              value={form.rut}
              onChange={(event) => setForm({ ...form, rut: event.target.value })}
              placeholder="12.345.678-5"
            />
          </label>
          <label>
            Nombre
            <input
              required
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
            />
          </label>
          <label>
            Apellido
            <input
              required
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
            />
          </label>
          <label>
            Correo corporativo
            <input
              type="email"
              value={form.corporateEmail}
              onChange={(event) => setForm({ ...form, corporateEmail: event.target.value })}
            />
          </label>
          <label>
            Fecha de ingreso
            <input
              type="date"
              value={form.hireDate}
              onChange={(event) => setForm({ ...form, hireDate: event.target.value })}
            />
          </label>
          <label>
            Tipo de relación
            <select
              value={form.employmentType}
              onChange={(event) => setForm({ ...form, employmentType: event.target.value })}
            >
              {[
                "INDEFINITE",
                "FIXED_TERM",
                "PART_TIME",
                "INTERNSHIP",
                "OTHER_LEGAL_RELATIONSHIP",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <footer>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button className="hrPrimary" disabled={busy}>
            {busy ? "Guardando…" : "Crear expediente"}
          </button>
        </footer>
      </form>
    </div>
  );
}
function Panel({
  id,
  eyebrow,
  title,
  count,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="hrPanel">
      <header>
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {count ? <b>{count}</b> : null}
      </header>
      {children}
    </section>
  );
}
function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="hrEmpty">
      <Icon />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

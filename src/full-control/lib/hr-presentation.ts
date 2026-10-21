import { siiDocumentDefinition } from "@zyteron/contracts";
import type { HrProviderReadiness, HrWorkspace, Role } from "../contracts";

export const hrSections = [
  { label: "Resumen", views: ["command"] },
  {
    label: "Personal y estructura",
    views: ["employees", "org-chart", "departments", "teams", "positions"],
  },
  {
    label: "Ciclo laboral y documentos",
    views: ["contracts", "annexes", "files", "onboarding", "offboarding", "assets"],
  },
  {
    label: "Tiempo y ausencias",
    views: ["vacations", "permissions", "medical-leave", "absences", "schedules", "attendance"],
  },
  { label: "Remuneraciones y cumplimiento", views: ["payroll", "lre", "sii", "expirations"] },
  { label: "Desarrollo y servicios", views: ["performance", "goals", "training", "requests"] },
  { label: "Informes y configuración", views: ["reports", "settings"] },
] as const;

export function hrNavigationOrder(href: string) {
  return (hrSections.flatMap((section) => [...section.views]) as string[]).indexOf(
    href === "/hr" ? "command" : href.split("/")[2]!,
  );
}

const recordSources = {
  contracts: "contracts",
  annexes: "annexes",
  onboarding: "onboarding",
  offboarding: "offboarding",
  vacations: "leave",
  permissions: "leave",
  absences: "leave",
  payroll: "payroll",
  lre: "lre",
} as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveHrRoute(segments: string[]) {
  const view = segments[0] || "command";
  const known = hrSections.some((section) => (section.views as readonly string[]).includes(view));
  const id = segments[1]?.toLowerCase() || null;
  const invalid =
    !known ||
    segments.length > 2 ||
    Boolean(
      id && (view === "sii" ? !/^[0-9]+$/.test(id) || String(Number(id)) !== id || !siiDocumentDefinition(Number(id)) : !uuid.test(id) || (view !== "employees" && !Object.hasOwn(recordSources, view))),
    );
  return {
    view,
    invalid,
    ...(view === "sii" ? { documentTypeCode: id ? Number(id) : 33 } : {}),
    employeeId: !invalid && view === "employees" ? id : null,
    recordId: !invalid && view !== "employees" && view !== "sii" ? id : null,
  };
}

export function selectHrRecord(data: HrWorkspace, view: string, id: string | null) {
  if (!id) return { data, found: true };
  const source = Object.hasOwn(recordSources, view)
    ? recordSources[view as keyof typeof recordSources]
    : undefined;
  if (!source) return { data, found: false };
  const records = data[source].filter((item) => item.id === id);
  const found = records.some(
    (item) =>
      (view !== "vacations" && view !== "permissions") ||
      ("leaveType" in item &&
        item.leaveType === (view === "vacations" ? "VACATION" : "ADMINISTRATIVE_LEAVE")),
  );
  return { data: { ...data, [source]: records }, found };
}

export function hrProviderPresentation(item: HrProviderReadiness): HrProviderReadiness {
  if (item.key === "laborAuthority" && item.state === "EXTERNAL_STEP")
    return {
      ...item,
      title: "Pendiente de evidencia externa",
      detail:
        "El registro laboral se realiza en el canal oficial. Consulta el contrato y su comprobante; esta vista no verifica el trámite externo.",
      actionHref: "/hr/contracts",
      actionLabel: "Ver contratos y respaldo",
    };
  if (item.key === "payrollSubmission" && item.state === "EXTERNAL_STEP")
    return {
      ...item,
      title: "Presentación externa",
      detail:
        "La presentación previsional requiere un canal externo y su comprobante. Consultar LRE no acredita su realización.",
      actionLabel: "Consultar LRE",
    };
  return item;
}

export function hrStatusTone(status: string) {
  if (
    [
      "ACTIVE",
      "APPROVED",
      "COMPLETED",
      "REGISTERED",
      "SIGNED",
      "PAID",
      "CLOSED",
      "DECLARED",
      "RETURNED",
    ].includes(status)
  )
    return "ok";
  if (
    [
      "BLOCKED",
      "EXPIRED",
      "TERMINATED",
      "REJECTED",
      "ERROR",
      "VALIDATION_ERROR",
      "AT_RISK",
      "RECTIFICATION_REQUIRED",
    ].includes(status)
  )
    return "bad";
  return "wait";
}

export function hrSourceState(status: HrWorkspace["sourceStatus"]) {
  return status === "PERSISTENT"
    ? "available"
    : status === "NOT_CONFIGURED"
      ? "not-configured"
      : "unverified";
}

export function hrLifecycleProgress(view: string, item: { status: string; progress?: number }) {
  if (view === "offboarding") return item.status === "COMPLETED" ? 100 : null;
  return typeof item.progress === "number" &&
    Number.isFinite(item.progress) &&
    item.progress >= 0 &&
    item.progress <= 100
    ? item.progress
    : null;
}

// These new views must not use an unscoped list for individual or general-directory profiles.
// This only limits the new presentation; server authorization is unchanged.
export function hrCanReadPerformance(role: Role) {
  return role === "RRHH";
}
export function hrCanReadDocuments(role: Role) {
  return role === "RRHH";
}

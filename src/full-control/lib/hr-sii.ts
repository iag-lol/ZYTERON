import {
  hasFinancePermission,
  siiDocumentCatalog,
  siiDocumentDefinition,
  type DteReadiness,
  type Role,
  type TaxDocument,
} from "@zyteron/contracts";
import { financeApi, FinanceApiError } from "./finance-api";

export interface SiiTypeStatus {
  code: number;
  enabledForIssue: boolean;
  certified: boolean;
  catalogConfigured?: boolean;
  implementationStatus?: string;
}
export interface SiiDocumentPage {
  items: TaxDocument[];
  total: number;
  page: number;
  totalPages: number;
}
export interface HrSiiData {
  restricted: boolean;
  types: SiiTypeStatus[];
  readiness: DteReadiness | null;
  documents: SiiDocumentPage | null;
  errors: { catalog?: string; readiness?: string; documents?: string };
  synchronizedAt: string;
}

export const siiFamilies = [...new Set(siiDocumentCatalog.map((item) => item.family))];
export const siiTypePath = (code: number) => `/hr/sii/${code}`;
export const canReadHrSii = (role: Role) => hasFinancePermission(role, "dte.view");

export function filterSiiCatalog(query: string, family: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const search = normalize(query.trim());
  return siiDocumentCatalog.filter(
    (item) =>
      (!family || item.family === family) &&
      normalize(`${item.code} ${item.name} ${item.description}`).includes(search),
  );
}

const validId = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const validType = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(item.code) &&
    Number(item.code) > 0 &&
    typeof item.enabledForIssue === "boolean" &&
    typeof item.certified === "boolean"
  );
};
const validReadiness = (value: DteReadiness) =>
  value &&
  ["CERTIFICATION", "PRODUCTION"].includes(value.environment) &&
  ["NONE", "SII_DIRECT", "EXTERNAL"].includes(value.provider) &&
  Array.isArray(value.requirements) &&
  value.requirements.every(
    (item) =>
      item &&
      ["key", "label", "detail"].every(
        (key) => typeof item[key as "key" | "label" | "detail"] === "string",
      ) &&
      typeof item.satisfied === "boolean",
  );
const validDocument = (value: unknown, code: number) => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    validId(item.id) &&
    item.documentTypeCode === code &&
    typeof item.status === "string" &&
    ["CERTIFICATION", "PRODUCTION"].includes(String(item.environment)) &&
    (item.folio === null ||
      (typeof item.folio === "number" && Number.isSafeInteger(item.folio) && item.folio > 0)) &&
    (item.issueDate === null ||
      (typeof item.issueDate === "string" && Number.isFinite(Date.parse(item.issueDate)))) &&
    ["trackId", "statusMessage"].every((key) => item[key] === null || typeof item[key] === "string")
  );
};

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo consultar esta fuente.";
const restrictedData = (): HrSiiData => ({
  restricted: true,
  types: [],
  readiness: null,
  documents: null,
  errors: {},
  synchronizedAt: new Date().toISOString(),
});

/** Consulta el mismo motor financiero; no replica documentos ni crea permisos desde RRHH. */
export async function readHrSii(
  role: Role,
  code: number,
  page: number,
  isCurrent: () => boolean,
): Promise<HrSiiData | null> {
  if (!siiDocumentDefinition(code) || !Number.isInteger(page) || page < 1)
    throw new Error("Consulta tributaria inválida.");
  if (!canReadHrSii(role)) return isCurrent() ? restrictedData() : null;
  const [catalog, readiness, documents] = await Promise.allSettled([
    financeApi.get<SiiTypeStatus[]>(role, "/dte/document-types"),
    financeApi.get<DteReadiness>(role, `/dte/document-types/${code}/readiness`),
    financeApi.get<SiiDocumentPage>(
      role,
      `/tax-documents?documentTypeCode=${code}&pageSize=8&page=${page}`,
    ),
  ]);
  if (!isCurrent()) return null;
  if (
    [catalog, readiness, documents].some(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof FinanceApiError &&
        [401, 403].includes(result.reason.status),
    )
  )
    return restrictedData();
  const result: HrSiiData = {
    restricted: false,
    types: [],
    readiness: null,
    documents: null,
    errors: {},
    synchronizedAt: new Date().toISOString(),
  };
  if (
    catalog.status === "fulfilled" &&
    Array.isArray(catalog.value) &&
    catalog.value.every(validType)
  )
    result.types = catalog.value;
  else
    result.errors.catalog =
      catalog.status === "rejected"
        ? errorText(catalog.reason)
        : "El catálogo no tiene un formato válido.";
  if (readiness.status === "fulfilled" && validReadiness(readiness.value))
    result.readiness = readiness.value;
  else
    result.errors.readiness =
      readiness.status === "rejected"
        ? errorText(readiness.reason)
        : "La preparación técnica no tiene un formato válido.";
  if (
    documents.status === "fulfilled" &&
    Array.isArray(documents.value?.items) &&
    documents.value.items.every((document) => validDocument(document, code)) &&
    documents.value.page === page &&
    Number.isSafeInteger(documents.value.total) &&
    documents.value.total >= documents.value.items.length &&
    Number.isSafeInteger(documents.value.totalPages) &&
    documents.value.totalPages >= 0
  )
    result.documents = documents.value;
  else
    result.errors.documents =
      documents.status === "rejected"
        ? errorText(documents.reason)
        : "La respuesta no corresponde al tipo de documento seleccionado.";
  if (
    result.readiness?.requirements.some((item) => item.key === "persistence" && !item.satisfied)
  ) {
    result.documents = null;
    result.errors.documents =
      "Persistencia no configurada. No se presenta el registro temporal como ausencia de documentos productivos.";
  }
  return result;
}

export function siiDownloadPath(id: string, kind: "xml" | "pdf") {
  if (!["xml", "pdf"].includes(kind)) throw new Error("Formato de documento inválido.");
  if (!validId(id)) throw new Error("ID de documento inválido.");
  return `/tax-documents/${id}/${kind}`;
}

export function siiImplementationLabel(status?: string) {
  return (
    (
      {
        IMPLEMENTED: "Implementado",
        PENDING_IMPLEMENTATION: "Pendiente de implementación",
        PROVIDER_DEPENDENT: "Validar con proveedor",
        PROVIDER_NOT_CONFIGURED: "Proveedor no configurado",
      } as Record<string, string>
    )[status ?? ""] ?? "Estado no verificado"
  );
}

export const siiDocumentStatusLabel = (status: string) =>
  (
    ({
      DRAFT: "Borrador",
      VALIDATED: "Validado localmente",
      SIGNED: "Firmado",
      SUBMITTED: "Enviado al SII",
      RECEIVED_BY_SII: "Recibido por el SII",
      ACCEPTED: "Aceptado por el SII",
      ACCEPTED_WITH_REPAIRS: "Aceptado con reparos",
      REJECTED: "Rechazado por el SII",
      CANCELLED: "Cancelado",
    }) as Record<string, string>
  )[status] ?? "Estado no verificado";

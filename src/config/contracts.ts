/**
 * FUENTE ÚNICA DE LA CONFIGURACIÓN CONTRACTUAL
 * --------------------------------------------
 * Datos de Zyteron como parte contratante, valores predeterminados del
 * vínculo, estados del documento y catálogo de variables de plantilla.
 *
 * Los datos de la empresa se leen de `@/config/site` para no duplicar la
 * identidad corporativa. Lo específico del contrato (representante legal,
 * domicilio contractual, correo contractual) vive aquí.
 */

import { siteConfig } from "@/config/site";

export const CONTRACT_TYPES = ["executive_services", "partner_agreement"] as const;
export type ContractTypeId = (typeof CONTRACT_TYPES)[number];

/** Datos de Zyteron que aparecen en el encabezado y en la comparecencia. */
export const CONTRACT_COMPANY = {
  legalName: siteConfig.legalName,
  rut: siteConfig.taxId,
  address: "Santiago",
  comuna: "Santiago",
  city: "Santiago",
  region: siteConfig.address.region,
  email: "contacto@zyteron.cl",
  phone: siteConfig.contact.phoneDisplay,
  website: siteConfig.url.replace(/^https?:\/\//, ""),
  representativeName: siteConfig.representative.name,
  /**
   * RUT del representante legal. Si queda vacío, la validación previa lo
   * exige antes de generar el PDF: nunca se emite un contrato con la
   * comparecencia incompleta.
   */
  representativeRut: process.env.ZYTERON_REPRESENTATIVE_RUT?.trim() || "",
} as const;

/** Tope de comisión que administración puede pactar sin excepción escrita. */
export const MAX_COMMISSION_PCT = 30;

export const CONTRACT_TYPE_INFO: Record<
  ContractTypeId,
  {
    label: string;
    documentTitle: string;
    functionalRole: string;
    fileLabel: string;
    numberPrefix: string;
    defaultRoles: string[];
    description: string;
  }
> = {
  executive_services: {
    label: "Contrato de Prestación de Servicios Comerciales Independientes",
    documentTitle: "CONTRATO DE PRESTACIÓN DE SERVICIOS COMERCIALES INDEPENDIENTES",
    functionalRole: "Ejecutivo/a Comercial Freelance",
    fileLabel: "Contrato_Ejecutivo_Comercial_Freelance",
    numberPrefix: "EC",
    defaultRoles: ["executive", "portfolio"],
    description:
      "Prestación independiente de servicios comerciales: prospección, presentación de propuestas y acompañamiento al cierre.",
  },
  partner_agreement: {
    label: "Convenio de Colaboración Comercial Independiente",
    documentTitle: "CONVENIO DE COLABORACIÓN COMERCIAL INDEPENDIENTE",
    functionalRole: "Ejecutivo Comercial independiente de Zyteron",
    fileLabel: "Convenio_Partner",
    numberPrefix: "PT",
    defaultRoles: ["partner"],
    description:
      "Colaboración independiente por referidos: el partner presenta oportunidades y Zyteron ejecuta la propuesta y el cierre.",
  },
};

/** Plantilla que corresponde al rol del perfil, sin intervención manual. */
export function templateForRole(role: string): ContractTypeId {
  return role === "partner" ? "partner_agreement" : "executive_services";
}

/** Condiciones predeterminadas por tipo de contrato. */
export const CONTRACT_DEFAULTS: Record<
  ContractTypeId,
  {
    commissionPercentage: number;
    commissionBase: string;
    noticeDays: number;
    commissionTailDays: number;
    validity: string;
    signatureMethod: string;
  }
> = {
  executive_services: {
    commissionPercentage: 15,
    commissionBase: "Monto neto comisionable efectivamente recibido por Zyteron",
    noticeDays: 5,
    commissionTailDays: 90,
    validity: "Indefinida",
    signatureMethod: "Firma electrónica simple",
  },
  partner_agreement: {
    commissionPercentage: 15,
    commissionBase: "Monto neto comisionable efectivamente recibido por Zyteron",
    noticeDays: 5,
    commissionTailDays: 90,
    validity: "Indefinida",
    signatureMethod: "Firma electrónica simple",
  },
};

export const SIGNATURE_METHODS = [
  "Firma electrónica simple",
  "Firma electrónica avanzada",
  "Firma manuscrita digitalizada",
] as const;

export const SIGNATURE_TYPE_INFO: Record<string, string> = {
  simple: "Firma electrónica simple",
  advanced: "Firma electrónica avanzada",
  handwritten: "Firma manuscrita digitalizada",
};

// -- Estados del documento ---------------------------------------------------

export const CONTRACT_STATUS_INFO: Record<
  string,
  { label: string; cls: string; step: number; description: string }
> = {
  incomplete: {
    label: "Datos incompletos",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    step: 1,
    description: "Faltan datos obligatorios en la ficha para poder emitir el documento.",
  },
  draft: {
    label: "Borrador",
    cls: "bg-slate-100 text-slate-700 ring-slate-200",
    step: 2,
    description: "Configuración guardada. Aún no se genera el documento definitivo.",
  },
  ready: {
    label: "Aprobado para generar",
    cls: "bg-blue-50 text-blue-700 ring-blue-200",
    step: 3,
    description: "Datos validados y revisados. Listo para emitir el PDF definitivo.",
  },
  generated: {
    label: "PDF generado",
    cls: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    step: 4,
    description: "Documento definitivo emitido, con número único y hash de integridad.",
  },
  sent: {
    label: "Enviado",
    cls: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    step: 5,
    description: "Enviado al correo personal del prestador, a la espera de respuesta.",
  },
  received: {
    label: "Recibido",
    cls: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    step: 5,
    description: "El prestador confirmó la recepción del documento.",
  },
  signed_pending: {
    label: "Firmado, pendiente de validación",
    cls: "bg-violet-50 text-violet-700 ring-violet-200",
    step: 6,
    description: "Se recibió la copia firmada y espera revisión administrativa.",
  },
  signed: {
    label: "Firmado",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    step: 6,
    description: "Copia firmada registrada en el expediente.",
  },
  validated: {
    label: "Firma validada",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    step: 7,
    description: "Firma revisada y aceptada. La persona queda formalmente habilitada.",
  },
  rejected: {
    label: "Rechazado",
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
    step: 0,
    description: "La copia firmada fue rechazada; debe corregirse y volver a enviarse.",
  },
  superseded: {
    label: "Reemplazado",
    cls: "bg-slate-100 text-slate-500 ring-slate-200",
    step: 0,
    description: "Existe una versión posterior que sustituye a este documento.",
  },
  cancelled: {
    label: "Anulado",
    cls: "bg-slate-100 text-slate-500 ring-slate-200",
    step: 0,
    description: "Documento anulado por administración. Se conserva para auditoría.",
  },
  terminated: {
    label: "Finalizado",
    cls: "bg-slate-200 text-slate-600 ring-slate-300",
    step: 0,
    description: "La relación contractual terminó.",
  },
};

/** Línea de progreso que se muestra en la ficha. */
export const CONTRACT_PROGRESS_STEPS = [
  "Datos",
  "Borrador",
  "Revisión",
  "PDF generado",
  "Enviado",
  "Firmado",
  "Validado",
] as const;

/** Estados en los que el documento ya no admite cambios. */
export const CLOSED_CONTRACT_STATUSES = ["superseded", "cancelled", "terminated"] as const;

/** El documento definitivo existe y no puede reescribirse. */
export function isIssued(status: string): boolean {
  return !["incomplete", "draft", "ready"].includes(status);
}

/** La copia firmada ya está en el expediente: el original es inmutable. */
export function isSigned(status: string): boolean {
  return ["signed_pending", "signed", "validated"].includes(status);
}

// -- Variables de plantilla --------------------------------------------------

/**
 * Catálogo cerrado de variables. Cualquier `{{variable}}` de una plantilla
 * debe estar aquí; si aparece una desconocida o vacía, la generación se
 * detiene en vez de emitir un documento con huecos.
 */
export const CONTRACT_VARIABLES = [
  "numero_contrato",
  "tipo_contrato",
  "fecha_contrato",
  "ciudad",
  "nombre_completo",
  "rut_prestador",
  "domicilio_prestador",
  "comuna_prestador",
  "correo_personal",
  "telefono",
  "correo_corporativo",
  "cargo_funcional",
  "porcentaje_comision",
  "base_comision",
  "fecha_inicio",
  "dias_aviso_termino",
  "dias_cola_comisiones",
  "vigencia",
  "banco",
  "tipo_cuenta",
  "numero_cuenta",
  "titular_cuenta",
  "rut_titular",
  "razon_social_zyteron",
  "rut_zyteron",
  "domicilio_zyteron",
  "comuna_zyteron",
  "nombre_representante",
  "rut_representante",
  "correo_contractual_zyteron",
  "telefono_zyteron",
  "sitio_web_zyteron",
  "primer_nombre",
  "retencion_vigente",
  "anio_retencion",
  "ejemplo_base_comisionable",
  "ejemplo_comision_bruta",
] as const;

export type ContractVariable = (typeof CONTRACT_VARIABLES)[number];

/** Variables que jamás pueden ir vacías en el documento definitivo. */
export const REQUIRED_VARIABLES: ContractVariable[] = [
  "numero_contrato",
  "fecha_contrato",
  "ciudad",
  "nombre_completo",
  "rut_prestador",
  "domicilio_prestador",
  "correo_personal",
  "telefono",
  "cargo_funcional",
  "porcentaje_comision",
  "razon_social_zyteron",
  "rut_zyteron",
  "domicilio_zyteron",
  "nombre_representante",
  "rut_representante",
];

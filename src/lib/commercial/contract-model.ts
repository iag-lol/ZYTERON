import { DEFAULT_RETENTION_PCT, RETENTION_YEAR, formatCLP } from "@/config/commercial";
import {
  CONTRACT_COMPANY,
  CONTRACT_TYPE_INFO,
  CONTRACT_VARIABLES,
  MAX_COMMISSION_PCT,
  REQUIRED_VARIABLES,
  type ContractTypeId,
} from "@/config/contracts";
import { CONTRACT_TEMPLATES } from "@/content/commercial-contracts";
import { isValidRut, toSiiRut } from "@/lib/sii/rut";
import {
  normalizeAccountNumber,
  normalizeAccountType,
  normalizeAddress,
  normalizeBank,
  normalizeEmail,
  normalizePersonName,
  normalizePhone,
  normalizePlace,
  normalizeRutDisplay,
} from "@/lib/commercial/normalize";
import type { CommercialUserAdminView } from "@/lib/commercial/store";

/**
 * Armado y validación de los datos del contrato.
 *
 * Toda la información sale de la ficha que ya existe en `commercial_users`
 * más la configuración contractual que el administrador ajusta. Aquí no se
 * escribe ni se reescribe texto jurídico: solo se resuelven variables y se
 * comprueba que ninguna quede vacía.
 */

export type ContractConfig = {
  contractType: ContractTypeId;
  city: string;
  contractDate: string; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD
  functionalRole: string;
  commissionPercentage: number;
  commissionBase: string;
  noticeDays: number;
  commissionTailDays: number;
  validity: string;
  signatureMethod: string;
  corporateEmail: string;
  includeBankAnnex: boolean;
  observations: string;
  representativeName: string;
  representativeRut: string;
};

export type FieldState = "ok" | "missing" | "invalid" | "review";

export type ValidationField = {
  label: string;
  value: string;
  state: FieldState;
  message?: string;
  /** Impide emitir el PDF definitivo mientras no esté resuelto. */
  blocking: boolean;
};

export type ValidationSection = {
  id: string;
  title: string;
  fields: ValidationField[];
};

export type ContractValidation = {
  sections: ValidationSection[];
  blockers: string[];
  warnings: string[];
  canGenerate: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatLongDate(value: string): string {
  if (!DATE_RE.test(value)) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

/** Base de ejemplo que ilustra el cálculo de la comisión dentro del texto. */
const COMMISSION_EXAMPLE_BASE = 1_000_000;

/**
 * Construye el mapa de variables a partir de la ficha y la configuración.
 *
 * Todo lo que se imprime pasa antes por el normalizador: los RUT salen con
 * puntos y guion, las comunas con su grafía oficial, los bancos con su
 * nombre comercial y las direcciones con mayúsculas correctas. Así el
 * documento no depende de cómo se haya tipeado la ficha.
 */
export function buildVariables(
  user: CommercialUserAdminView,
  config: ContractConfig,
  contractNumber: string,
): Record<string, string> {
  const info = CONTRACT_TYPE_INFO[config.contractType];
  const fullName = normalizePersonName(user.name);
  const pct = Number(config.commissionPercentage) || 0;

  return {
    numero_contrato: contractNumber,
    tipo_contrato: info.label,
    fecha_contrato: formatLongDate(config.contractDate),
    ciudad: normalizePlace(config.city),
    nombre_completo: fullName,
    primer_nombre: fullName.split(/\s+/)[0] ?? "",
    rut_prestador: normalizeRutDisplay(user.rut),
    domicilio_prestador: normalizeAddress(user.address),
    comuna_prestador: normalizePlace(user.comuna),
    correo_personal: normalizeEmail(user.email),
    telefono: normalizePhone(user.phone),
    correo_corporativo: normalizeEmail(config.corporateEmail) || "Pendiente de asignación",
    cargo_funcional: text(config.functionalRole) || info.functionalRole,
    porcentaje_comision: String(pct),
    base_comision: text(config.commissionBase),
    fecha_inicio: formatLongDate(config.startDate) || formatLongDate(config.contractDate),
    dias_aviso_termino: String(config.noticeDays ?? ""),
    dias_cola_comisiones: String(config.commissionTailDays ?? ""),
    vigencia: text(config.validity).toLocaleLowerCase("es"),
    retencion_vigente: String(DEFAULT_RETENTION_PCT),
    anio_retencion: String(RETENTION_YEAR),
    ejemplo_base_comisionable: formatCLP(COMMISSION_EXAMPLE_BASE),
    ejemplo_comision_bruta: formatCLP(Math.round((COMMISSION_EXAMPLE_BASE * pct) / 100)),
    banco: normalizeBank(user.bank_name),
    tipo_cuenta: normalizeAccountType(user.bank_account_type),
    numero_cuenta: normalizeAccountNumber(user.bank_account_number),
    titular_cuenta: normalizePersonName(user.bank_account_holder) || fullName,
    rut_titular: normalizeRutDisplay(user.bank_account_rut) || normalizeRutDisplay(user.rut),
    razon_social_zyteron: CONTRACT_COMPANY.legalName,
    rut_zyteron: CONTRACT_COMPANY.rut,
    domicilio_zyteron: normalizeAddress(CONTRACT_COMPANY.address),
    comuna_zyteron: normalizePlace(CONTRACT_COMPANY.comuna),
    nombre_representante: normalizePersonName(config.representativeName),
    rut_representante: normalizeRutDisplay(config.representativeRut),
    correo_contractual_zyteron: normalizeEmail(CONTRACT_COMPANY.email),
    telefono_zyteron: normalizePhone(CONTRACT_COMPANY.phone),
    sitio_web_zyteron: CONTRACT_COMPANY.website,
  };
}

function field(
  label: string,
  value: string,
  options: { blocking?: boolean; state?: FieldState; message?: string } = {},
): ValidationField {
  const blocking = options.blocking ?? false;
  if (options.state) {
    return { label, value: value || "—", state: options.state, message: options.message, blocking };
  }
  return {
    label,
    value: value || "—",
    state: value ? "ok" : blocking ? "missing" : "review",
    message: value ? undefined : blocking ? "Obligatorio para emitir el documento." : "Sin informar.",
    blocking,
  };
}

/**
 * Revisión previa por secciones. Devuelve el estado de cada dato y la lista
 * de bloqueos: mientras exista uno, no se emite el PDF definitivo.
 */
export function validateContract(
  user: CommercialUserAdminView,
  config: ContractConfig,
  context: { hasIssuedContract?: boolean } = {},
): ContractValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const rutValid = isValidRut(text(user.rut));
  const emailValid = EMAIL_RE.test(text(user.email));
  const repRutValid = isValidRut(text(config.representativeRut));
  const pct = Number(config.commissionPercentage);
  const pctValid = Number.isFinite(pct) && pct > 0 && pct <= MAX_COMMISSION_PCT;
  const contractDateValid = DATE_RE.test(config.contractDate) && !Number.isNaN(new Date(config.contractDate).getTime());
  const startDateValid = !config.startDate || DATE_RE.test(config.startDate);
  const corporateEmail = text(config.corporateEmail);

  const sections: ValidationSection[] = [
    {
      id: "zyteron",
      title: "Datos de Zyteron",
      fields: [
        field("Razón social", CONTRACT_COMPANY.legalName, { blocking: true }),
        field("RUT", CONTRACT_COMPANY.rut, { blocking: true }),
        field("Domicilio", CONTRACT_COMPANY.address, { blocking: true }),
        field("Comuna", CONTRACT_COMPANY.comuna),
        field("Correo contractual", CONTRACT_COMPANY.email),
        field("Teléfono", CONTRACT_COMPANY.phone),
        field("Sitio web", CONTRACT_COMPANY.website),
        field("Representante legal", text(config.representativeName), { blocking: true }),
        field("RUT del representante", text(config.representativeRut), {
          blocking: true,
          state: !text(config.representativeRut) ? "missing" : repRutValid ? "ok" : "invalid",
          message: !text(config.representativeRut)
            ? "Obligatorio: sin él la comparecencia queda incompleta."
            : repRutValid
              ? undefined
              : "El RUT del representante no supera la validación del dígito verificador.",
        }),
      ],
    },
    {
      id: "prestador",
      title: "Datos del prestador",
      fields: [
        field("Nombre completo", text(user.name), { blocking: true }),
        field("RUT", text(user.rut), {
          blocking: true,
          state: !text(user.rut) ? "missing" : rutValid ? "ok" : "invalid",
          message: rutValid ? undefined : "RUT inválido según dígito verificador.",
        }),
        field("Domicilio", text(user.address), { blocking: true }),
        field("Comuna", text(user.comuna)),
        field("Región", text(user.region)),
        field("Correo personal", text(user.email), {
          blocking: true,
          state: !text(user.email) ? "missing" : emailValid ? "ok" : "invalid",
          message: emailValid ? undefined : "El correo personal no tiene formato válido.",
        }),
        field("Teléfono", text(user.phone), { blocking: true }),
        field("Cargo funcional", text(config.functionalRole), { blocking: true }),
        field("Fecha de incorporación", text(user.started_at)?.slice(0, 10)),
        field("Correo corporativo", corporateEmail, {
          state: !corporateEmail ? "review" : EMAIL_RE.test(corporateEmail) ? "ok" : "invalid",
          message: !corporateEmail
            ? "Aún no está creado. Se emitirá indicando que queda pendiente de asignación."
            : EMAIL_RE.test(corporateEmail)
              ? undefined
              : "El correo corporativo no tiene formato válido.",
        }),
      ],
    },
    {
      id: "condiciones",
      title: "Condiciones comerciales",
      fields: [
        field("Porcentaje de comisión", pctValid ? `${pct}%` : String(config.commissionPercentage ?? ""), {
          blocking: true,
          state: pctValid ? "ok" : "invalid",
          message: pctValid ? undefined : `Debe ser mayor a 0 y no superar el ${MAX_COMMISSION_PCT}% autorizado.`,
        }),
        field("Base de cálculo", text(config.commissionBase), { blocking: true }),
        field("Días de aviso de término", String(config.noticeDays ?? ""), { blocking: true }),
        field("Días de comisiones posteriores", String(config.commissionTailDays ?? ""), { blocking: true }),
        field("Vigencia", text(config.validity), { blocking: true }),
      ],
    },
    {
      id: "bancarios",
      title: "Datos bancarios",
      fields: [
        field("Banco", text(user.bank_name), { blocking: config.includeBankAnnex }),
        field("Tipo de cuenta", text(user.bank_account_type), { blocking: config.includeBankAnnex }),
        field("Número de cuenta", text(user.bank_account_number), { blocking: config.includeBankAnnex }),
        field("Titular", text(user.bank_account_holder) || text(user.name)),
        field("RUT del titular", text(user.bank_account_rut) || text(user.rut)),
        field("Correo para comprobantes", text(user.payment_email) || text(user.email)),
      ],
    },
    {
      id: "configuracion",
      title: "Configuración contractual",
      fields: [
        field("Tipo de contrato", CONTRACT_TYPE_INFO[config.contractType]?.label ?? "", { blocking: true }),
        field("Ciudad de firma", text(config.city), { blocking: true }),
        field("Fecha del contrato", text(config.contractDate), {
          blocking: true,
          state: contractDateValid ? "ok" : text(config.contractDate) ? "invalid" : "missing",
          message: contractDateValid ? undefined : "Fecha inválida.",
        }),
        field("Fecha de inicio", text(config.startDate), {
          state: startDateValid ? (config.startDate ? "ok" : "review") : "invalid",
          message: startDateValid ? undefined : "Fecha inválida.",
        }),
        field("Medio de firma", text(config.signatureMethod)),
        field("Anexo bancario", config.includeBankAnnex ? "Incluido" : "Excluido"),
        field("Observaciones", text(config.observations)),
      ],
    },
  ];

  for (const section of sections) {
    for (const item of section.fields) {
      if (!item.blocking) continue;
      if (item.state === "ok") continue;
      blockers.push(`${section.title} · ${item.label}: ${item.message ?? "dato pendiente"}`);
    }
  }

  if (!corporateEmail) {
    warnings.push("El correo corporativo todavía no está creado; el contrato lo indicará como pendiente de asignación.");
  }
  if (context.hasIssuedContract) {
    warnings.push("Esta persona ya tiene un contrato emitido. Al continuar se generará una nueva versión que reemplazará a la anterior.");
  }
  if (config.includeBankAnnex && !text(user.bank_account_number)) {
    warnings.push("El anexo bancario está activado pero la cuenta no está informada.");
  }
  if (text(user.rut) && rutValid && toSiiRut(text(user.rut)) !== text(user.rut)) {
    warnings.push(`El RUT del prestador se normalizará a ${toSiiRut(text(user.rut))} en el documento.`);
  }

  return { sections, blockers, warnings, canGenerate: blockers.length === 0 };
}

/**
 * Reemplaza las variables de un texto de plantilla.
 * Devuelve además las variables que quedaron sin resolver, para poder
 * detener la generación antes de emitir un documento con huecos.
 */
export function renderTemplateText(
  input: string,
  variables: Record<string, string>,
): { text: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const output = input.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = variables[name];
    if (value === undefined || value === "") {
      unresolved.push(name);
      return `{{${name}}}`;
    }
    return value;
  });
  return { text: output, unresolved: Array.from(new Set(unresolved)) };
}

/**
 * Comprueba que la plantilla y las variables sean coherentes antes de
 * dibujar el PDF: ninguna variable desconocida, ninguna obligatoria vacía.
 */
export function assertVariablesComplete(
  contractType: ContractTypeId,
  variables: Record<string, string>,
): { ok: true } | { ok: false; missing: string[] } {
  const template = CONTRACT_TEMPLATES[contractType];
  const used = new Set<string>();
  const collect = (value: string) => {
    for (const match of value.matchAll(/\{\{(\w+)\}\}/g)) used.add(match[1]);
  };

  collect(template.documentTitle);
  collect(template.subtitle);
  template.appearance.forEach(collect);
  template.clauses.forEach((clause) => {
    collect(clause.title);
    clause.paragraphs.forEach(collect);
  });
  template.closing.forEach(collect);

  const known = new Set<string>(CONTRACT_VARIABLES);
  const missing: string[] = [];

  for (const name of used) {
    if (!known.has(name)) {
      missing.push(`${name} (variable desconocida en la plantilla)`);
      continue;
    }
    if (!variables[name]) missing.push(name);
  }
  for (const name of REQUIRED_VARIABLES) {
    if (!variables[name] && !missing.includes(name)) missing.push(name);
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

import "server-only";

import * as XLSX from "xlsx";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createCompany,
  findDuplicate,
  isOptedOut,
  normalizeEmail,
  normalizePhone,
  normalizeRut,
} from "./repository";
import { SALES_EVENT_TYPES } from "./types";

/**
 * Importador de prospectos desde XLSX/CSV. Todo el proceso es código puro:
 * leer, mapear, validar y deduplicar no requiere IA y no consume presupuesto.
 */

/** Campos del CRM a los que se puede mapear una columna del archivo. */
export const IMPORT_FIELDS = [
  { key: "name", label: "Nombre empresa", required: true },
  { key: "legal_name", label: "Razón social" },
  { key: "tax_id", label: "RUT" },
  { key: "industry", label: "Rubro" },
  { key: "commune", label: "Comuna" },
  { key: "region", label: "Región" },
  { key: "website", label: "Sitio web" },
  { key: "primary_email", label: "Email principal" },
  { key: "phone", label: "Teléfono" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "contact_name", label: "Nombre contacto" },
  { key: "contact_role", label: "Cargo contacto" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "instagram_url", label: "Instagram" },
  { key: "detected_problem", label: "Problema detectado" },
  { key: "recommended_service", label: "Servicio recomendado" },
  { key: "potential", label: "Potencial" },
  { key: "notes", label: "Notas" },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

/** Sugiere un mapeo automático comparando encabezados normalizados. */
const HEADER_HINTS: Record<ImportFieldKey, string[]> = {
  name: ["nombre", "empresa", "razon", "company", "negocio"],
  legal_name: ["razon social", "razonsocial", "legal"],
  tax_id: ["rut", "tax", "identificacion"],
  industry: ["rubro", "industria", "sector", "giro", "categoria"],
  commune: ["comuna", "ciudad"],
  region: ["region", "provincia"],
  website: ["web", "sitio", "url", "pagina", "website"],
  primary_email: ["email", "correo", "mail", "e-mail"],
  phone: ["telefono", "fono", "phone", "celular"],
  whatsapp: ["whatsapp", "wsp", "wasap"],
  contact_name: ["contacto", "nombre contacto", "encargado", "responsable"],
  contact_role: ["cargo", "puesto", "rol"],
  linkedin_url: ["linkedin"],
  instagram_url: ["instagram", "ig"],
  detected_problem: ["problema", "dolor", "necesidad"],
  recommended_service: ["servicio", "recomendado", "solucion"],
  potential: ["potencial", "score", "prioridad"],
  notes: ["nota", "observacion", "comentario"],
};

function normalizeHeader(header: string) {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function suggestMapping(headers: string[]): Record<string, ImportFieldKey | ""> {
  const mapping: Record<string, ImportFieldKey | ""> = {};
  const used = new Set<ImportFieldKey>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    let matched: ImportFieldKey | "" = "";

    for (const [field, hints] of Object.entries(HEADER_HINTS) as [ImportFieldKey, string[]][]) {
      if (used.has(field)) continue;
      if (hints.some((hint) => normalized.includes(hint))) {
        matched = field;
        break;
      }
    }

    if (matched) used.add(matched);
    mapping[header] = matched;
  }

  return mapping;
}

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
  suggestedMapping: Record<string, ImportFieldKey | "">;
};

export function parseSpreadsheet(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("El archivo no contiene hojas de cálculo.");

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });

  if (raw.length === 0) throw new Error("La hoja está vacía.");

  const headers = Object.keys(raw[0] ?? {});
  const rows = raw.map((row) => {
    const clean: Record<string, string> = {};
    for (const key of headers) clean[key] = String(row[key] ?? "").trim();
    return clean;
  });

  return { headers, rows, suggestedMapping: suggestMapping(headers) };
}

export type RowValidation = {
  rowIndex: number;
  data: Record<string, string>;
  status: "VALIDO" | "DUPLICADO" | "SIN_EMAIL" | "INVALIDO" | "OPT_OUT";
  detail?: string;
  duplicateOf?: { id: string; name: string; matchedBy: string; status: string };
};

export type ImportPreview = {
  total: number;
  valid: number;
  duplicates: number;
  alreadyContacted: number;
  existingClients: number;
  withoutEmail: number;
  invalid: number;
  optedOut: number;
  byPotential: { ALTO: number; POTENCIAL: number; MEDIO: number; BAJO: number };
  rows: RowValidation[];
};

function mapRow(row: Record<string, string>, mapping: Record<string, ImportFieldKey | "">) {
  const mapped: Record<string, string> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue;
    const value = (row[header] ?? "").trim();
    if (value) mapped[field] = value;
  }
  return mapped;
}

function normalizePotential(value?: string): "BAJO" | "MEDIO" | "POTENCIAL" | "ALTO" {
  const raw = (value || "").trim().toUpperCase();
  if (raw.startsWith("ALT")) return "ALTO";
  if (raw.startsWith("POT")) return "POTENCIAL";
  if (raw.startsWith("BAJ")) return "BAJO";
  return "MEDIO";
}

/**
 * Analiza el archivo completo antes de importar nada. El administrador ve el
 * resultado y recién entonces confirma.
 */
export async function buildImportPreview(
  rows: Record<string, string>[],
  mapping: Record<string, ImportFieldKey | "">,
): Promise<ImportPreview> {
  const preview: ImportPreview = {
    total: rows.length,
    valid: 0,
    duplicates: 0,
    alreadyContacted: 0,
    existingClients: 0,
    withoutEmail: 0,
    invalid: 0,
    optedOut: 0,
    byPotential: { ALTO: 0, POTENCIAL: 0, MEDIO: 0, BAJO: 0 },
    rows: [],
  };

  for (let index = 0; index < rows.length; index += 1) {
    const mapped = mapRow(rows[index], mapping);
    const name = mapped.name?.trim();

    if (!name) {
      preview.invalid += 1;
      preview.rows.push({
        rowIndex: index,
        data: mapped,
        status: "INVALIDO",
        detail: "Falta el nombre de la empresa.",
      });
      continue;
    }

    const email = normalizeEmail(mapped.primary_email);

    if (await isOptedOut(email)) {
      preview.optedOut += 1;
      preview.rows.push({
        rowIndex: index,
        data: mapped,
        status: "OPT_OUT",
        detail: "Esta dirección pidió no recibir contacto.",
      });
      continue;
    }

    const duplicate = await findDuplicate({
      taxId: mapped.tax_id,
      email: mapped.primary_email,
      website: mapped.website,
      phone: mapped.phone,
      name,
    });

    if (duplicate) {
      preview.duplicates += 1;
      if (duplicate.company.status !== "NUEVO") preview.alreadyContacted += 1;
      if (duplicate.company.linked_client_id) preview.existingClients += 1;

      preview.rows.push({
        rowIndex: index,
        data: mapped,
        status: "DUPLICADO",
        detail: `Ya existe en el CRM (coincidencia por ${duplicate.matchedBy}).`,
        duplicateOf: {
          id: duplicate.company.id,
          name: duplicate.company.name,
          matchedBy: duplicate.matchedBy,
          status: duplicate.company.status,
        },
      });
      continue;
    }

    if (!email) {
      preview.withoutEmail += 1;
      preview.rows.push({
        rowIndex: index,
        data: mapped,
        status: "SIN_EMAIL",
        detail: "Se puede importar, pero no se le podrá enviar correo.",
      });
      preview.byPotential[normalizePotential(mapped.potential)] += 1;
      continue;
    }

    preview.valid += 1;
    preview.byPotential[normalizePotential(mapped.potential)] += 1;
    preview.rows.push({ rowIndex: index, data: mapped, status: "VALIDO" });
  }

  return preview;
}

export type ImportResult = {
  batchId: string;
  imported: number;
  skipped: number;
  errors: number;
};

/**
 * Importa las filas seleccionadas. Los duplicados nunca se importan ni se
 * contactan automáticamente: quedan registrados en el lote para trazabilidad.
 */
export async function executeImport(options: {
  fileName: string;
  mapping: Record<string, ImportFieldKey | "">;
  preview: ImportPreview;
  includeWithoutEmail: boolean;
  actor: string;
}): Promise<ImportResult> {
  const { supabase } = createSupabaseServerClient();

  const { data: batch, error: batchError } = await supabase
    .from("sales_import_batches")
    .insert({
      file_name: options.fileName,
      total_rows: options.preview.total,
      duplicate_rows: options.preview.duplicates,
      invalid_rows: options.preview.invalid,
      column_mapping: options.mapping,
      status: "PENDIENTE",
      created_by: options.actor,
    })
    .select("id")
    .single();

  if (batchError) throw new Error(batchError.message);
  const batchId = String(batch.id);

  const importable = options.preview.rows.filter(
    (row) => row.status === "VALIDO" || (options.includeWithoutEmail && row.status === "SIN_EMAIL"),
  );

  let imported = 0;
  let errors = 0;

  for (const row of importable) {
    try {
      await createCompany(
        {
          name: row.data.name,
          legal_name: row.data.legal_name ?? null,
          tax_id: normalizeRut(row.data.tax_id),
          industry: row.data.industry ?? null,
          commune: row.data.commune ?? null,
          region: row.data.region ?? null,
          website: row.data.website ?? null,
          primary_email: normalizeEmail(row.data.primary_email),
          phone: normalizePhone(row.data.phone) ? row.data.phone : null,
          whatsapp: row.data.whatsapp ?? null,
          contact_name: row.data.contact_name ?? null,
          contact_role: row.data.contact_role ?? null,
          linkedin_url: row.data.linkedin_url ?? null,
          instagram_url: row.data.instagram_url ?? null,
          detected_problem: row.data.detected_problem ?? null,
          recommended_service: row.data.recommended_service ?? null,
          potential: normalizePotential(row.data.potential),
          notes: row.data.notes ?? null,
          status: "NUEVO",
          source: "IMPORT",
          import_batch_id: batchId,
          owner_user: options.actor,
        },
        {
          actor: options.actor,
          eventType: SALES_EVENT_TYPES.COMPANY_IMPORTED,
          eventTitle: `Importada desde ${options.fileName}`,
        },
      );
      imported += 1;
    } catch {
      errors += 1;
    }
  }

  await supabase
    .from("sales_import_batches")
    .update({
      imported_rows: imported,
      status: errors > 0 && imported === 0 ? "ERROR" : "PROCESADO",
    })
    .eq("id", batchId);

  return {
    batchId,
    imported,
    skipped: options.preview.total - imported,
    errors,
  };
}

import { createHash } from "node:crypto";
import {
  CONTRACT_DEFAULTS,
  CONTRACT_TYPE_INFO,
  CONTRACT_COMPANY,
  isIssued,
  isSigned,
  templateForRole,
  type ContractTypeId,
} from "@/config/contracts";
import { CONTRACT_TEMPLATES } from "@/content/commercial-contracts";
import { recordAudit, notifyCommercialUser } from "@/lib/commercial/audit";
import {
  buildVariables,
  validateContract,
  type ContractConfig,
  type ContractValidation,
} from "@/lib/commercial/contract-model";
import { contractFileName, generateContractPdf } from "@/lib/commercial/contract-pdf";
import { commercialDb, getCommercialUserForAdmin, type CommercialUserAdminView } from "@/lib/commercial/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Ciclo de vida del contrato: borrador, emisión del PDF definitivo,
 * envío, recepción de la copia firmada, validación y versionado.
 *
 * Los documentos se guardan en un bucket privado y solo se entregan con
 * enlaces firmados de vigencia corta. Un contrato ya firmado nunca se
 * sobreescribe: se genera una versión nueva o un anexo.
 */

export const CONTRACT_BUCKET = "commercial-contracts";
const SIGNED_URL_TTL = 300; // 5 minutos

export type ContractRecord = {
  id: string;
  owner_id: string;
  contract_number: string | null;
  contract_type: string;
  profile_role: string;
  template_id: string;
  template_version: string;
  version: number;
  supersedes_id: string | null;
  origin: string;
  update_reason: string | null;
  updated_by: string | null;
  status: string;
  city: string | null;
  contract_date: string | null;
  start_date: string | null;
  functional_role: string | null;
  commission_percentage: number | null;
  commission_base: string | null;
  notice_days: number | null;
  commission_tail_days: number | null;
  validity: string | null;
  signature_method: string | null;
  corporate_email: string | null;
  include_bank_annex: boolean;
  observations: string | null;
  representative_name: string | null;
  representative_rut: string | null;
  snapshot: Record<string, unknown> | null;
  pdf_path: string | null;
  pdf_hash: string | null;
  pdf_filename: string | null;
  generated_by: string | null;
  generated_at: string | null;
  sent_at: string | null;
  sent_to: string | null;
  signed_pdf_path: string | null;
  signed_pdf_hash: string | null;
  signature_type: string | null;
  signed_at: string | null;
  received_by: string | null;
  signature_notes: string | null;
  validated_at: string | null;
  validated_by: string | null;
  rejection_reason: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailLog = {
  id: string;
  recipient: string;
  cc: string | null;
  subject: string;
  provider_message_id: string | null;
  status: string;
  error_message: string | null;
  attempt: number;
  sent_by: string | null;
  sent_at: string | null;
  created_at: string;
};

type Actor = { id: string; name?: string | null };

const TABLE = "commercial_contracts";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Configuración por defecto: ficha existente + valores predeterminados. */
export function defaultConfig(user: CommercialUserAdminView): ContractConfig {
  const contractType = templateForRole(user.role);
  const defaults = CONTRACT_DEFAULTS[contractType];
  return {
    contractType,
    // El lugar de celebración es el domicilio de Zyteron, para que coincida
    // con la comparecencia y con la cláusula de domicilio y jurisdicción.
    city: CONTRACT_COMPANY.city,
    contractDate: today(),
    startDate: user.started_at?.slice(0, 10) || today(),
    functionalRole: user.position?.trim() || CONTRACT_TYPE_INFO[contractType].functionalRole,
    commissionPercentage: Number(user.commission_pct) || defaults.commissionPercentage,
    commissionBase: defaults.commissionBase,
    noticeDays: defaults.noticeDays,
    commissionTailDays: defaults.commissionTailDays,
    validity: defaults.validity,
    signatureMethod: defaults.signatureMethod,
    corporateEmail: "",
    includeBankAnnex: true,
    observations: "",
    representativeName: CONTRACT_COMPANY.representativeName,
    representativeRut: CONTRACT_COMPANY.representativeRut,
  };
}

/** Configuración almacenada en un contrato, con respaldo en los valores por defecto. */
export function configFromRecord(record: ContractRecord, user: CommercialUserAdminView): ContractConfig {
  const base = defaultConfig(user);
  return {
    contractType: (record.contract_type as ContractTypeId) ?? base.contractType,
    city: record.city ?? base.city,
    contractDate: record.contract_date?.slice(0, 10) ?? base.contractDate,
    startDate: record.start_date?.slice(0, 10) ?? base.startDate,
    functionalRole: record.functional_role ?? base.functionalRole,
    commissionPercentage: Number(record.commission_percentage ?? base.commissionPercentage),
    commissionBase: record.commission_base ?? base.commissionBase,
    noticeDays: Number(record.notice_days ?? base.noticeDays),
    commissionTailDays: Number(record.commission_tail_days ?? base.commissionTailDays),
    validity: record.validity ?? base.validity,
    signatureMethod: record.signature_method ?? base.signatureMethod,
    corporateEmail: record.corporate_email ?? "",
    includeBankAnnex: record.include_bank_annex ?? true,
    observations: record.observations ?? "",
    representativeName: record.representative_name ?? base.representativeName,
    representativeRut: record.representative_rut ?? base.representativeRut,
  };
}

export async function listContracts(ownerId: string): Promise<ContractRecord[]> {
  const { data } = await commercialDb()
    .from(TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  return (data as ContractRecord[]) ?? [];
}

export async function getContract(id: string): Promise<ContractRecord | null> {
  const { data } = await commercialDb().from(TABLE).select("*").eq("id", id).maybeSingle();
  return (data as ContractRecord) ?? null;
}

export async function listEmailLogs(contractId: string): Promise<EmailLog[]> {
  const { data } = await commercialDb()
    .from("commercial_contract_email_logs")
    .select("id,recipient,cc,subject,provider_message_id,status,error_message,attempt,sent_by,sent_at,created_at")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });
  return (data as EmailLog[]) ?? [];
}

/** El contrato vigente de la persona (el que no fue reemplazado ni anulado). */
export function activeContract(contracts: ContractRecord[]): ContractRecord | null {
  return (
    contracts.find((item) => !["superseded", "cancelled", "terminated", "rejected"].includes(item.status)) ?? null
  );
}

export type ContractContext = {
  user: CommercialUserAdminView;
  contracts: ContractRecord[];
  active: ContractRecord | null;
  config: ContractConfig;
  validation: ContractValidation;
  emails: EmailLog[];
  templateLabel: string;
};

/** Todo lo que la ficha necesita para pintar la sección de contrato. */
export async function getContractContext(ownerId: string): Promise<ContractContext | null> {
  const user = await getCommercialUserForAdmin(ownerId);
  if (!user) return null;

  const contracts = await listContracts(ownerId);
  const active = activeContract(contracts);
  const config = active ? configFromRecord(active, user) : defaultConfig(user);
  const validation = validateContract(user, config, {
    hasIssuedContract: Boolean(active && isIssued(active.status)),
  });
  const emails = active ? await listEmailLogs(active.id) : [];

  return {
    user,
    contracts,
    active,
    config,
    validation,
    emails,
    templateLabel: CONTRACT_TYPE_INFO[config.contractType].label,
  };
}

function configToRow(config: ContractConfig) {
  return {
    contract_type: config.contractType,
    city: config.city?.trim() || null,
    contract_date: config.contractDate || null,
    start_date: config.startDate || null,
    functional_role: config.functionalRole?.trim() || null,
    commission_percentage: Number(config.commissionPercentage) || 0,
    commission_base: config.commissionBase?.trim() || null,
    notice_days: Number(config.noticeDays) || 0,
    commission_tail_days: Number(config.commissionTailDays) || 0,
    validity: config.validity?.trim() || null,
    signature_method: config.signatureMethod?.trim() || null,
    corporate_email: config.corporateEmail?.trim() || null,
    include_bank_annex: Boolean(config.includeBankAnnex),
    observations: config.observations?.trim() || null,
    representative_name: config.representativeName?.trim() || null,
    representative_rut: config.representativeRut?.trim() || null,
  };
}

/**
 * Guarda (o crea) el borrador con la configuración del administrador.
 * Nunca toca un documento ya emitido: para eso se genera una versión nueva.
 */
export async function saveDraft(
  actor: Actor,
  ownerId: string,
  config: ContractConfig,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await getCommercialUserForAdmin(ownerId);
  if (!user) return { ok: false, error: "El usuario comercial no existe." };

  const contracts = await listContracts(ownerId);
  const active = activeContract(contracts);
  if (active && isIssued(active.status)) {
    return {
      ok: false,
      error: "El contrato vigente ya fue emitido. Genera una nueva versión para modificar sus condiciones.",
    };
  }

  const template = CONTRACT_TEMPLATES[config.contractType];
  const row = {
    owner_id: ownerId,
    profile_role: user.role,
    template_id: template.id,
    template_version: template.version,
    status: "draft",
    ...configToRow(config),
  };

  const previousType = active?.contract_type;
  let id = active?.id;

  if (active) {
    const { error } = await commercialDb().from(TABLE).update(row).eq("id", active.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await commercialDb()
      .from(TABLE)
      .insert({ ...row, version: 1, created_by: actor.id })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    id = data.id as string;
  }

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: id,
    entityLabel: user.name,
    action: active ? "draft_updated" : "draft_created",
    summary: active
      ? `Se actualizó el borrador de contrato de ${user.name}.`
      : `Se creó el borrador de contrato de ${user.name} (${CONTRACT_TYPE_INFO[config.contractType].label}).`,
    meta: { config: configToRow(config) },
    ownerId,
  });

  if (previousType && previousType !== config.contractType) {
    await recordAudit({
      actorId: actor.id,
      actorName: actor.name ?? null,
      entity: "contract",
      entityId: id,
      entityLabel: user.name,
      action: "template_changed",
      summary: `Se cambió manualmente la plantilla de "${CONTRACT_TYPE_INFO[previousType as ContractTypeId]?.label ?? previousType}" a "${CONTRACT_TYPE_INFO[config.contractType].label}".`,
      meta: { from: previousType, to: config.contractType },
      ownerId,
    });
  }

  return { ok: true, id };
}

/** Correlativo por tipo y año: ZY-EC-2026-00001. */
async function nextContractNumber(contractType: ContractTypeId): Promise<string> {
  const prefix = `ZY-${CONTRACT_TYPE_INFO[contractType].numberPrefix}-${new Date().getFullYear()}`;
  const { data } = await commercialDb()
    .from(TABLE)
    .select("contract_number")
    .like("contract_number", `${prefix}-%`)
    .order("contract_number", { ascending: false })
    .limit(1);

  const last = (data as Array<{ contract_number: string }> | null)?.[0]?.contract_number;
  const sequence = last ? Number(last.split("-").pop()) + 1 : 1;
  return `${prefix}-${String(sequence).padStart(5, "0")}`;
}

async function ensureBucket() {
  const { supabase } = createSupabaseServerClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!(buckets ?? []).some((bucket) => bucket.name === CONTRACT_BUCKET)) {
    await supabase.storage.createBucket(CONTRACT_BUCKET, { public: false });
  }
  return supabase;
}

/** Vista previa: genera el PDF con marca de agua y no persiste nada. */
export async function previewPdf(
  ownerId: string,
  config: ContractConfig,
): Promise<{ ok: true; bytes: Uint8Array; filename: string } | { ok: false; error: string }> {
  try {
    const user = await getCommercialUserForAdmin(ownerId);
    if (!user) return { ok: false, error: "El usuario comercial no existe." };

    const variables = buildVariables(user, config, "BORRADOR");
    const bytes = await generateContractPdf({ config, variables, contractNumber: "BORRADOR", draft: true });
    return {
      ok: true,
      bytes,
      filename: `Borrador_${contractFileName(config.contractType, user.name, new Date().getFullYear())}`,
    };
  } catch (cause) {
    // Incluye la base de datos mal configurada: mejor un mensaje legible que
    // un error 500 sin explicación en pantalla.
    return { ok: false, error: cause instanceof Error ? cause.message : "No se pudo generar la vista previa." };
  }
}

/**
 * Emite el documento definitivo: valida, numera, genera, calcula el hash
 * y lo guarda en almacenamiento privado.
 */
export async function issueContract(
  actor: Actor,
  contractId: string,
): Promise<{ ok: boolean; error?: string; number?: string }> {
  const record = await getContract(contractId);
  if (!record) return { ok: false, error: "Contrato no encontrado." };
  if (isIssued(record.status)) {
    return { ok: false, error: "Este contrato ya fue emitido. Genera una nueva versión si necesitas cambiarlo." };
  }

  const user = await getCommercialUserForAdmin(record.owner_id);
  if (!user) return { ok: false, error: "El usuario comercial no existe." };

  const config = configFromRecord(record, user);
  const validation = validateContract(user, config);
  if (!validation.canGenerate) {
    return { ok: false, error: `Faltan datos obligatorios: ${validation.blockers[0]}` };
  }

  const number = record.contract_number ?? (await nextContractNumber(config.contractType));
  const variables = buildVariables(user, config, number);

  let bytes: Uint8Array;
  try {
    bytes = await generateContractPdf({ config, variables, contractNumber: number });
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "No se pudo generar el documento." };
  }

  const filename = contractFileName(config.contractType, user.name, new Date().getFullYear());
  const storagePath = `${record.owner_id}/${record.id}/v${record.version}-original.pdf`;
  const hash = sha256(bytes);

  try {
    const supabase = await ensureBucket();
    const upload = await supabase.storage
      .from(CONTRACT_BUCKET)
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
    if (upload.error) return { ok: false, error: `No se pudo guardar el documento: ${upload.error.message}` };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "Almacenamiento no disponible." };
  }

  const template = CONTRACT_TEMPLATES[config.contractType];
  const { error } = await commercialDb()
    .from(TABLE)
    .update({
      contract_number: number,
      status: "generated",
      template_id: template.id,
      template_version: template.version,
      snapshot: { variables, config: configToRow(config) },
      pdf_path: storagePath,
      pdf_hash: hash,
      pdf_filename: filename,
      generated_by: actor.id,
      generated_at: new Date().toISOString(),
    })
    .eq("id", contractId);
  if (error) return { ok: false, error: error.message };

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: contractId,
    entityLabel: `${number} · ${user.name}`,
    action: "generated",
    summary: `Se emitió el documento ${number} (${template.id} v${template.version}) para ${user.name}. Hash SHA-256 ${hash.slice(0, 16)}…`,
    meta: { number, hash, template: template.id, templateVersion: template.version },
    ownerId: record.owner_id,
  });

  return { ok: true, number };
}

/** Descarga del documento con enlace firmado de vigencia corta. */
export async function contractFileUrl(
  actor: Actor,
  contractId: string,
  kind: "original" | "signed",
): Promise<{ ok: true; url: string; filename: string } | { ok: false; error: string }> {
  const record = await getContract(contractId);
  if (!record) return { ok: false, error: "Contrato no encontrado." };

  const storagePath = kind === "signed" ? record.signed_pdf_path : record.pdf_path;
  if (!storagePath) {
    return { ok: false, error: kind === "signed" ? "Todavía no se ha subido la copia firmada." : "El documento aún no se genera." };
  }

  const { supabase } = createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(CONTRACT_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? "No se pudo generar el enlace de descarga." };
  }

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: contractId,
    entityLabel: record.contract_number ?? contractId,
    action: kind === "signed" ? "signed_downloaded" : "downloaded",
    summary: `Se descargó ${kind === "signed" ? "la copia firmada" : "el documento"} ${record.contract_number ?? ""}.`,
    ownerId: record.owner_id,
  });

  const filename =
    kind === "signed"
      ? `Firmado_${record.pdf_filename ?? "contrato.pdf"}`
      : record.pdf_filename ?? "contrato.pdf";
  return { ok: true, url: data.signedUrl, filename };
}

/** Descarga los bytes del documento (para adjuntarlo a un correo). */
export async function contractFileBytes(storagePath: string): Promise<Uint8Array | null> {
  const { supabase } = createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(CONTRACT_BUCKET).download(storagePath);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/** Registra la copia firmada que envió el prestador. */
export async function uploadSignedContract(
  actor: Actor,
  contractId: string,
  file: { bytes: Uint8Array; contentType: string },
  meta: { signedAt: string; signatureType: string; notes?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const record = await getContract(contractId);
  if (!record) return { ok: false, error: "Contrato no encontrado." };
  if (!isIssued(record.status)) return { ok: false, error: "Primero debes emitir el documento definitivo." };
  if (record.status === "validated") {
    return { ok: false, error: "La firma de este contrato ya fue validada. Genera un anexo si necesitas cambiarlo." };
  }
  if (file.contentType !== "application/pdf") {
    return { ok: false, error: "La copia firmada debe ser un archivo PDF." };
  }

  const storagePath = `${record.owner_id}/${record.id}/v${record.version}-firmado.pdf`;
  const hash = sha256(file.bytes);

  try {
    const supabase = await ensureBucket();
    const upload = await supabase.storage
      .from(CONTRACT_BUCKET)
      .upload(storagePath, file.bytes, { contentType: "application/pdf", upsert: true });
    if (upload.error) return { ok: false, error: `No se pudo guardar el archivo: ${upload.error.message}` };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "Almacenamiento no disponible." };
  }

  const { error } = await commercialDb()
    .from(TABLE)
    .update({
      signed_pdf_path: storagePath,
      signed_pdf_hash: hash,
      signature_type: meta.signatureType,
      signed_at: meta.signedAt,
      signature_notes: meta.notes?.trim() || null,
      received_by: actor.id,
      status: "signed_pending",
      rejection_reason: null,
    })
    .eq("id", contractId);
  if (error) return { ok: false, error: error.message };

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: contractId,
    entityLabel: record.contract_number ?? contractId,
    action: "signed_uploaded",
    summary: `Se registró la copia firmada de ${record.contract_number ?? "el contrato"} (${meta.signatureType}). Hash SHA-256 ${hash.slice(0, 16)}…`,
    meta: { hash, signatureType: meta.signatureType },
    ownerId: record.owner_id,
  });
  return { ok: true };
}

/** Validación o rechazo de la firma recibida. */
export async function reviewSignature(
  actor: Actor,
  contractId: string,
  decision: "validate" | "reject",
  reason?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const record = await getContract(contractId);
  if (!record) return { ok: false, error: "Contrato no encontrado." };
  if (!record.signed_pdf_path) return { ok: false, error: "Todavía no se ha registrado una copia firmada." };
  if (decision === "reject" && !reason?.trim()) {
    return { ok: false, error: "Indica el motivo del rechazo para que el prestador pueda corregirlo." };
  }

  const now = new Date().toISOString();
  const { error } = await commercialDb()
    .from(TABLE)
    .update(
      decision === "validate"
        ? { status: "validated", validated_at: now, validated_by: actor.id, rejection_reason: null }
        : { status: "rejected", rejection_reason: reason?.trim() ?? null, validated_at: null, validated_by: null },
    )
    .eq("id", contractId);
  if (error) return { ok: false, error: error.message };

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: contractId,
    entityLabel: record.contract_number ?? contractId,
    action: decision === "validate" ? "signature_validated" : "signature_rejected",
    summary:
      decision === "validate"
        ? `Se validó la firma de ${record.contract_number ?? "el contrato"}. La persona queda formalmente habilitada.`
        : `Se rechazó la firma de ${record.contract_number ?? "el contrato"}: ${reason?.trim()}`,
    ownerId: record.owner_id,
  });

  await notifyCommercialUser({
    ownerId: record.owner_id,
    kind: decision === "validate" ? "success" : "warning",
    title: decision === "validate" ? "Tu contrato quedó validado" : "Tu contrato firmado necesita corrección",
    body:
      decision === "validate"
        ? "Zyteron revisó y aceptó tu contrato firmado. Ya estás habilitado formalmente."
        : `Motivo: ${reason?.trim()}`,
  });
  return { ok: true };
}

/**
 * Actualiza el convenio con los datos vigentes del Partner y la última
 * plantilla oficial. Es la única vía para reemitir un documento.
 *
 *  · No firmado  → conserva el número del convenio y sube la versión
 *    documental (v1 → v2). La versión anterior queda en el historial.
 *  · Ya firmado  → el documento firmado no se toca. Se emite un convenio
 *    nuevo, con identificador propio, enlazado al anterior y pendiente de
 *    firma.
 *
 * En ambos casos se releen los datos desde la ficha, se revalidan y se
 * genera un PDF nuevo con su propio hash. Nunca se reutiliza el anterior.
 */
export async function updateContract(
  actor: Actor,
  contractId: string,
  reason: string,
): Promise<
  | { ok: true; id: string; number: string; version: number; mode: "updated" | "amended" }
  | { ok: false; error: string }
> {
  const record = await getContract(contractId);
  if (!record) return { ok: false, error: "Contrato no encontrado." };
  if (!reason?.trim()) return { ok: false, error: "Indica el motivo de la actualización." };

  // Datos frescos de la ficha: nombre, RUT, domicilio, correo, teléfono,
  // denominación funcional, comisión, banco, cuenta y fecha de vigencia.
  const user = await getCommercialUserForAdmin(record.owner_id);
  if (!user) return { ok: false, error: "El usuario comercial no existe." };

  const signed = isSigned(record.status);
  const fresh = defaultConfig(user);
  const config: ContractConfig = {
    ...fresh,
    // Decisiones administrativas que no viven en la ficha se conservan.
    contractType: (record.contract_type as ContractTypeId) ?? fresh.contractType,
    city: record.city ?? fresh.city,
    contractDate: today(),
    commissionBase: record.commission_base ?? fresh.commissionBase,
    noticeDays: Number(record.notice_days ?? fresh.noticeDays),
    commissionTailDays: Number(record.commission_tail_days ?? fresh.commissionTailDays),
    validity: record.validity ?? fresh.validity,
    signatureMethod: record.signature_method ?? fresh.signatureMethod,
    corporateEmail: record.corporate_email ?? "",
    includeBankAnnex: record.include_bank_annex ?? true,
    observations: record.observations ?? "",
    representativeName: record.representative_name ?? fresh.representativeName,
    representativeRut: record.representative_rut ?? fresh.representativeRut,
  };

  const validation = validateContract(user, config);
  if (!validation.canGenerate) {
    return { ok: false, error: `No se puede actualizar: ${validation.blockers[0]}` };
  }

  const template = CONTRACT_TEMPLATES[config.contractType];
  const mode: "updated" | "amended" = signed ? "amended" : "updated";
  // Firmado: identificador propio. No firmado: mismo número, versión nueva.
  const number = signed ? await nextContractNumber(config.contractType) : record.contract_number;
  const version = signed ? 1 : record.version + 1;

  const { data, error } = await commercialDb()
    .from(TABLE)
    .insert({
      owner_id: record.owner_id,
      profile_role: user.role,
      template_id: template.id,
      template_version: template.version,
      version,
      supersedes_id: record.id,
      contract_number: number,
      status: "draft",
      origin: mode,
      update_reason: reason.trim(),
      created_by: actor.id,
      updated_by: actor.id,
      ...configToRow(config),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  const newId = data.id as string;

  // El anterior sale de circulación, pero se conserva íntegro en el
  // historial: su PDF, su hash y su firma no se modifican ni se borran.
  await commercialDb().from(TABLE).update({ status: "superseded" }).eq("id", contractId);

  const issued = await issueContract(actor, newId);
  if (!issued.ok) {
    // Si la emisión falla se revierte para no dejar dos documentos vigentes.
    await commercialDb().from(TABLE).delete().eq("id", newId);
    await commercialDb().from(TABLE).update({ status: record.status }).eq("id", contractId);
    return { ok: false, error: issued.error ?? "No se pudo generar el documento actualizado." };
  }

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: newId,
    entityLabel: `${issued.number ?? number} v${version}`,
    action: signed ? "amended" : "updated",
    summary: signed
      ? `Se emitió el documento modificatorio ${issued.number} para ${user.name}, porque el convenio ${record.contract_number ?? ""} ya estaba firmado y no puede alterarse. Motivo: ${reason.trim()}`
      : `Se actualizó el convenio ${record.contract_number ?? ""} a la versión ${version} con los datos vigentes de ${user.name} y la plantilla ${template.id} v${template.version}. Motivo: ${reason.trim()}`,
    meta: {
      supersedes: record.id,
      previousVersion: record.version,
      version,
      templateVersion: template.version,
      mode,
      reason: reason.trim(),
    },
    ownerId: record.owner_id,
  });

  if (signed) {
    await notifyCommercialUser({
      ownerId: record.owner_id,
      kind: "warning",
      title: "Se emitió un documento modificatorio de tu convenio",
      body: "Tu convenio firmado se mantiene sin cambios. Recibirás un documento nuevo que también requiere firma.",
    });
  }

  return { ok: true, id: newId, number: issued.number ?? String(number), version, mode };
}

/** Anulación o cierre del vínculo. Conserva el documento para auditoría. */
export async function closeContract(
  actor: Actor,
  contractId: string,
  mode: "cancel" | "terminate",
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const record = await getContract(contractId);
  if (!record) return { ok: false, error: "Contrato no encontrado." };
  if (!reason?.trim()) return { ok: false, error: "Indica el motivo." };
  if (mode === "cancel" && isSigned(record.status)) {
    return { ok: false, error: "Un contrato firmado no se anula: debe finalizarse la relación o generarse un anexo." };
  }

  const now = new Date().toISOString();
  const { error } = await commercialDb()
    .from(TABLE)
    .update(
      mode === "cancel"
        ? { status: "cancelled", rejection_reason: reason.trim() }
        : { status: "terminated", terminated_at: now, termination_reason: reason.trim() },
    )
    .eq("id", contractId);
  if (error) return { ok: false, error: error.message };

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: contractId,
    entityLabel: record.contract_number ?? contractId,
    action: mode === "cancel" ? "cancelled" : "terminated",
    summary:
      mode === "cancel"
        ? `Se anuló el contrato ${record.contract_number ?? ""}. Motivo: ${reason.trim()}`
        : `Se finalizó la relación contractual ${record.contract_number ?? ""}. Motivo: ${reason.trim()}`,
    ownerId: record.owner_id,
  });
  return { ok: true };
}

/** Deja constancia de que el prestador confirmó la recepción. */
export async function markReceived(actor: Actor, contractId: string): Promise<{ ok: boolean; error?: string }> {
  const record = await getContract(contractId);
  if (!record) return { ok: false, error: "Contrato no encontrado." };
  const { error } = await commercialDb().from(TABLE).update({ status: "received" }).eq("id", contractId);
  if (error) return { ok: false, error: error.message };
  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: contractId,
    entityLabel: record.contract_number ?? contractId,
    action: "received",
    summary: `Se registró la recepción del contrato ${record.contract_number ?? ""} por parte del prestador.`,
    ownerId: record.owner_id,
  });
  return { ok: true };
}

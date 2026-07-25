import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiiEnvironment } from "@/lib/dte/constants";
import { parseCafMetadata } from "@/lib/dte/caf";
import { encryptSecret } from "@/lib/sii/crypto";

/**
 * Acceso (service role) a las tablas tax_* para el módulo Contador/Auditor.
 * Solo backend. Lecturas para el dashboard y gestión de CAF/certificado.
 */

function db() {
  return createSupabaseServerClient().supabase.schema("public");
}

const clp = (n: number) => Math.round(Number(n) || 0);

export async function getDteSummary() {
  const environment = getSiiEnvironment();
  const supabase = db();
  const [docsRes, cafRes, certRes] = await Promise.all([
    supabase.from("tax_documents").select("document_type,internal_status,sii_status,commercial_status,net_amount,exempt_amount,tax_amount,total_amount").eq("environment", environment),
    supabase.from("tax_caf_files").select("document_type,range_start,range_end,current_folio,status").eq("environment", environment),
    supabase.from("tax_certificates").select("status,valid_to,holder_name").eq("environment", environment).order("created_at", { ascending: false }).limit(1),
  ]);

  const docs = (docsRes.data as Record<string, number | string>[]) ?? [];
  const caf = (cafRes.data as Record<string, number | string>[]) ?? [];
  const cert = (certRes.data as Record<string, string>[])?.[0] ?? null;

  const netTotal = docs.reduce((a, d) => a + (Number(d.net_amount) || 0), 0);
  const ivaTotal = docs.reduce((a, d) => a + (Number(d.tax_amount) || 0), 0);
  const exemptTotal = docs.reduce((a, d) => a + (Number(d.exempt_amount) || 0), 0);
  const grandTotal = docs.reduce((a, d) => a + (Number(d.total_amount) || 0), 0);

  const byInternal: Record<string, number> = {};
  const bySii: Record<string, number> = {};
  const byCommercial: Record<string, number> = {};
  for (const d of docs) {
    byInternal[String(d.internal_status)] = (byInternal[String(d.internal_status)] || 0) + 1;
    bySii[String(d.sii_status)] = (bySii[String(d.sii_status)] || 0) + 1;
    byCommercial[String(d.commercial_status)] = (byCommercial[String(d.commercial_status)] || 0) + 1;
  }

  const foliosDisponibles = caf
    .filter((c) => c.status === "active")
    .reduce((a, c) => a + Math.max(0, Number(c.range_end) - Number(c.current_folio)), 0);

  let certStatus: string = "no_cargado";
  let certDaysToExpire: number | null = null;
  if (cert) {
    certStatus = cert.status;
    if (cert.valid_to) {
      certDaysToExpire = Math.round((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
    }
  }

  return {
    environment,
    totals: { net: netTotal, iva: ivaTotal, exempt: exemptTotal, grand: grandTotal, count: docs.length },
    byInternal,
    bySii,
    byCommercial,
    foliosDisponibles,
    cafActivos: caf.filter((c) => c.status === "active").length,
    certificate: { status: certStatus, daysToExpire: certDaysToExpire, holder: cert?.holder_name ?? null },
  };
}

export async function listDteDocuments(limit = 100) {
  const environment = getSiiEnvironment();
  const { data } = await db()
    .from("tax_documents")
    .select("id,document_type,folio,net_amount,tax_amount,total_amount,internal_status,sii_status,commercial_status,quote_id,work_order_id,created_at,observations")
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getDteDocument(id: string) {
  const supabase = db();
  const { data: doc } = await supabase.from("tax_documents").select("*").eq("id", id).maybeSingle();
  if (!doc) return null;
  const [{ data: items }, { data: refs }, { data: history }] = await Promise.all([
    supabase.from("tax_document_items").select("*").eq("document_id", id).order("line_number"),
    supabase.from("tax_document_references").select("*").eq("document_id", id),
    supabase.from("tax_document_status_history").select("*").eq("document_id", id).order("created_at", { ascending: false }),
  ]);
  return { document: doc, items: items ?? [], references: refs ?? [], history: history ?? [] };
}

export async function uploadCaf(input: { xml: string; uploadedBy?: string | null }) {
  const environment = getSiiEnvironment();
  const meta = parseCafMetadata(input.xml);
  if (!meta.valid || !meta.documentType || meta.rangeStart == null || meta.rangeEnd == null) {
    return { ok: false as const, error: `CAF inválido: ${meta.errors.join(" ") || "estructura no reconocida"}` };
  }
  const { data, error } = await db()
    .from("tax_caf_files")
    .insert({
      environment,
      document_type: meta.documentType,
      caf_xml: input.xml,
      range_start: meta.rangeStart,
      range_end: meta.rangeEnd,
      current_folio: meta.rangeStart - 1,
      issued_at: meta.issuedAt,
      status: "active",
      uploaded_by: input.uploadedBy ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data.id, meta };
}

export async function listCaf() {
  const environment = getSiiEnvironment();
  const { data } = await db()
    .from("tax_caf_files")
    .select("id,document_type,range_start,range_end,current_folio,status,issued_at,created_at")
    .eq("environment", environment)
    .order("created_at", { ascending: false });
  return (data ?? []).map((c: Record<string, number | string>) => {
    const total = Number(c.range_end) - Number(c.range_start) + 1;
    const used = Number(c.current_folio) - (Number(c.range_start) - 1);
    const available = Number(c.range_end) - Number(c.current_folio);
    return { ...c, total, used: Math.max(0, used), available: Math.max(0, available), pct: total > 0 ? Math.round((available / total) * 100) : 0 };
  });
}

export async function saveCertificateMeta(input: {
  password: string;
  fileName?: string | null;
  uploadedBy?: string | null;
}) {
  const environment = getSiiEnvironment();
  // Ciframos la contraseña en reposo (AES-256-GCM). Nunca en texto plano.
  let enc: { ciphertext: string; iv: string; tag: string };
  try {
    enc = encryptSecret(input.password);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "No se pudo cifrar la contraseña (falta SII_ENCRYPTION_KEY)." };
  }
  const { data, error } = await db()
    .from("tax_certificates")
    .insert({
      environment,
      status: "valid",
      password_ciphertext: enc.ciphertext,
      password_iv: enc.iv,
      password_tag: enc.tag,
      storage_path: input.fileName ? `cert:${input.fileName}` : null,
      uploaded_by: input.uploadedBy ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data.id };
}

export async function getCertificateStatus() {
  const environment = getSiiEnvironment();
  const { data } = await db()
    .from("tax_certificates")
    .select("id,holder_name,holder_rut,issuer,serial_number,valid_from,valid_to,status,created_at")
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Confirma un borrador: valida datos mínimos y asigna folio de forma
 * TRANSACCIONAL (assign_next_folio). NO firma ni envía al SII (esa es la etapa
 * criptográfica de la Fase 2, que requiere certificado + integración).
 */
export async function confirmDteDocument(id: string, actor?: string | null) {
  const supabase = db();
  const { data: doc } = await supabase.from("tax_documents").select("*").eq("id", id).maybeSingle();
  if (!doc) return { ok: false as const, error: "Documento no encontrado." };
  if (doc.internal_status !== "draft" && doc.internal_status !== "pending_approval") {
    return { ok: false as const, error: "El documento ya fue procesado." };
  }
  if ((Number(doc.total_amount) || 0) <= 0) {
    return { ok: false as const, error: "El total debe ser mayor a 0." };
  }

  // Asignación transaccional de folio (real, anti-duplicado).
  let folio: number | null = null;
  try {
    const { data: folioData, error: folioErr } = await supabase.rpc("assign_next_folio", {
      p_document_type: doc.document_type,
      p_environment: doc.environment,
    });
    if (folioErr) {
      return { ok: false as const, error: `No hay folios disponibles (CAF) para el tipo ${doc.document_type}. Carga un CAF válido.` };
    }
    folio = Number(folioData);
  } catch {
    return { ok: false as const, error: "No se pudo asignar folio. ¿Cargaste un CAF válido para este tipo de documento?" };
  }

  await supabase
    .from("tax_documents")
    .update({ folio, internal_status: "validated", approved_by: actor ?? null })
    .eq("id", id);
  await supabase.from("tax_document_status_history").insert({
    document_id: id,
    status_kind: "internal",
    status_value: "validated",
    detail: `Validado y folio ${folio} asignado. Pendiente firma y envío al SII (Fase 2).`,
    actor: actor ?? "system",
  });

  return {
    ok: true as const,
    folio,
    note: "Documento validado y folio asignado. La firma y el envío al SII requieren completar la configuración tributaria (certificado + integración).",
  };
}

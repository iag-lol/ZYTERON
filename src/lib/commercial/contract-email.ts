import { siteConfig } from "@/config/site";
import { CONTRACT_COMPANY, CONTRACT_TYPE_INFO, type ContractTypeId } from "@/config/contracts";
import { recordAudit } from "@/lib/commercial/audit";
import { commercialDb } from "@/lib/commercial/store";
import { contractFileBytes, getContract, type ContractRecord } from "@/lib/commercial/contracts";

/**
 * Envío del contrato por correo con el PDF adjunto.
 *
 * Cada intento queda registrado en `commercial_contract_email_logs` con el
 * identificador del proveedor o el error devuelto. Un envío fallido nunca
 * marca el contrato como enviado.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTRACT_EMAIL_SUBJECT =
  "Contrato de prestación de servicios comerciales independientes – Zyteron";

export const PARTNER_EMAIL_SUBJECT =
  "Convenio de colaboración comercial independiente – Zyteron";

/** Texto por defecto. El administrador puede editarlo antes de enviar. */
export function defaultEmailBody(input: {
  firstName: string;
  functionalRole: string;
  contractType: ContractTypeId;
}): string {
  const documentName =
    input.contractType === "partner_agreement"
      ? "convenio de colaboración comercial independiente"
      : "contrato de prestación de servicios comerciales independientes";

  return `Hola ${input.firstName}:

Adjunto encontrarás el ${documentName} correspondiente a tu incorporación como ${input.functionalRole} de ${CONTRACT_COMPANY.legalName}.

El documento contiene las condiciones de la prestación, el funcionamiento del proceso comercial, el registro de clientes, el cálculo de comisiones, el uso del portal y las obligaciones de confidencialidad.

Te pedimos revisar cuidadosamente:

- Tus datos personales.
- Tu RUT.
- Tu domicilio.
- El porcentaje de comisión.
- Las condiciones de pago.
- Los datos bancarios incluidos en el anexo.
- Las obligaciones y límites de actuación.

Si la información está correcta, firma el documento y responde este mismo correo adjuntando la copia firmada.

Una vez que Zyteron reciba y valide el contrato firmado, se habilitarán tu correo corporativo y tu acceso personal al portal comercial. Estas serán las únicas herramientas que Zyteron proporciona: el computador, la conexión a internet, el teléfono y los demás medios de trabajo son propios.

Si detectas algún dato incorrecto, no firmes el documento. Responde este correo indicando qué información debe corregirse.

Saludos,

${siteConfig.representative.name}
${siteConfig.representative.role}
${CONTRACT_COMPANY.legalName}
${CONTRACT_COMPANY.email}
${CONTRACT_COMPANY.phone}
${CONTRACT_COMPANY.website}`;
}

export function defaultSubject(contractType: ContractTypeId): string {
  return contractType === "partner_agreement" ? PARTNER_EMAIL_SUBJECT : CONTRACT_EMAIL_SUBJECT;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toHtml(body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:26px 12px;"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border:1px solid #dde3ec;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0f5fff;padding:18px 24px;color:#fff;font-size:13px;font-weight:bold;letter-spacing:0.08em;">${escapeHtml(CONTRACT_COMPANY.legalName.toUpperCase())}</td></tr>
<tr><td style="padding:24px;font-size:14px;line-height:1.65;color:#243044;">${paragraphs}</td></tr>
<tr><td style="background:#f8fafc;padding:14px 24px;font-size:11px;color:#64748b;">Este mensaje incluye el documento contractual en formato PDF.</td></tr>
</table></td></tr></table></body></html>`;
}

function normalizeFrom(): string {
  const raw = (process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || "").trim();
  if (EMAIL_RE.test(raw)) return `${CONTRACT_COMPANY.legalName} <${raw}>`;
  if (raw) return raw;
  return `${CONTRACT_COMPANY.legalName} <onboarding@resend.dev>`;
}

export type SendContractInput = {
  recipient: string;
  cc?: string | null;
  subject: string;
  body: string;
};

export async function sendContractEmail(
  actor: { id: string; name?: string | null },
  contractId: string,
  input: SendContractInput,
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const record: ContractRecord | null = await getContract(contractId);
  if (!record) return { ok: false, error: "Contrato no encontrado." };
  if (!record.pdf_path) return { ok: false, error: "Primero debes generar el documento definitivo." };
  if (!EMAIL_RE.test(input.recipient.trim())) return { ok: false, error: "El correo del destinatario no es válido." };
  if (input.cc?.trim() && !EMAIL_RE.test(input.cc.trim())) {
    return { ok: false, error: "El correo en copia no es válido." };
  }

  const previous = await commercialDb()
    .from("commercial_contract_email_logs")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId);
  const attempt = (previous.count ?? 0) + 1;

  const filename = record.pdf_filename ?? "contrato.pdf";
  const bytes = await contractFileBytes(record.pdf_path);
  if (!bytes) return { ok: false, error: "No se pudo recuperar el documento almacenado." };

  const logBase = {
    contract_id: contractId,
    owner_id: record.owner_id,
    recipient: input.recipient.trim(),
    cc: input.cc?.trim() || null,
    subject: input.subject.trim(),
    body: input.body,
    attachment_name: filename,
    provider: "resend",
    attempt,
    sent_by: actor.id,
  };

  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    await commercialDb()
      .from("commercial_contract_email_logs")
      .insert({ ...logBase, status: "failed", error_message: "Falta RESEND_API_KEY en el servidor." });
    return { ok: false, error: "El envío de correo no está configurado (falta RESEND_API_KEY)." };
  }

  let messageId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: normalizeFrom(),
        to: [input.recipient.trim()],
        ...(input.cc?.trim() ? { cc: [input.cc.trim()] } : {}),
        subject: input.subject.trim(),
        text: input.body,
        html: toHtml(input.body),
        attachments: [{ filename, content: Buffer.from(bytes).toString("base64") }],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!response.ok) {
      errorMessage = payload.message || payload.name || `El proveedor respondió ${response.status}.`;
    } else {
      messageId = payload.id ?? null;
    }
  } catch (cause) {
    errorMessage = cause instanceof Error ? cause.message : "Error de red al contactar al proveedor.";
  }

  const now = new Date().toISOString();
  await commercialDb()
    .from("commercial_contract_email_logs")
    .insert({
      ...logBase,
      status: errorMessage ? "failed" : "sent",
      provider_message_id: messageId,
      error_message: errorMessage,
      sent_at: errorMessage ? null : now,
    });

  if (errorMessage) {
    await recordAudit({
      actorId: actor.id,
      actorName: actor.name ?? null,
      entity: "contract",
      entityId: contractId,
      entityLabel: record.contract_number ?? contractId,
      action: "email_failed",
      summary: `Falló el envío del contrato a ${input.recipient.trim()} (intento ${attempt}): ${errorMessage}`,
      ownerId: record.owner_id,
    });
    return { ok: false, error: errorMessage };
  }

  // Solo se marca como enviado cuando el proveedor confirmó la entrega.
  await commercialDb()
    .from("commercial_contracts")
    .update({ status: "sent", sent_at: now, sent_to: input.recipient.trim() })
    .eq("id", contractId);

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name ?? null,
    entity: "contract",
    entityId: contractId,
    entityLabel: record.contract_number ?? contractId,
    action: attempt > 1 ? "email_resent" : "email_sent",
    summary: `Se ${attempt > 1 ? "reenvió" : "envió"} el contrato ${record.contract_number ?? ""} a ${input.recipient.trim()} (intento ${attempt}).`,
    meta: { messageId, attempt },
    ownerId: record.owner_id,
  });

  return { ok: true, messageId: messageId ?? undefined };
}

/** Datos con los que se abre el modal de envío. */
export function buildEmailDraft(record: ContractRecord, user: { name: string; email: string | null }) {
  const contractType = (record.contract_type as ContractTypeId) ?? "executive_services";
  return {
    // El correo contractual siempre va al personal: el corporativo pertenece
    // a Zyteron y puede suspenderse al terminar la relación.
    recipient: user.email ?? "",
    cc: CONTRACT_COMPANY.email,
    subject: defaultSubject(contractType),
    body: defaultEmailBody({
      firstName: user.name.split(/\s+/)[0] ?? "",
      functionalRole: record.functional_role ?? CONTRACT_TYPE_INFO[contractType].functionalRole,
      contractType,
    }),
  };
}

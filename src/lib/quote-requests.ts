import { z } from "zod";
import { siteConfig } from "@/config/site";
import { buildQuoteMeta, parseQuoteMessage, serializeQuoteMessage, type QuoteMeta } from "@/lib/admin/quote";

export const QUOTE_REQUEST_KIND = "WEB_QUOTE_REQUEST";
export const QUOTE_REQUEST_WHATSAPP_E164 = "+56939526626";
export const QUOTE_REQUEST_WHATSAPP_PUBLIC = "https://wa.me/56939526626";

export type ProjectTypeValue =
  | "web-basica"
  | "web-profesional"
  | "tienda-online"
  | "sistema-web"
  | "automatizacion"
  | "soporte-ti"
  | "no-seguro";

export type BinaryChoice = "si" | "no" | "no-se";
export type BudgetRangeValue =
  | "menos-50000"
  | "50000-100000"
  | "100000-300000"
  | "300000-700000"
  | "mas-700000"
  | "no-claro";
export type DeadlineValue = "urgente" | "esta-semana" | "este-mes" | "sin-apuro" | "no-claro";
export type UrgencyValue = "bajo" | "medio" | "alto";
export type QuoteRequestStage =
  | "NUEVA"
  | "REVISADA"
  | "CONTACTADO"
  | "EN_PROPUESTA"
  | "CERRADA"
  | "PERDIDA"
  | "ARCHIVADA";
export type IntegrationStatus = "pending" | "sent" | "failed";
export type AdminSaveStatus = "saved" | "failed";
export type RequestPriority = "Alta" | "Media" | "Baja";

export type QuoteRequestAnswer = {
  key: string;
  label: string;
  value: string;
};

export type QuoteRequestMeta = QuoteMeta & {
  kind?: typeof QUOTE_REQUEST_KIND;
  quoteCode?: string;
  source?: string;
  clientSubmissionId?: string;
  projectType?: ProjectTypeValue;
  projectTypeLabel?: string;
  businessName?: string;
  businessRubro?: string;
  businessCity?: string;
  hasWebsite?: BinaryChoice;
  hasLogo?: BinaryChoice;
  hasDomain?: BinaryChoice;
  hasContent?: BinaryChoice;
  projectSummary?: string;
  projectAnswers?: QuoteRequestAnswer[];
  projectComment?: string;
  budgetRange?: BudgetRangeValue;
  budgetRangeLabel?: string;
  deadline?: DeadlineValue;
  deadlineLabel?: string;
  urgency?: UrgencyValue;
  urgencyLabel?: string;
  priority?: RequestPriority;
  contactName?: string;
  contactWhatsapp?: string;
  contactWhatsappE164?: string;
  contactEmail?: string;
  contactCompany?: string;
  currentWebsite?: string;
  additionalMessage?: string;
  requestStage?: QuoteRequestStage;
  shortSummary?: string;
  emailStatus?: IntegrationStatus;
  whatsappStatus?: IntegrationStatus;
  adminStatus?: AdminSaveStatus;
  resendMessageId?: string;
  twilioMessageId?: string;
  submittedFrom?: string;
  submittedAt?: string;
  errorLog?: string[];
};

type ResendResponse = {
  id?: string;
  message?: string;
  error?: { message?: string };
  code?: string | number;
};

type TwilioResponse = {
  sid?: string;
  message?: string;
  code?: number;
};

export const PROJECT_TYPE_LABELS: Record<ProjectTypeValue, string> = {
  "web-basica": "Web básica de presentación",
  "web-profesional": "Página web profesional",
  "tienda-online": "Tienda online",
  "sistema-web": "Sistema web interno",
  automatizacion: "Automatización",
  "soporte-ti": "Soporte TI",
  "no-seguro": "No estoy seguro",
};

export const BINARY_CHOICE_LABELS: Record<BinaryChoice, string> = {
  si: "Sí",
  no: "No",
  "no-se": "No sé",
};

export const BUDGET_RANGE_LABELS: Record<BudgetRangeValue, string> = {
  "menos-50000": "Menos de $50.000",
  "50000-100000": "$50.000 a $100.000",
  "100000-300000": "$100.000 a $300.000",
  "300000-700000": "$300.000 a $700.000",
  "mas-700000": "Más de $700.000",
  "no-claro": "No tengo claro",
};

export const DEADLINE_LABELS: Record<DeadlineValue, string> = {
  urgente: "Lo antes posible",
  "esta-semana": "Esta semana",
  "este-mes": "Este mes",
  "sin-apuro": "Sin apuro",
  "no-claro": "No tengo claro",
};

export const URGENCY_LABELS: Record<UrgencyValue, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
};

export const REQUEST_STAGE_LABELS: Record<QuoteRequestStage, string> = {
  NUEVA: "Nueva",
  REVISADA: "Revisada",
  CONTACTADO: "Contactado",
  EN_PROPUESTA: "En propuesta",
  CERRADA: "Cerrada",
  PERDIDA: "Perdida",
  ARCHIVADA: "Archivada",
};

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Fallido",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHILE_WHATSAPP_REGEX = /^(?:\+?56)?(?:\s?9)?(?:[\s-]?\d){8}$/;

const answerSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(180),
  value: z.string().trim().min(1).max(600),
});

export const quoteRequestSchema = z.object({
  clientSubmissionId: z.string().trim().min(8).max(120),
  projectType: z.enum([
    "web-basica",
    "web-profesional",
    "tienda-online",
    "sistema-web",
    "automatizacion",
    "soporte-ti",
    "no-seguro",
  ]),
  businessName: z.string().trim().min(2).max(140),
  businessRubro: z.string().trim().max(120).optional().or(z.literal("")),
  businessCity: z.string().trim().max(120).optional().or(z.literal("")),
  hasWebsite: z.enum(["si", "no", "no-se"]),
  hasLogo: z.enum(["si", "no", "no-se"]),
  hasDomain: z.enum(["si", "no", "no-se"]),
  hasContent: z.enum(["si", "no", "no-se"]),
  projectSummary: z.string().trim().max(240).optional().or(z.literal("")),
  projectAnswers: z.array(answerSchema).min(1).max(20),
  projectComment: z.string().trim().max(1200).optional().or(z.literal("")),
  budgetRange: z.enum([
    "menos-50000",
    "50000-100000",
    "100000-300000",
    "300000-700000",
    "mas-700000",
    "no-claro",
  ]),
  deadline: z.enum(["urgente", "esta-semana", "este-mes", "sin-apuro", "no-claro"]),
  urgency: z.enum(["bajo", "medio", "alto"]),
  contactName: z.string().trim().min(2).max(120),
  contactWhatsapp: z
    .string()
    .trim()
    .min(8)
    .max(32)
    .refine((value) => CHILE_WHATSAPP_REGEX.test(value), "Ingresa un WhatsApp válido para responderte."),
  contactEmail: z
    .string()
    .trim()
    .email("Revisa el correo, parece que tiene un error.")
    .max(160),
  contactCompany: z.string().trim().max(140).optional().or(z.literal("")),
  currentWebsite: z.string().trim().max(200).optional().or(z.literal("")),
  additionalMessage: z.string().trim().max(1200).optional().or(z.literal("")),
  honeypot: z.string().trim().max(200).optional().or(z.literal("")),
});

function cleanText(value?: string | null) {
  if (!value) return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeWhatsappDigits(value: string) {
  return cleanText(value).replace(/[^\d+]/g, "");
}

export function normalizeWhatsappE164(value: string) {
  const normalized = normalizeWhatsappDigits(value);
  if (!normalized) return "";
  if (normalized.startsWith("+56")) return normalized;
  if (normalized.startsWith("56")) return `+${normalized}`;
  if (normalized.startsWith("9")) return `+56${normalized}`;
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

export function formatWhatsappForDisplay(value?: string | null) {
  const digits = normalizeWhatsappDigits(String(value || "")).replace(/^\+?56/, "");
  if (digits.length < 9) return cleanText(value);
  const mobile = digits.startsWith("9") ? digits : `9${digits.slice(-8)}`;
  return `+56 ${mobile.slice(0, 1)} ${mobile.slice(1, 5)} ${mobile.slice(5, 9)}`;
}

export function whatsappPublicLink(value?: string | null) {
  const e164 = normalizeWhatsappE164(String(value || "")).replace(/[^\d]/g, "");
  return e164 ? `https://wa.me/${e164}` : QUOTE_REQUEST_WHATSAPP_PUBLIC;
}

export function formatCurrencyCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

export function budgetRangeToEstimate(value: BudgetRangeValue) {
  if (value === "menos-50000") return 50000;
  if (value === "50000-100000") return 100000;
  if (value === "100000-300000") return 300000;
  if (value === "300000-700000") return 700000;
  if (value === "mas-700000") return 900000;
  return 150000;
}

export function computeRequestPriority(input: { urgency: UrgencyValue; budgetRange: BudgetRangeValue }): RequestPriority {
  if (input.urgency === "alto") return "Alta";
  if (input.budgetRange === "mas-700000" || input.budgetRange === "300000-700000") return "Alta";
  if (input.budgetRange === "100000-300000" || input.budgetRange === "no-claro") return "Media";
  return "Baja";
}

export function mapStageToQuoteStatus(stage: QuoteRequestStage) {
  if (stage === "CERRADA") return "WON";
  if (stage === "PERDIDA" || stage === "ARCHIVADA") return "LOST";
  if (stage === "CONTACTADO" || stage === "EN_PROPUESTA") return "SENT";
  return "PENDING";
}

export function isQuoteRequestMeta(meta?: { kind?: string | null } | null): meta is QuoteRequestMeta {
  return meta?.kind === QUOTE_REQUEST_KIND;
}

export function requestStageLabel(value?: string | null) {
  const key = String(value || "NUEVA").trim().toUpperCase() as QuoteRequestStage;
  return REQUEST_STAGE_LABELS[key] || REQUEST_STAGE_LABELS.NUEVA;
}

export function parseQuoteRequestMeta(message?: string | null) {
  const meta = parseQuoteMessage(message) as QuoteRequestMeta;
  return isQuoteRequestMeta(meta) ? meta : null;
}

export function buildQuoteRequestSummary(meta: QuoteRequestMeta) {
  const parts = [
    meta.projectTypeLabel || "Solicitud web",
    meta.businessRubro || "",
    meta.projectSummary || "",
    meta.projectComment || "",
  ]
    .map((value) => cleanText(value))
    .filter(Boolean);

  return parts.join(" · ").slice(0, 220);
}

export function buildQuoteRequestMeta(input: z.infer<typeof quoteRequestSchema> & { quoteCode: string; submittedAt: string; submittedFrom?: string | null }) {
  const projectAnswers = input.projectAnswers.map((answer) => ({
    key: cleanText(answer.key),
    label: cleanText(answer.label),
    value: cleanText(answer.value),
  }));
  const priority = computeRequestPriority({
    urgency: input.urgency,
    budgetRange: input.budgetRange,
  });

  const baseMeta = buildQuoteMeta({
    items: [],
    subtotal: budgetRangeToEstimate(input.budgetRange),
    totalDescuento: 0,
    iva: 0,
    grandTotal: budgetRangeToEstimate(input.budgetRange),
    notes: cleanText(input.additionalMessage) || cleanText(input.projectComment) || undefined,
    terms: "Solicitud comercial inicial recibida desde el cotizador web. El alcance final se define tras revisión comercial.",
  }) as QuoteRequestMeta;

  const meta: QuoteRequestMeta = {
    ...baseMeta,
    kind: QUOTE_REQUEST_KIND,
    quoteCode: input.quoteCode,
    source: "WEB_ASSISTANT",
    clientSubmissionId: cleanText(input.clientSubmissionId),
    projectType: input.projectType,
    projectTypeLabel: PROJECT_TYPE_LABELS[input.projectType],
    businessName: cleanText(input.businessName),
    businessRubro: cleanText(input.businessRubro) || undefined,
    businessCity: cleanText(input.businessCity) || undefined,
    hasWebsite: input.hasWebsite,
    hasLogo: input.hasLogo,
    hasDomain: input.hasDomain,
    hasContent: input.hasContent,
    projectSummary: cleanText(input.projectSummary) || undefined,
    projectAnswers,
    projectComment: cleanText(input.projectComment) || undefined,
    budgetRange: input.budgetRange,
    budgetRangeLabel: BUDGET_RANGE_LABELS[input.budgetRange],
    deadline: input.deadline,
    deadlineLabel: DEADLINE_LABELS[input.deadline],
    urgency: input.urgency,
    urgencyLabel: URGENCY_LABELS[input.urgency],
    priority,
    contactName: cleanText(input.contactName),
    contactWhatsapp: formatWhatsappForDisplay(input.contactWhatsapp),
    contactWhatsappE164: normalizeWhatsappE164(input.contactWhatsapp),
    contactEmail: cleanText(input.contactEmail),
    contactCompany: cleanText(input.contactCompany) || undefined,
    currentWebsite: cleanText(input.currentWebsite) || undefined,
    additionalMessage: cleanText(input.additionalMessage) || undefined,
    requestStage: "NUEVA",
    emailStatus: "pending",
    whatsappStatus: "pending",
    adminStatus: "saved",
    submittedFrom: cleanText(input.submittedFrom) || undefined,
    submittedAt: input.submittedAt,
    errorLog: [],
  };

  meta.shortSummary = buildQuoteRequestSummary(meta);
  return meta;
}

export function appendQuoteRequestError(meta: QuoteRequestMeta, channel: "email" | "whatsapp" | "admin", message: string) {
  const errorLog = [...(meta.errorLog || [])];
  errorLog.push(`${new Date().toISOString()} [${channel}] ${cleanText(message)}`.slice(0, 600));
  return {
    ...meta,
    errorLog: errorLog.slice(-20),
  };
}

export function serializeQuoteRequestMeta(meta: QuoteRequestMeta) {
  return serializeQuoteMessage(meta);
}

export async function generateQuoteCode() {
  const { prisma } = await import("@/lib/prisma");
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  try {
    const count = await prisma.quote.count({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });
    return `ZYT-${dateCode}-${String(count + 1).padStart(4, "0")}`;
  } catch {
    const suffix = String(Math.floor(Math.random() * 9000) + 1000);
    return `ZYT-${dateCode}-${suffix}`;
  }
}

function buildEmailRows(meta: QuoteRequestMeta, quoteId: string) {
  const adminUrl = `${siteConfig.url}/admin/cotizaciones/${quoteId}`;
  return [
    ["Codigo", meta.quoteCode || quoteId],
    ["Fecha", cleanText(meta.submittedAt || "") || new Date().toLocaleString("es-CL")],
    ["Tipo de proyecto", meta.projectTypeLabel || "Solicitud"],
    ["Urgencia", meta.urgencyLabel || "No definida"],
    ["Presupuesto", meta.budgetRangeLabel || "No definido"],
    ["Plazo", meta.deadlineLabel || "No definido"],
    ["Nombre", meta.contactName || "Sin nombre"],
    ["Empresa", meta.contactCompany || meta.businessName || "Sin empresa"],
    ["WhatsApp", meta.contactWhatsapp || "Sin WhatsApp"],
    ["Email", meta.contactEmail || "Sin email"],
    ["Ciudad", meta.businessCity || "No informada"],
    ["Sitio actual", meta.currentWebsite || "No informado"],
    ["Rubro", meta.businessRubro || "No informado"],
    ["Tiene web", BINARY_CHOICE_LABELS[meta.hasWebsite || "no-se"]],
    ["Tiene logo", BINARY_CHOICE_LABELS[meta.hasLogo || "no-se"]],
    ["Tiene dominio", BINARY_CHOICE_LABELS[meta.hasDomain || "no-se"]],
    ["Tiene textos e imagenes", BINARY_CHOICE_LABELS[meta.hasContent || "no-se"]],
    ["Panel admin", adminUrl],
  ];
}

function buildDetailHtml(meta: QuoteRequestMeta) {
  return (meta.projectAnswers || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569;">${escapeHtml(item.label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;text-align:right;">${escapeHtml(item.value)}</td>
        </tr>`,
    )
    .join("");
}

function buildDetailText(meta: QuoteRequestMeta) {
  return (meta.projectAnswers || []).map((item) => `- ${item.label}: ${item.value}`);
}

function extractResendError(body: ResendResponse | null) {
  return cleanText(body?.error?.message) || cleanText(body?.message) || cleanText(String(body?.code || "")) || "Resend rechazo el envio.";
}

function normalizeFromAddress(raw: string | undefined) {
  const value = cleanText(raw);
  if (!value) return `${siteConfig.name} <onboarding@resend.dev>`;
  if (EMAIL_REGEX.test(value)) return value;
  return value;
}

function normalizeReplyToAddress(raw?: string | null) {
  const value = cleanText(raw);
  return EMAIL_REGEX.test(value) ? value : undefined;
}

function parseWhatsappRecipients(raw?: string | null) {
  return Array.from(
    new Set(
      String(raw || "")
        .split(/[,\n;]/)
        .map((value) => cleanText(value))
        .filter(Boolean)
        .map((value) => (value.startsWith("whatsapp:") ? value : `whatsapp:${value}`)),
    ),
  );
}

export async function sendQuoteRequestEmail(meta: QuoteRequestMeta, quoteId: string) {
  const resendApiKey = cleanText(process.env.RESEND_API_KEY);
  if (!resendApiKey) {
    return { sent: false as const, error: "Falta RESEND_API_KEY." };
  }

  const from = normalizeFromAddress(process.env.RESEND_FROM_EMAIL);
  const to =
    cleanText(process.env.RESEND_TO_EMAIL) ||
    cleanText(process.env.RESEND_LEAD_TO_EMAIL) ||
    cleanText(process.env.RESEND_REPLY_TO) ||
    "contacto@zyteron.cl";
  const replyTo =
    normalizeReplyToAddress(process.env.RESEND_REPLY_TO) ||
    normalizeReplyToAddress(meta.contactEmail) ||
    undefined;
  const adminUrl = `${siteConfig.url}/admin/cotizaciones/${quoteId}`;
  const whatsappUrl = whatsappPublicLink(meta.contactWhatsappE164 || meta.contactWhatsapp);
  const rows = buildEmailRows(meta, quoteId)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${escapeHtml(label)}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
  <html lang="es">
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#f1f5f9;">
        <tr>
          <td align="center">
            <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #dbe2ea;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="padding:22px 24px;background:linear-gradient(135deg,#0f5fff,#0b3aa4);color:#ffffff;">
                  <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.92;">Nueva solicitud de cotizacion</p>
                  <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;">${escapeHtml(meta.quoteCode || quoteId)}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:22px 24px;">
                  <p style="margin:0 0 14px;font-size:15px;color:#334155;">Recibiste una nueva solicitud de cotizacion desde el asistente web de Zyteron.</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                    ${rows}
                  </table>
                  <div style="margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#ffffff;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Detalle del proyecto</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${buildDetailHtml(meta)}
                    </table>
                  </div>
                  ${
                    meta.additionalMessage || meta.projectComment
                      ? `<div style="margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#ffffff;">
                          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Mensaje adicional</p>
                          <p style="margin:0;font-size:14px;line-height:1.65;color:#1e293b;white-space:pre-line;">${escapeHtml(meta.additionalMessage || meta.projectComment || "")}</p>
                        </div>`
                      : ""
                  }
                  <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="${escapeHtml(whatsappUrl)}" style="display:inline-block;padding:11px 16px;border-radius:999px;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;">Abrir WhatsApp</a>
                    <a href="mailto:${escapeHtml(meta.contactEmail || "")}" style="display:inline-block;padding:11px 16px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">Responder correo</a>
                    <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:11px 16px;border-radius:999px;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-weight:700;border:1px solid #bfdbfe;">Ver en panel admin</a>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  const text = [
    "Nueva solicitud de cotizacion",
    "",
    ...buildEmailRows(meta, quoteId).map(([label, value]) => `${label}: ${value}`),
    "",
    "Detalle del proyecto:",
    ...buildDetailText(meta),
    meta.additionalMessage || meta.projectComment ? "" : "",
    meta.additionalMessage || meta.projectComment ? `Mensaje adicional: ${meta.additionalMessage || meta.projectComment}` : "",
    "",
    `Abrir WhatsApp: ${whatsappUrl}`,
    `Responder correo: mailto:${meta.contactEmail || ""}`,
    `Ver en panel admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: `NUEVA COTIZACION WEB - ZYTERON - ${meta.quoteCode || quoteId}`,
      html,
      text,
    }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as ResendResponse | null;
  if (!response.ok || !body?.id) {
    return { sent: false as const, error: extractResendError(body) };
  }

  return { sent: true as const, messageId: body.id };
}

export async function sendQuoteRequestWhatsapp(meta: QuoteRequestMeta, quoteId: string) {
  const accountSid = cleanText(process.env.TWILIO_ACCOUNT_SID);
  const authToken = cleanText(process.env.TWILIO_AUTH_TOKEN);
  const from = cleanText(process.env.TWILIO_WHATSAPP_FROM) || "whatsapp:+14155238886";
  const recipients = parseWhatsappRecipients(
    cleanText(process.env.WHATSAPP_NOTIFY_TO) || cleanText(process.env.TWILIO_WHATSAPP_TO) || "whatsapp:+56939526626",
  );
  const to = recipients[0] || "";

  if (!accountSid || !authToken || !from || !to) {
    return { sent: false as const, error: "Falta configuracion de Twilio." };
  }

  const adminUrl = `${siteConfig.url}/admin/cotizaciones/${quoteId}`;
  const lines = [
    "Nueva cotizacion Zyteron",
    "",
    `Codigo: ${meta.quoteCode || quoteId}`,
    `Tipo: ${meta.projectTypeLabel || "Solicitud"}`,
    `Cliente: ${meta.contactName || "Sin nombre"}`,
    `Empresa: ${meta.contactCompany || meta.businessName || "Sin empresa"}`,
    `WhatsApp: ${meta.contactWhatsapp || "Sin WhatsApp"}`,
    `Email: ${meta.contactEmail || "Sin email"}`,
    `Presupuesto: ${meta.budgetRangeLabel || "No definido"}`,
    `Urgencia: ${meta.urgencyLabel || "No definida"}`,
    `Plazo: ${meta.deadlineLabel || "No definido"}`,
    "",
    "Resumen:",
    meta.shortSummary || buildQuoteRequestSummary(meta) || "Sin resumen",
    "",
    `Ver en admin: ${adminUrl}`,
  ];

  const body = new URLSearchParams();
  body.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
  body.set("To", to.startsWith("whatsapp:") ? to : `whatsapp:${to}`);
  body.set("Body", lines.join("\n"));

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as TwilioResponse | null;
  if (!response.ok || !payload?.sid) {
    return {
      sent: false as const,
      error: cleanText(payload?.message) || `Twilio ${response.status}`,
    };
  }

  return { sent: true as const, messageId: payload.sid };
}

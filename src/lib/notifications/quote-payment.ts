import { ZYTERON_COMPANY } from "@/lib/company";
import type { QuotePaymentProof, QuotePaymentStage } from "@/lib/admin/quote";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_WITH_NAME_REGEX = /^[^<>]+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value || 0)));
}

function escapeHtml(value?: string | null) {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeFrom() {
  const fallback = `${ZYTERON_COMPANY.brandName} <onboarding@resend.dev>`;
  const raw = normalizeText(process.env.RESEND_FROM_EMAIL) || normalizeText(process.env.RESEND_FROM);
  if (!raw) return fallback;
  if (EMAIL_REGEX.test(raw)) return `${ZYTERON_COMPANY.brandName} <${raw}>`;
  if (FROM_WITH_NAME_REGEX.test(raw)) return raw.replace(/\s+/g, " ").trim();

  const emailMatch = raw.match(/[^\s<>,;:()]+@[^\s<>,;:()]+\.[^\s<>,;:()]+/);
  if (!emailMatch) return fallback;
  const email = emailMatch[0];
  const name = raw.replace(email, "").replace(/[<>\"']/g, " ").replace(/\s+/g, " ").trim();
  return name ? `${name} <${email}>` : email;
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = normalizeText(process.env.RESEND_API_KEY);
  if (!apiKey) return { sent: false as const, reason: "missing_api_key" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: normalizeFrom(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: normalizeText(process.env.RESEND_REPLY_TO) || ZYTERON_COMPANY.salesEmail,
    }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok || !body?.id) {
    throw new Error(body?.message || `No se pudo enviar correo (${response.status}).`);
  }

  return { sent: true as const, id: body.id };
}

function renderShell(input: {
  eyebrow: string;
  title: string;
  intro: string;
  contentHtml: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;border:1px solid #dbe2ea;border-radius:14px;overflow:hidden;background:#fff;">
            <tr>
              <td style="background:linear-gradient(135deg,#0f5fff,#0b3aa4);padding:22px 24px;color:#fff;">
                <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">${escapeHtml(input.eyebrow)}</p>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">${escapeHtml(input.title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.6;">${escapeHtml(input.intro)}</p>
                ${input.contentHtml}
                ${
                  input.ctaHref && input.ctaLabel
                    ? `<p style="margin:20px 0 0;">
                    <a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;padding:10px 16px;background:#0f5fff;border-radius:8px;color:#fff;text-decoration:none;font-weight:700;font-size:13px;">${escapeHtml(input.ctaLabel)}</a>
                  </p>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendQuotePaymentReadyEmail(input: {
  to: string;
  fullName: string;
  quoteNumber: string;
  quoteTotal: number;
  stage: QuotePaymentStage;
  channelLabel: string;
  portalUrl: string;
  paymentUrl?: string | null;
}) {
  const html = renderShell({
    eyebrow: "Cobro de cotización",
    title: "Pago pendiente disponible",
    intro: `Hola ${input.fullName}, habilitamos el cobro asociado a tu cotización ${input.quoteNumber}.`,
    contentHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Etapa</strong><br/>${escapeHtml(input.stage.label)}</td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Monto a pagar</strong><br/>${escapeHtml(formatCurrency(input.stage.amount))}</td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Total cotización</strong><br/>${escapeHtml(formatCurrency(input.quoteTotal))}</td></tr>
      <tr><td style="padding:14px 16px;"><strong>Canal</strong><br/>${escapeHtml(input.channelLabel)}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#475569;">Tu portal mostrará una alerta de pago pendiente hasta que el monto quede validado correctamente.</p>`,
    ctaHref: input.paymentUrl || input.portalUrl,
    ctaLabel: input.paymentUrl ? "Ir al pago" : "Abrir portal",
  });

  const text = [
    `Hola ${input.fullName},`,
    "",
    `Habilitamos el cobro de tu cotización ${input.quoteNumber}.`,
    `Etapa: ${input.stage.label}`,
    `Monto a pagar: ${formatCurrency(input.stage.amount)}`,
    `Total cotización: ${formatCurrency(input.quoteTotal)}`,
    `Canal: ${input.channelLabel}`,
    "",
    `Portal: ${input.portalUrl}`,
    input.paymentUrl ? `Pago directo: ${input.paymentUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to: input.to,
    subject: `${ZYTERON_COMPANY.brandName} | Pago pendiente ${input.quoteNumber}`,
    html,
    text,
  });
}

export async function sendQuotePaymentStatusEmail(input: {
  to: string;
  fullName: string;
  quoteNumber: string;
  stage: QuotePaymentStage;
  title: string;
  intro: string;
  portalUrl: string;
}) {
  const html = renderShell({
    eyebrow: "Estado de pago",
    title: input.title,
    intro: `Hola ${input.fullName}, ${input.intro}`,
    contentHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Cotización</strong><br/>${escapeHtml(input.quoteNumber)}</td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Etapa</strong><br/>${escapeHtml(input.stage.label)}</td></tr>
      <tr><td style="padding:14px 16px;"><strong>Monto</strong><br/>${escapeHtml(formatCurrency(input.stage.amount))}</td></tr>
    </table>`,
    ctaHref: input.portalUrl,
    ctaLabel: "Abrir portal",
  });

  const text = [
    `Hola ${input.fullName},`,
    "",
    input.intro,
    `Cotización: ${input.quoteNumber}`,
    `Etapa: ${input.stage.label}`,
    `Monto: ${formatCurrency(input.stage.amount)}`,
    `Portal: ${input.portalUrl}`,
  ].join("\n");

  return sendEmail({
    to: input.to,
    subject: `${ZYTERON_COMPANY.brandName} | ${input.title} · ${input.quoteNumber}`,
    html,
    text,
  });
}

export async function sendQuoteTransferProofAlertEmail(input: {
  to: string;
  quoteNumber: string;
  clientName: string;
  clientEmail: string;
  stage: QuotePaymentStage;
  proof: QuotePaymentProof;
  adminUrl: string;
}) {
  const html = renderShell({
    eyebrow: "Transferencia recibida",
    title: "Comprobante pendiente de revisión",
    intro: `El cliente ${input.clientName} subió un comprobante para la cotización ${input.quoteNumber}.`,
    contentHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Cliente</strong><br/>${escapeHtml(input.clientName)} · ${escapeHtml(input.clientEmail)}</td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Etapa</strong><br/>${escapeHtml(input.stage.label)}</td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Monto declarado</strong><br/>${escapeHtml(formatCurrency(input.proof.amount))}</td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><strong>Referencia</strong><br/>${escapeHtml(input.proof.reference || "Sin referencia")}</td></tr>
      <tr><td style="padding:14px 16px;"><strong>Comprobante</strong><br/>${
        input.proof.fileUrl
          ? `<a href="${escapeHtml(input.proof.fileUrl)}" style="color:#0f5fff;">Ver archivo</a>`
          : "Sin archivo adjunto"
      }</td></tr>
    </table>`,
    ctaHref: input.adminUrl,
    ctaLabel: "Revisar cotización",
  });

  const text = [
    `Comprobante pendiente de revisión.`,
    `Cotización: ${input.quoteNumber}`,
    `Cliente: ${input.clientName} (${input.clientEmail})`,
    `Etapa: ${input.stage.label}`,
    `Monto declarado: ${formatCurrency(input.proof.amount)}`,
    `Referencia: ${input.proof.reference || "Sin referencia"}`,
    input.proof.fileUrl ? `Comprobante: ${input.proof.fileUrl}` : "",
    `Revisar: ${input.adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to: input.to,
    subject: `${ZYTERON_COMPANY.brandName} | Comprobante recibido ${input.quoteNumber}`,
    html,
    text,
  });
}

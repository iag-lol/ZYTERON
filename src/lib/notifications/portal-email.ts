import { ZYTERON_COMPANY } from "@/lib/company";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeFrom() {
  const raw = normalizeText(process.env.RESEND_FROM_EMAIL) || normalizeText(process.env.RESEND_FROM);
  if (EMAIL_REGEX.test(raw)) {
    return `${ZYTERON_COMPANY.brandName} <${raw}>`;
  }
  return `${ZYTERON_COMPANY.brandName} <onboarding@resend.dev>`;
}

function renderEmailShell(input: {
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

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = normalizeText(process.env.RESEND_API_KEY);
  if (!apiKey) {
    return { sent: false as const, reason: "missing_api_key" as const };
  }

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
    }),
  });

  if (!response.ok) {
    return { sent: false as const, reason: "provider_error" as const };
  }
  return { sent: true as const };
}

export async function sendPortalVerificationCodeEmail(input: {
  to: string;
  fullName: string;
  code: string;
  expiresMinutes: number;
}) {
  const html = renderEmailShell({
    eyebrow: "Portal de Clientes",
    title: "Verifica tu cuenta",
    intro: `Hola ${input.fullName}, usa este código para activar tu acceso seguro.`,
    contentHtml: `<div style="padding:16px;border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#1d4ed8;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Código de verificación</p>
      <p style="margin:10px 0 0;font-size:34px;font-weight:800;letter-spacing:0.2em;color:#0f172a;">${escapeHtml(input.code)}</p>
      <p style="margin:10px 0 0;font-size:12px;color:#475569;">Expira en ${input.expiresMinutes} minutos.</p>
    </div>`,
  });

  return sendResendEmail({
    to: input.to,
    subject: "Zyteron | Código de verificación de tu cuenta",
    html,
    text: `Código de verificación: ${input.code}. Expira en ${input.expiresMinutes} minutos.`,
  });
}

export async function sendPortalWelcomeEmail(input: { to: string; fullName: string }) {
  const html = renderEmailShell({
    eyebrow: "Portal de Clientes",
    title: "Cuenta activada",
    intro: `Hola ${input.fullName}, tu correo fue verificado correctamente.`,
    contentHtml:
      "<p style='margin:0;font-size:14px;color:#334155;line-height:1.65;'>Ya puedes ingresar a tu portal para revisar proyectos, documentos, boletas, soporte y comunicaciones en un solo lugar.</p>",
  });

  return sendResendEmail({
    to: input.to,
    subject: "Zyteron | Bienvenido al Portal de Clientes",
    html,
    text: "Tu cuenta del Portal de Clientes fue activada correctamente.",
  });
}

export async function sendPortalPasswordResetCodeEmail(input: {
  to: string;
  fullName: string;
  code: string;
  expiresMinutes: number;
}) {
  const html = renderEmailShell({
    eyebrow: "Seguridad de Cuenta",
    title: "Restablece tu contraseña",
    intro: `Hola ${input.fullName}, recibimos una solicitud para recuperar tu cuenta.`,
    contentHtml: `<div style="padding:16px;border:1px solid #fee2e2;background:#fef2f2;border-radius:10px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#b91c1c;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Código de recuperación</p>
      <p style="margin:10px 0 0;font-size:34px;font-weight:800;letter-spacing:0.2em;color:#0f172a;">${escapeHtml(input.code)}</p>
      <p style="margin:10px 0 0;font-size:12px;color:#475569;">Expira en ${input.expiresMinutes} minutos.</p>
    </div>`,
  });

  return sendResendEmail({
    to: input.to,
    subject: "Zyteron | Código de recuperación de contraseña",
    html,
    text: `Código de recuperación: ${input.code}. Expira en ${input.expiresMinutes} minutos.`,
  });
}


import { ZYTERON_COMPANY } from "@/lib/company";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_WITH_NAME_REGEX = /^[^<>]+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;

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
  const fallback = `${ZYTERON_COMPANY.brandName} <onboarding@resend.dev>`;
  const raw =
    normalizeText(process.env.RESEND_FROM_EMAIL) || normalizeText(process.env.RESEND_FROM);
  if (!raw) return fallback;
  if (EMAIL_REGEX.test(raw)) return `${ZYTERON_COMPANY.brandName} <${raw}>`;
  if (FROM_WITH_NAME_REGEX.test(raw)) return raw.replace(/\s+/g, " ").trim();

  const emailMatch = raw.match(/[^\s<>,;:()]+@[^\s<>,;:()]+\.[^\s<>,;:()]+/);
  if (!emailMatch) return fallback;
  const email = emailMatch[0];
  const name = raw
    .replace(email, "")
    .replace(/[<>\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name ? `${name} <${email}>` : email;
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

async function sendResendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const apiKey = normalizeText(process.env.RESEND_API_KEY);
  if (!apiKey) {
    return { sent: false as const, reason: "missing_api_key" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
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
    let providerMessage = "";
    try {
      const payload = (await response.json()) as { message?: string; name?: string };
      providerMessage = normalizeText(payload?.message) || normalizeText(payload?.name);
    } catch {
      providerMessage = "";
    }
    console.error("[portal/email] Error enviando correo con Resend.", {
      status: response.status,
      reason: "provider_error",
      to: input.to,
      subject: input.subject,
      from: normalizeFrom(),
    });
    return {
      sent: false as const,
      reason: "provider_error" as const,
      status: response.status,
      providerMessage,
    };
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

export function renderCredentialCodeEmail(input: {
  fullName: string;
  code: string;
  serviceName: string;
  expiresMinutes: number;
}) {
  return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"/><meta charset="utf-8"/></head><body style="margin:0;background:#f4f6f0;color:#263e32;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">Verificación de acceso a tus credenciales. Válido por ${input.expiresMinutes} minutos.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fff;border:1px solid #e0e6d9;border-radius:20px;overflow:hidden">
  <tr><td style="padding:28px 32px;background:#263f32;color:#fff"><b style="font-size:27px;letter-spacing:-1px">zyteron<span style="color:#c5d78c">.</span></b><p style="font-size:10px;letter-spacing:2px;color:#d3dec4;margin:12px 0 0">TU ESPACIO · ACCESO SEGURO</p></td></tr>
  <tr><td style="padding:32px"><p style="font-size:12px;font-weight:bold;color:#667e45;letter-spacing:1px;margin:0 0 14px">VERIFICACIÓN EN DOS PASOS</p><h1 style="font-size:28px;letter-spacing:-1px;line-height:1.2;margin:0 0 18px">Tus accesos, protegidos.</h1>
  <p style="font-size:14px;line-height:1.7;color:#66725f">Hola ${escapeHtml(input.fullName)}, usa este código en el portal para consultar <b style="color:#263f32">${escapeHtml(input.serviceName)}</b>.</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:25px 12px;background:#f2f6e9;border:1px solid #dae5c8;border-radius:14px"><p style="margin:0 0 12px;font-size:10px;letter-spacing:2px;color:#6a7b51">TU CÓDIGO DE SEGURIDAD</p><p style="margin:0;font-size:40px;font-weight:bold;letter-spacing:9px;color:#263f32;font-family:monospace">${escapeHtml(input.code)}</p><p style="font-size:12px;color:#71805e;margin:14px 0 0">Un solo uso · vence en ${input.expiresMinutes} minutos</p></td></tr></table>
  <p style="font-size:12px;line-height:1.8;color:#6b7665;margin:22px 0 0">Ingresa el código únicamente en tu portal de Zyteron. No lo compartas con otras personas. El equipo de Zyteron no te pedirá este código por teléfono ni por mensajería.</p>
  <p style="font-size:12px;line-height:1.8;color:#6b7665;margin:12px 0 0">Si no solicitaste este acceso, ignora el mensaje y revisa la seguridad de tu cuenta.</p></td></tr>
  <tr><td style="padding:19px 32px;border-top:1px solid #edf0e7;font-size:10px;color:#859078">ZYTERON · Tecnología que te acompaña.<br/>Este correo no incluye contraseñas ni enlaces de acceso automático.</td></tr></table></td></tr></table></body></html>`;
}

export async function sendPortalCredentialRevealCodeEmail(input: {
  to: string;
  fullName: string;
  code: string;
  serviceName: string;
  expiresMinutes: number;
}) {
  const html = renderCredentialCodeEmail(input);

  return sendCriticalCredentialEmail({
    to: input.to,
    subject: `Zyteron | Código de seguridad para ${input.serviceName}`,
    html,
    text: `Código de seguridad: ${input.code}. Expira en ${input.expiresMinutes} minutos.`,
  });
}

async function sendCriticalCredentialEmail(input: Parameters<typeof sendResendEmail>[0]) {
  // Security messages can arrive in a burst; retry provider throttling only.
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await sendResendEmail(input);
    if (result.sent || !("status" in result) || result.status !== 429 || attempt === 2)
      return result;
    await new Promise((resolve) => setTimeout(resolve, 1100 * (attempt + 1)));
  }
  return { sent: false as const, reason: "provider_error" as const };
}

export async function sendPortalCredentialAccessAlertEmail(input: {
  auditId: string;
  operation: string;
  outcome: string;
  status: number;
  actorEmail: string;
  credentialId: string;
  timestamp: string;
  forwardedIp: string;
  userAgent: string;
}) {
  const text = [
    `Registro: ${input.auditId}`,
    `Fecha UTC: ${input.timestamp}`,
    `Operación: ${input.operation}`,
    `Resultado: ${input.outcome} (HTTP ${input.status})`,
    `Solicitante: ${input.actorEmail}`,
    `Credencial: ${input.credentialId}`,
    `IP reportada (no verificada): ${input.forwardedIp || "No disponible"}`,
    `Navegador reportado (no verificado): ${input.userAgent || "No disponible"}`,
    "Si no reconoces este intento, revisa la cuenta solicitante. Este aviso no contiene contraseñas ni códigos.",
  ].join("\n");
  return sendCriticalCredentialEmail({
    to: "contacto@zyteron.cl",
    subject: `Zyteron | Intento de acceso a credenciales: ${input.outcome}`,
    text,
    html: renderEmailShell({
      eyebrow: "Auditoría de seguridad",
      title: "Intento de acceso a credenciales",
      intro: "Se registró una solicitud de acceso a credenciales en el portal.",
      contentHtml: `<pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-family:Arial,sans-serif;font-size:13px;">${escapeHtml(text)}</pre>`,
    }),
  });
}

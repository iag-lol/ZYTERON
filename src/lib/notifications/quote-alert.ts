import { siteConfig } from "@/config/site";

/**
 * Aviso al VENDEDOR/dueño cuando la IA genera una cotización (WhatsApp/web).
 * Correo con diseño profesional. Envía a los correos internos configurados.
 * Nunca lanza.
 */

function env(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

function esc(v: string) {
  return String(v || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] || c));
}

function clp(n: number) {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(n) || 0);
  } catch {
    return `$${Math.round(n || 0)}`;
  }
}

export type QuoteAlertItem = { descripcion: string; cantidad: number; precioNeto: number };

export type QuoteAlertInput = {
  clientName: string;
  clientContact: string;
  channel: string; // "WhatsApp" | "Chat web" | ...
  items: QuoteAlertItem[];
  net: number;
  iva: number;
  total: number;
  quoteId?: string | null;
};

function renderHtml(input: QuoteAlertInput) {
  const rows = input.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;color:#334155;font-size:14px;">
          ${esc(it.descripcion)} <span style="color:#94a3b8;">×${it.cantidad}</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;color:#0f172a;font-size:14px;font-weight:700;text-align:right;white-space:nowrap;">
          ${clp(it.precioNeto * it.cantidad)}
        </td>
      </tr>`,
    )
    .join("");

  const adminUrl = `${siteConfig.url}/admin/cotizaciones`;

  return `<!doctype html><html lang="es"><body style="margin:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,.06);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:26px 28px;">
          <table role="presentation" width="100%"><tr>
            <td style="color:#fff;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.85;">Zyteron</td>
            <td style="text-align:right;color:#dbeafe;font-size:12px;">Nueva oportunidad de venta</td>
          </tr></table>
          <div style="color:#ffffff;font-size:21px;font-weight:800;margin-top:10px;">Se generó una nueva cotización</div>
          <div style="color:#dbeafe;font-size:13px;margin-top:2px;">Vía ${esc(input.channel)} · atención automática con IA</div>
        </td></tr>

        <!-- Cliente -->
        <tr><td style="padding:22px 28px 6px;">
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;background:#f8fafc;">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;">Cliente</div>
            <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:3px;">${esc(input.clientName)}</div>
            <div style="font-size:13px;color:#475569;margin-top:2px;">${esc(input.clientContact)}</div>
          </div>
        </td></tr>

        <!-- Detalle -->
        <tr><td style="padding:14px 28px 4px;">
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Detalle</div>
          <table role="presentation" width="100%" style="border:1px solid #eef2f7;border-radius:12px;overflow:hidden;">
            ${rows}
          </table>
        </td></tr>

        <!-- Totales -->
        <tr><td style="padding:14px 28px 6px;">
          <table role="presentation" width="100%">
            <tr><td style="color:#64748b;font-size:13px;padding:3px 0;">Neto</td><td style="text-align:right;color:#334155;font-size:13px;font-weight:600;">${clp(input.net)}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:3px 0;">IVA (19%)</td><td style="text-align:right;color:#334155;font-size:13px;font-weight:600;">${clp(input.iva)}</td></tr>
            <tr><td style="color:#0f172a;font-size:16px;font-weight:800;padding-top:8px;border-top:2px solid #e2e8f0;">Total</td><td style="text-align:right;color:#1d4ed8;font-size:18px;font-weight:800;padding-top:8px;border-top:2px solid #e2e8f0;">${clp(input.total)}</td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:18px 28px 26px;">
          <a href="${adminUrl}" style="display:block;text-align:center;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px;border-radius:12px;">Ver y gestionar en el panel</a>
          <div style="text-align:center;color:#94a3b8;font-size:11px;margin-top:12px;">Valores referenciales (desde), sin IVA en la publicación. Confirma el alcance antes de emitir.</div>
        </td></tr>
      </table>
      <div style="color:#94a3b8;font-size:11px;margin-top:14px;">${esc(siteConfig.legalName)} · ${esc(siteConfig.contact.email)}</div>
    </td></tr>
  </table></body></html>`;
}

export async function sendQuoteAlertEmail(input: QuoteAlertInput): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) {
    console.log("[quote-alert] omitido: falta RESEND_API_KEY");
    return { sent: false, reason: "no_api_key" };
  }
  const from = env("RESEND_FROM_EMAIL") || `Zyteron <noreply@${siteConfig.domain}>`;
  const to =
    env("RESEND_LEAD_TO_EMAIL") || env("CHECKOUT_ALERT_EMAILS") || siteConfig.contact.email;
  const recipients = to.split(/[,;]/).map((s) => s.trim()).filter(Boolean);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `Nueva cotización · ${input.clientName} · ${clp(input.total)}`,
        html: renderHtml(input),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[quote-alert] fallo:", res.status, body.slice(0, 200));
      return { sent: false, reason: `resend ${res.status}` };
    }
    console.log("[quote-alert] enviado a", recipients.join(", "));
    return { sent: true };
  } catch (err) {
    console.error("[quote-alert] excepción:", err);
    return { sent: false, reason: "exception" };
  }
}

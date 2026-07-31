import { siteConfig } from "@/config/site";
import { ZYTERON_COMPANY } from "@/lib/company";
import { leadPushPayload, sendAdminPushNotification } from "@/lib/notifications/admin-web-push";

type CartLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type LeadAlertInput = {
  leadId: string;
  source: "CONTACTO_WEB" | "COTIZADOR_WEB" | "CHAT_IA";
  submittedAtIso: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
  budget?: string | null;
  deadline?: string | null;
  service?: string | null;
  message?: string | null;
  submittedFrom?: string | null;
  planName?: string | null;
  planPrice?: number | null;
  subtotal?: number | null;
  discountTotal?: number | null;
  iva?: number | null;
  total?: number | null;
  extras?: CartLine[];
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
  statusCode?: number;
  code?: string | number;
  error?: { message?: string };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_WITH_NAME_REGEX = /^[^<>]+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(typeof value === "number" && Number.isFinite(value) ? value : 0);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeFromAddress(rawValue: string | undefined, fallbackName: string) {
  const fallback = `${fallbackName} <onboarding@resend.dev>`;
  const value = String(rawValue || "").trim();
  if (!value) return fallback;

  if (EMAIL_REGEX.test(value)) {
    return value;
  }

  if (FROM_WITH_NAME_REGEX.test(value)) {
    return value.replace(/\s+/g, " ").trim();
  }

  const emailMatch = value.match(/[^\s<>,;:()]+@[^\s<>,;:()]+\.[^\s<>,;:()]+/);
  if (!emailMatch) return fallback;
  const email = emailMatch[0];
  if (!EMAIL_REGEX.test(email)) return fallback;

  const nameCandidate = value
    .replace(email, "")
    .replace(/[<>\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!nameCandidate) return email;
  return `${nameCandidate} <${email}>`;
}

function extractResendErrorMessage(body: ResendResponse | null) {
  const candidates = [body?.error?.message, body?.message, typeof body?.code === "string" ? body.code : null]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  return candidates[0] || "Resend rechazó el envío.";
}

function sourceLabel(source: LeadAlertInput["source"]) {
  if (source === "COTIZADOR_WEB") return "Cotizador web";
  if (source === "CHAT_IA") return "Asistente IA (chat)";
  return "Formulario contacto";
}

function renderRows(input: LeadAlertInput) {
  const rows = [
    ["Referencia", input.leadId.slice(0, 8).toUpperCase()],
    ["Origen", sourceLabel(input.source)],
    ["Fecha", formatDateTime(input.submittedAtIso)],
    ["Nombre", normalizeText(input.name) || "—"],
    ["Email", normalizeText(input.email) || "—"],
    ["Teléfono", normalizeText(input.phone) || "—"],
    ["Empresa", normalizeText(input.company) || "—"],
    ["Servicio", normalizeText(input.service) || "—"],
    ["Plan", normalizeText(input.planName) || "—"],
    ["URL origen", normalizeText(input.submittedFrom) || "—"],
  ];

  if (typeof input.planPrice === "number" && Number.isFinite(input.planPrice)) {
    rows.push(["Valor plan", formatCurrency(input.planPrice)]);
  }
  if (typeof input.subtotal === "number" && Number.isFinite(input.subtotal)) {
    rows.push(["Subtotal", formatCurrency(input.subtotal)]);
  }
  if (typeof input.discountTotal === "number" && Number.isFinite(input.discountTotal)) {
    rows.push(["Descuento", formatCurrency(input.discountTotal)]);
  }
  if (typeof input.iva === "number" && Number.isFinite(input.iva)) {
    rows.push(["IVA (19%)", formatCurrency(input.iva)]);
  }
  if (typeof input.total === "number" && Number.isFinite(input.total)) {
    rows.push(["Total", formatCurrency(input.total)]);
  }

  return rows;
}

function detailCell(label: string, value: string) {
  return `
    <td width="50%" style="padding:6px;">
      <div style="border:1px solid #e9eef5;border-radius:12px;padding:11px 13px;background:#f8fafc;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;">${escapeHtml(label)}</div>
        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:3px;word-break:break-word;">${value}</div>
      </div>
    </td>`;
}

function renderLeadAlertHtml(input: LeadAlertInput) {
  const message = normalizeText(input.message);
  const name = escapeHtml(normalizeText(input.name) || "Nuevo contacto");
  const email = normalizeText(input.email);
  const phone = normalizeText(input.phone);
  const contactLine = [email, phone].filter(Boolean).map(escapeHtml).join(" &nbsp;·&nbsp; ") || "Sin contacto directo";
  const adminUrl = `${siteConfig.url}/admin/contactos`;

  const details: Array<[string, string]> = [
    ["Servicio de interés", escapeHtml(normalizeText(input.service) || "—")],
    ["Empresa", escapeHtml(normalizeText(input.company) || "—")],
    ["Rubro", escapeHtml(normalizeText(input.industry) || "—")],
    ["Presupuesto estimado", escapeHtml(normalizeText(input.budget) || "—")],
    ["Plazo deseado", escapeHtml(normalizeText(input.deadline) || "—")],
    ["Origen", escapeHtml(sourceLabel(input.source))],
    ["Fecha", escapeHtml(formatDateTime(input.submittedAtIso))],
    ["Referencia", escapeHtml(input.leadId.slice(0, 8).toUpperCase())],
  ];

  const detailRows: string[] = [];
  for (let i = 0; i < details.length; i += 2) {
    const a = details[i]!;
    const b = details[i + 1];
    detailRows.push(`<tr>${detailCell(a[0], a[1])}${b ? detailCell(b[0], b[1]) : '<td width="50%"></td>'}</tr>`);
  }

  const totalsRows = renderRows(input)
    .filter(([label]) => ["Subtotal", "Descuento", "IVA (19%)", "Total", "Valor plan"].includes(label))
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 0;font-size:13px;color:#64748b;">${escapeHtml(label)}</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.08);">
          <!-- Header -->
          <tr><td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:26px 28px;">
            <table role="presentation" width="100%"><tr>
              <td style="color:#fff;font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.9;">Zyteron</td>
              <td style="text-align:right;color:#dbeafe;font-size:11px;font-weight:600;">Nueva oportunidad</td>
            </tr></table>
            <div style="color:#fff;font-size:22px;font-weight:800;margin-top:12px;">Nueva solicitud de cliente</div>
            <div style="color:#dbeafe;font-size:13px;margin-top:3px;">Vía ${escapeHtml(sourceLabel(input.source))}</div>
          </td></tr>

          <!-- Cliente hero -->
          <tr><td style="padding:22px 22px 6px;">
            <table role="presentation" width="100%" style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;"><tr>
              <td style="padding:16px 18px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Cliente</div>
                <div style="font-size:19px;font-weight:800;color:#0f172a;margin-top:4px;">${name}</div>
                <div style="font-size:13px;color:#475569;margin-top:4px;">${contactLine}</div>
              </td>
            </tr></table>
          </td></tr>

          <!-- Detalles -->
          <tr><td style="padding:8px 16px 4px;">
            <table role="presentation" width="100%">${detailRows.join("")}</table>
          </td></tr>

          ${
            message
              ? `<tr><td style="padding:10px 22px 4px;">
                  <div style="border:1px solid #e2e8f0;background:#ffffff;border-radius:12px;padding:14px 16px;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Mensaje / Necesidad</div>
                    <div style="font-size:14px;line-height:1.6;color:#1e293b;margin-top:6px;white-space:pre-line;">${escapeHtml(message)}</div>
                  </div>
                </td></tr>`
              : ""
          }
          ${
            totalsRows
              ? `<tr><td style="padding:10px 22px 4px;">
                  <div style="border:1px solid #e2e8f0;background:#ffffff;border-radius:12px;padding:12px 16px;">
                    <table role="presentation" width="100%">${totalsRows}</table>
                  </div>
                </td></tr>`
              : ""
          }

          <!-- CTA -->
          <tr><td style="padding:16px 22px 26px;">
            <a href="${adminUrl}" style="display:block;text-align:center;background:#1d4ed8;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px;border-radius:12px;">Ver contacto en el panel</a>
            <div style="text-align:center;color:#94a3b8;font-size:11px;margin-top:12px;">Responde pronto para no perder la oportunidad. Atención automática con IA de ${escapeHtml(ZYTERON_COMPANY.brandName)}.</div>
          </td></tr>
        </table>
        <div style="color:#94a3b8;font-size:11px;margin-top:14px;">${escapeHtml(ZYTERON_COMPANY.legalName)} · ${escapeHtml(ZYTERON_COMPANY.salesEmail)}</div>
      </td></tr>
    </table>
  </body>
</html>`;
}

function renderLeadAlertText(input: LeadAlertInput) {
  const lines: string[] = [
    "Nuevo lead web Zyteron",
    "",
    `Referencia: ${input.leadId.slice(0, 8).toUpperCase()}`,
    `Origen: ${sourceLabel(input.source)}`,
    `Fecha: ${formatDateTime(input.submittedAtIso)}`,
    `Nombre: ${normalizeText(input.name) || "—"}`,
    `Email: ${normalizeText(input.email) || "—"}`,
    `Teléfono: ${normalizeText(input.phone) || "—"}`,
    `Empresa: ${normalizeText(input.company) || "—"}`,
    `Servicio: ${normalizeText(input.service) || "—"}`,
    `Plan: ${normalizeText(input.planName) || "—"}`,
    `URL origen: ${normalizeText(input.submittedFrom) || "—"}`,
  ];

  if (typeof input.planPrice === "number") lines.push(`Valor plan: ${formatCurrency(input.planPrice)}`);
  if (typeof input.subtotal === "number") lines.push(`Subtotal: ${formatCurrency(input.subtotal)}`);
  if (typeof input.discountTotal === "number") lines.push(`Descuento: ${formatCurrency(input.discountTotal)}`);
  if (typeof input.iva === "number") lines.push(`IVA (19%): ${formatCurrency(input.iva)}`);
  if (typeof input.total === "number") lines.push(`Total: ${formatCurrency(input.total)}`);

  if (normalizeText(input.message)) {
    lines.push("", "Mensaje / Necesidad:", normalizeText(input.message));
  }

  if (input.extras && input.extras.length > 0) {
    lines.push("", "Extras seleccionados:");
    input.extras.forEach((item) => {
      lines.push(
        `- ${item.name} x${item.quantity} (${formatCurrency(item.unitPrice)} c/u, total ${formatCurrency(item.total)})`,
      );
    });
  }

  return lines.join("\n");
}

export async function sendLeadAlertEmail(input: LeadAlertInput) {
  // Web Push es independiente del correo: si Resend no está configurado, el
  // aviso del dispositivo debe seguir llegando.
  await sendAdminPushNotification(leadPushPayload(input)).catch((error) => {
    console.error("[admin-push] aviso de lead fallido:", error);
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { sent: false as const, reason: "missing_api_key" as const };
  }

  const toEmail = normalizeText(process.env.RESEND_LEAD_TO_EMAIL) || siteConfig.contact.email;
  const from = normalizeFromAddress(process.env.RESEND_FROM_EMAIL, ZYTERON_COMPANY.brandName);
  const replyTo = normalizeText(process.env.RESEND_REPLY_TO) || ZYTERON_COMPANY.salesEmail;
  const bcc = normalizeText(process.env.RESEND_BCC_EMAIL);

  const payload: Record<string, unknown> = {
    from,
    to: [toEmail],
    subject: `Nuevo lead web · ${sourceLabel(input.source)} · ${input.name}`,
    html: renderLeadAlertHtml(input),
    text: renderLeadAlertText(input),
    reply_to: EMAIL_REGEX.test(input.email) ? input.email : replyTo,
  };

  if (bcc) payload.bcc = [bcc];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
      "User-Agent": "zyteron-web/1.0",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as ResendResponse | null;
  if (!response.ok || !body?.id) {
    const message = extractResendErrorMessage(body);
    throw new Error(message);
  }

  return {
    sent: true as const,
    id: body.id,
  };
}

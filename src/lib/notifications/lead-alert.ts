import { ZYTERON_COMPANY } from "@/lib/company";

type CartLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type LeadAlertInput = {
  leadId: string;
  source: "CONTACTO_WEB" | "COTIZADOR_WEB";
  submittedAtIso: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
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

function renderLeadAlertHtml(input: LeadAlertInput) {
  const brand = escapeHtml(ZYTERON_COMPANY.brandName);
  const rows = renderRows(input)
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${escapeHtml(label)}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");

  const message = normalizeText(input.message);
  const extras = (input.extras || [])
    .map((line) => {
      const detail = `${line.name} x${line.quantity} · ${formatCurrency(line.unitPrice)} c/u · ${formatCurrency(line.total)}`;
      return `<li style="margin:0 0 8px;color:#334155;">${escapeHtml(detail)}</li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:26px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background:#ffffff;border:1px solid #dbe2ea;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#0f5fff,#0b3aa4);padding:20px 24px;color:#fff;">
                <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.95;">Nuevo lead web</p>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">${brand}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px;">
                <p style="margin:0 0 14px;font-size:15px;color:#334155;">
                  Se registró una nueva solicitud desde <strong>${escapeHtml(sourceLabel(input.source))}</strong>.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#f8fafc;">
                  ${rows}
                </table>
                ${
                  message
                    ? `
                <div style="margin-top:16px;border:1px solid #e2e8f0;background:#ffffff;border-radius:10px;padding:12px 14px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Mensaje / Necesidad</p>
                  <p style="margin:0;font-size:14px;line-height:1.65;color:#1e293b;white-space:pre-line;">${escapeHtml(message)}</p>
                </div>`
                    : ""
                }
                ${
                  extras
                    ? `
                <div style="margin-top:16px;border:1px solid #e2e8f0;background:#ffffff;border-radius:10px;padding:12px 14px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Extras seleccionados</p>
                  <ul style="padding-left:18px;margin:0;">${extras}</ul>
                </div>`
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
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { sent: false as const, reason: "missing_api_key" as const };
  }

  const toEmail = normalizeText(process.env.RESEND_LEAD_TO_EMAIL) || "eduardo.avila@zyteron.cl";
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


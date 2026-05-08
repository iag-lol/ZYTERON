import { ZYTERON_COMPANY } from "@/lib/company";
import type { CheckoutMeta } from "@/lib/checkout/orders";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_WITH_NAME_REGEX = /^[^<>]+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;

type Input = {
  orderId: string;
  recipientEmail: string;
  recipientName: string;
  flowStatus: number;
  flowLabel: string;
  meta: CheckoutMeta;
  checkoutUrl?: string | null;
};

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

function formatDate(value?: string | null) {
  if (!value) return "No disponible";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No disponible";
  return parsed.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value?: string | null) {
  const source = normalizeText(value);
  if (!source) return "";
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeFromAddress(rawValue: string | undefined, fallbackName: string) {
  const fallback = `${fallbackName} <onboarding@resend.dev>`;
  const value = String(rawValue || "").trim();
  if (!value) return fallback;

  if (EMAIL_REGEX.test(value)) return value;
  if (FROM_WITH_NAME_REGEX.test(value)) return value.replace(/\s+/g, " ").trim();

  const emailMatch = value.match(/[^\s<>,;:()]+@[^\s<>,;:()]+\.[^\s<>,;:()]+/);
  if (!emailMatch) return fallback;

  const email = emailMatch[0];
  const name = value
    .replace(email, "")
    .replace(/[<>\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return name ? `${name} <${email}>` : email;
}

function titleByStatus(status: number) {
  if (status === 2) return "Compra confirmada";
  if (status === 3 || status === 4) return "Pago rechazado";
  return "Pago en proceso";
}

function bodyByStatus(status: number) {
  if (status === 2) return "Tu compra fue aprobada. Estamos coordinando despacho.";
  if (status === 3 || status === 4) return "Tu pago fue rechazado o anulado. Puedes intentar nuevamente.";
  return "Tu pago está pendiente de confirmación.";
}

function nextStepByStatus(status: number, checkoutUrl?: string | null) {
  if (status === 2) {
    return "Nuestro equipo de operaciones validará stock, emitirá tu documento tributario y te contactará para coordinar despacho.";
  }
  if (status === 3 || status === 4) {
    return checkoutUrl
      ? `Puedes intentar el pago nuevamente desde este enlace: ${checkoutUrl}`
      : "Puedes solicitar un nuevo enlace de pago respondiendo este correo.";
  }
  return "Tu orden quedó registrada y será actualizada cuando Flow confirme el estado final del pago.";
}

function statusStyles(status: number) {
  if (status === 2) {
    return {
      badgeBg: "#ECFDF3",
      badgeBorder: "#A7F3D0",
      badgeColor: "#047857",
      panelBorder: "#A7F3D0",
      panelBg: "#F0FDF4",
    };
  }
  if (status === 3 || status === 4) {
    return {
      badgeBg: "#FFF1F2",
      badgeBorder: "#FECDD3",
      badgeColor: "#BE123C",
      panelBorder: "#FECDD3",
      panelBg: "#FFF5F5",
    };
  }
  return {
    badgeBg: "#EFF6FF",
    badgeBorder: "#BFDBFE",
    badgeColor: "#1D4ED8",
    panelBorder: "#BFDBFE",
    panelBg: "#F8FAFF",
  };
}

function renderText(input: Input) {
  const statusDetail = `${input.flowLabel} (${input.flowStatus})`;
  const customer = input.meta.customer;
  const lines = [
    `${ZYTERON_COMPANY.brandName} - ${titleByStatus(input.flowStatus)}`,
    "",
    `Orden: ${input.orderId}`,
    `Estado: ${statusDetail}`,
    `Cliente: ${input.recipientName}`,
    `Documento: ${customer.documentType}`,
    `RUT comprador: ${customer.buyerRut}`,
    `Dirección: ${customer.address}`,
    customer.commune ? `Comuna: ${customer.commune}` : "",
    customer.city ? `Ciudad: ${customer.city}` : "",
    customer.documentType === "FACTURA" && customer.companyName ? `Empresa: ${customer.companyName}` : "",
    customer.documentType === "FACTURA" && customer.companyRut ? `RUT empresa: ${customer.companyRut}` : "",
    customer.documentType === "FACTURA" && customer.companyBusinessLine ? `Giro: ${customer.companyBusinessLine}` : "",
    "",
    "Productos:",
    ...input.meta.items.map(
      (item) => `- ${item.name} x${item.quantity} · ${formatCurrency(item.finalUnitPrice)} c/u · ${formatCurrency(item.lineTotal)}`,
    ),
    "",
    `Subtotal: ${formatCurrency(input.meta.subtotal)}`,
    `Descuento: ${formatCurrency(input.meta.discount)}`,
    `Total: ${formatCurrency(input.meta.total)}`,
    input.meta.customer.comments ? `Comentarios: ${input.meta.customer.comments}` : "",
    "",
    `Última actualización: ${formatDate(input.meta.flow.updatedAt)}`,
    "",
    bodyByStatus(input.flowStatus),
    nextStepByStatus(input.flowStatus, input.checkoutUrl),
    input.checkoutUrl ? `Link de pago: ${input.checkoutUrl}` : "",
    "",
    "Seguimiento:",
    `- Responde este correo: ${ZYTERON_COMPANY.salesEmail}`,
    `- WhatsApp ventas: ${ZYTERON_COMPANY.phone}`,
    `${ZYTERON_COMPANY.salesEmail} · ${ZYTERON_COMPANY.phone}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function renderHtml(input: Input) {
  const styles = statusStyles(input.flowStatus);
  const customer = input.meta.customer;
  const statusText = `${input.flowLabel} (${input.flowStatus})`;
  const comment = normalizeText(customer.comments);
  const detailRows = input.meta.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.name)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(item.finalUnitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">${formatCurrency(item.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  const retryCta =
    input.checkoutUrl && (input.flowStatus === 1 || input.flowStatus === 3 || input.flowStatus === 4)
      ? `
        <tr>
          <td style="padding-top:16px;">
            <a href="${escapeHtml(input.checkoutUrl)}" style="display:inline-block;padding:10px 16px;background:#0F5FFF;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:700;">
              Continuar o reintentar pago
            </a>
          </td>
        </tr>`
      : "";

  return `
  <div style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe2ea;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:24px 24px 10px 24px;background:#ffffff;">
          <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${ZYTERON_COMPANY.brandName}</p>
          <h2 style="margin:0 0 8px 0;font-size:24px;line-height:1.2;color:#0f172a;">${titleByStatus(input.flowStatus)}</h2>
          <p style="margin:0 0 14px 0;font-size:14px;color:#334155;">${bodyByStatus(input.flowStatus)}</p>
          <span style="display:inline-block;background:${styles.badgeBg};color:${styles.badgeColor};border:1px solid ${styles.badgeBorder};padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;">
            Estado: ${escapeHtml(statusText)}
          </span>
        </td>
      </tr>

      <tr>
        <td style="padding:0 24px 18px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${styles.panelBorder};background:${styles.panelBg};border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 8px 0;font-size:13px;"><strong>Orden:</strong> ${escapeHtml(input.orderId)}</p>
              <p style="margin:0 0 8px 0;font-size:13px;"><strong>Cliente:</strong> ${escapeHtml(input.recipientName)}</p>
              <p style="margin:0 0 8px 0;font-size:13px;"><strong>Correo:</strong> ${escapeHtml(input.recipientEmail)}</p>
              <p style="margin:0 0 8px 0;font-size:13px;"><strong>Documento:</strong> ${escapeHtml(customer.documentType)}</p>
              <p style="margin:0 0 8px 0;font-size:13px;"><strong>RUT comprador:</strong> ${escapeHtml(customer.buyerRut)}</p>
              <p style="margin:0 0 8px 0;font-size:13px;"><strong>Dirección:</strong> ${escapeHtml(customer.address)}</p>
              <p style="margin:0 0 8px 0;font-size:13px;"><strong>Comuna/Ciudad:</strong> ${escapeHtml(customer.commune || "—")} · ${escapeHtml(customer.city || "—")}</p>
              ${
                customer.documentType === "FACTURA"
                  ? `
                <p style="margin:0 0 8px 0;font-size:13px;"><strong>Empresa:</strong> ${escapeHtml(customer.companyName || "—")}</p>
                <p style="margin:0 0 8px 0;font-size:13px;"><strong>RUT empresa:</strong> ${escapeHtml(customer.companyRut || "—")}</p>
                <p style="margin:0;font-size:13px;"><strong>Giro:</strong> ${escapeHtml(customer.companyBusinessLine || "—")}</p>
              `
                  : ""
              }
            </td></tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:0 24px 8px 24px;">
          <h3 style="margin:0 0 10px 0;font-size:14px;color:#0f172a;">Detalle del pedido</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#ffffff;">
            <tr style="background:#f8fafc;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#475569;">Producto</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#475569;">Cant.</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#475569;">Unitario</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#475569;">Total</th>
            </tr>
            ${detailRows}
            <tr>
              <td colspan="3" style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;">Subtotal</td>
              <td style="padding:10px 12px;text-align:right;font-size:12px;color:#0f172a;">${formatCurrency(input.meta.subtotal)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;">Descuento</td>
              <td style="padding:10px 12px;text-align:right;font-size:12px;color:#047857;">-${formatCurrency(input.meta.discount)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding:12px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">Total final</td>
              <td style="padding:12px;text-align:right;font-size:16px;font-weight:800;color:#0F5FFF;border-top:1px solid #e2e8f0;">${formatCurrency(input.meta.total)}</td>
            </tr>
          </table>
          ${
            comment
              ? `<p style="margin:10px 0 0 0;font-size:12px;color:#475569;"><strong>Comentarios:</strong> ${escapeHtml(comment)}</p>`
              : ""
          }
        </td>
      </tr>

      <tr>
        <td style="padding:16px 24px 6px 24px;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#334155;"><strong>Siguiente paso:</strong> ${escapeHtml(nextStepByStatus(input.flowStatus, input.checkoutUrl))}</p>
          <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">Última actualización: ${formatDate(input.meta.flow.updatedAt)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">${retryCta}</table>
        </td>
      </tr>

      <tr>
        <td style="padding:16px 24px 24px 24px;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 6px 0;font-size:12px;color:#334155;"><strong>Seguimiento de tu compra</strong></p>
          <p style="margin:0;font-size:12px;color:#64748b;">
            Puedes responder este correo o contactarnos por WhatsApp para seguimiento de despacho, documento tributario y estado del pedido.<br />
            ${escapeHtml(ZYTERON_COMPANY.salesEmail)} · ${escapeHtml(ZYTERON_COMPANY.phone)}
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function sendCheckoutStatusEmail(input: Input) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return { sent: false as const, reason: "missing_api_key" as const };

  const to = normalizeText(input.recipientEmail);
  if (!EMAIL_REGEX.test(to)) return { sent: false as const, reason: "invalid_to" as const };

  const from = normalizeFromAddress(process.env.RESEND_FROM_EMAIL, ZYTERON_COMPANY.brandName);
  const replyTo = normalizeText(process.env.RESEND_REPLY_TO) || ZYTERON_COMPANY.salesEmail;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "zyteron-web/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${ZYTERON_COMPANY.brandName} · ${titleByStatus(input.flowStatus)} · ${input.orderId}`,
      html: renderHtml(input),
      text: renderText(input),
      reply_to: replyTo,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.message || `No se pudo enviar correo (${response.status}).`);
  }

  return { sent: true as const, id: payload.id };
}

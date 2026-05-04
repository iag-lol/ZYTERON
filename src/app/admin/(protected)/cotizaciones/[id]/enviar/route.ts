import { NextResponse } from "next/server";
import { getQuoteById, updateRows } from "@/lib/admin/repository";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
import { currencyCLP } from "@/lib/admin/quote";
import { ZYTERON_COMPANY } from "@/lib/company";

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
  statusCode?: number;
  code?: string | number;
  error?: { message?: string };
};

type ResendEmailDetail = {
  id?: string;
  last_event?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_WITH_NAME_REGEX = /^[^<>]+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;
const QUOTE_INTERNAL_COPY_EMAIL = "eduardo.avila@zyteron.cl";

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/cotizaciones")) return "/admin/cotizaciones";
  return path;
}

function normalizeStatus(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "PENDING" || normalized === "SENT" || normalized === "WON" || normalized === "LOST") {
    return normalized;
  }
  return "PENDING";
}

function errorRedirect(requestUrl: string, redirectTo: string, message: string) {
  const url = new URL(redirectTo, requestUrl);
  url.searchParams.set("email_error", message);
  return NextResponse.redirect(url, { status: 303 });
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

  // Intenta rescatar un email dentro de un string inválido.
  const emailMatch = value.match(/[^\s<>,;:()]+@[^\s<>,;:()]+\.[^\s<>,;:()]+/);
  if (!emailMatch) {
    return fallback;
  }

  const email = emailMatch[0];
  if (!EMAIL_REGEX.test(email)) {
    return fallback;
  }

  const nameCandidate = value
    .replace(email, "")
    .replace(/[<>\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!nameCandidate) return email;

  return `${nameCandidate} <${email}>`;
}

function extractResendErrorMessage(body: ResendResponse | null) {
  const candidates = [
    body?.error?.message,
    body?.message,
    typeof body?.code === "string" ? body.code : null,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (candidates.length > 0) return candidates[0];
  return "Resend rechazó el envío.";
}

function isDeliveryFailureEvent(event?: string | null) {
  const normalized = String(event || "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("bounce") ||
    normalized.includes("fail") ||
    normalized.includes("reject") ||
    normalized.includes("complain")
  );
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function renderQuoteEmailHtml(input: {
  clientName: string;
  quoteNumber: string;
  issuedAt?: string | null;
  validUntil?: string | null;
  subtotal: number;
  discount: number;
  iva: number;
  total: number;
}) {
  const clientName = escapeHtml(input.clientName);
  const quoteNumber = escapeHtml(input.quoteNumber);
  const issueDate = escapeHtml(formatDate(input.issuedAt));
  const validUntil = escapeHtml(formatDate(input.validUntil));
  const subtotal = escapeHtml(currencyCLP(input.subtotal));
  const discount = escapeHtml(currencyCLP(input.discount));
  const iva = escapeHtml(currencyCLP(input.iva));
  const total = escapeHtml(currencyCLP(input.total));
  const brand = escapeHtml(ZYTERON_COMPANY.brandName);
  const legal = escapeHtml(ZYTERON_COMPANY.legalName);
  const email = escapeHtml(ZYTERON_COMPANY.salesEmail);
  const phone = escapeHtml(ZYTERON_COMPANY.phone);
  const website = escapeHtml(ZYTERON_COMPANY.website);

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #dbe2ea;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#0f5fff,#0b3aa4);padding:22px 28px;color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.9;">Cotización comercial</p>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">${brand}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${clientName}</strong>,</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
                  Adjuntamos la cotización <strong>${quoteNumber}</strong>. Revisa el documento PDF con el detalle técnico y comercial.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#f8fafc;">
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">N° cotización</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;color:#0f172a;">${quoteNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">Fecha de emisión</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;color:#0f172a;">${issueDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">Válida hasta</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;color:#0f172a;">${validUntil}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">Subtotal</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;color:#0f172a;">${subtotal}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">Descuento</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;color:#0f172a;">-${discount}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">IVA (19%)</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;color:#0f172a;">${iva}</td>
                  </tr>
                  <tr>
                    <td style="padding:16px;font-size:14px;font-weight:800;color:#0f172a;">Total</td>
                    <td style="padding:16px;font-size:18px;font-weight:900;text-align:right;color:#0f5fff;">${total}</td>
                  </tr>
                </table>

                <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#475569;">
                  Si tienes observaciones o quieres confirmar la aprobación, responde este correo y te apoyamos de inmediato.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;background:#0f172a;color:#cbd5e1;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#ffffff;">${legal}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;">
                  Email: <a href="mailto:${email}" style="color:#93c5fd;text-decoration:none;">${email}</a><br/>
                  Teléfono: <a href="tel:${phone.replace(/\s+/g, "")}" style="color:#93c5fd;text-decoration:none;">${phone}</a><br/>
                  Web: <a href="${website}" style="color:#93c5fd;text-decoration:none;">${website}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderQuoteEmailText(input: {
  clientName: string;
  quoteNumber: string;
  issuedAt?: string | null;
  validUntil?: string | null;
  subtotal: number;
  discount: number;
  iva: number;
  total: number;
}) {
  return [
    `Hola ${input.clientName},`,
    "",
    `Adjuntamos la cotización ${input.quoteNumber}.`,
    `Fecha de emisión: ${formatDate(input.issuedAt)}`,
    `Válida hasta: ${formatDate(input.validUntil)}`,
    "",
    "Resumen:",
    `- Subtotal: ${currencyCLP(input.subtotal)}`,
    `- Descuento: -${currencyCLP(input.discount)}`,
    `- IVA (19%): ${currencyCLP(input.iva)}`,
    `- Total: ${currencyCLP(input.total)}`,
    "",
    "Si tienes observaciones, responde este correo y te ayudamos de inmediato.",
    "",
    `${ZYTERON_COMPANY.legalName}`,
    `${ZYTERON_COMPANY.salesEmail}`,
    `${ZYTERON_COMPANY.phone}`,
    `${ZYTERON_COMPANY.website}`,
  ].join("\n");
}

function uniqueEmails(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || !EMAIL_REGEX.test(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  const isJsonRequest = contentType.includes("application/json");
  let redirectTo = "/admin/cotizaciones";
  if (!isJsonRequest) {
    const formData = await request.formData();
    redirectTo = safeRedirectPath(formData.get("redirectTo"));
  }

  const quote = await getQuoteById(id);
  if (!quote) {
    return isJsonRequest
      ? jsonError("No se encontró la cotización.", 404)
      : errorRedirect(request.url, redirectTo, "No se encontró la cotización.");
  }

  const toEmail = String(quote.email || "").trim();
  if (!toEmail) {
    return isJsonRequest
      ? jsonError("La cotización no tiene email del cliente.")
      : errorRedirect(request.url, redirectTo, "La cotización no tiene email del cliente.");
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return isJsonRequest
      ? jsonError("Falta RESEND_API_KEY en variables de entorno.", 500)
      : errorRedirect(request.url, redirectTo, "Falta RESEND_API_KEY en variables de entorno.");
  }

  const from = normalizeFromAddress(process.env.RESEND_FROM_EMAIL, ZYTERON_COMPANY.brandName);
  const replyTo = QUOTE_INTERNAL_COPY_EMAIL;
  const bcc = process.env.RESEND_BCC_EMAIL || undefined;

  try {
    const pdfBytes = await generateQuotePdf({
      quoteId: quote.id,
      clientName: quote.name || "Cliente",
      clientEmail: quote.email || null,
      clientPhone: quote.phone || null,
      clientCompany: quote.company || null,
      status: quote.status || "PENDING",
      createdAt: quote.createdAt || null,
      meta: quote.meta,
    });

    const attachmentName = `${quote.displayNumber || quote.id}.pdf`;
    const attachmentBase64 = Buffer.from(pdfBytes).toString("base64");

    const subject = `Cotización ${quote.displayNumber} · ${ZYTERON_COMPANY.brandName}`;
    const html = renderQuoteEmailHtml({
      clientName: quote.name || "cliente",
      quoteNumber: quote.displayNumber,
      issuedAt: quote.issuedAt,
      validUntil: quote.meta.validUntil,
      subtotal: quote.meta.subtotal || 0,
      discount: quote.meta.totalDescuento || 0,
      iva: quote.meta.iva || 0,
      total: quote.totalAmount || 0,
    });
    const text = renderQuoteEmailText({
      clientName: quote.name || "cliente",
      quoteNumber: quote.displayNumber,
      issuedAt: quote.issuedAt,
      validUntil: quote.meta.validUntil,
      subtotal: quote.meta.subtotal || 0,
      discount: quote.meta.totalDescuento || 0,
      iva: quote.meta.iva || 0,
      total: quote.totalAmount || 0,
    });

    const ccRecipients = uniqueEmails([QUOTE_INTERNAL_COPY_EMAIL]).filter(
      (email) => email !== String(toEmail || "").trim().toLowerCase(),
    );

    const payload: Record<string, unknown> = {
      from,
      to: [toEmail],
      subject,
      html,
      text,
      reply_to: replyTo,
      attachments: [
        {
          filename: attachmentName,
          content: attachmentBase64,
        },
      ],
    };
    if (ccRecipients.length > 0) {
      payload.cc = ccRecipients;
    }
    if (bcc) {
      payload.bcc = [bcc];
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
        "User-Agent": "zyteron-admin/1.0",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = (await response.json().catch(() => null)) as ResendResponse | null;
    if (!response.ok || !body?.id) {
      const message = extractResendErrorMessage(body);
      console.error("[resend/send-quote] send failed", {
        status: response.status,
        body,
        quoteId: quote.id,
        toEmail,
      });
      return isJsonRequest
        ? jsonError(message, response.status || 400)
        : errorRedirect(request.url, redirectTo, message);
    }

    let lastEvent: string | undefined;
    try {
      const detailResponse = await fetch(`https://api.resend.com/emails/${body.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "User-Agent": "zyteron-admin/1.0",
        },
        cache: "no-store",
      });
      if (detailResponse.ok) {
        const detail = (await detailResponse.json().catch(() => null)) as ResendEmailDetail | null;
        lastEvent = detail?.last_event;
      }
    } catch {
      // Si la consulta de estado falla, no bloqueamos el envío ya aceptado por Resend.
    }

    if (isDeliveryFailureEvent(lastEvent)) {
      const message = `Resend reportó estado de entrega fallido: ${lastEvent}.`;
      return isJsonRequest
        ? jsonError(message, 400)
        : errorRedirect(request.url, redirectTo, message);
    }

    const status = normalizeStatus(quote.status);
    if (status === "PENDING") {
      await updateRows("Quote", { status: "SENT" }, { id: quote.id });
    }

    if (isJsonRequest) {
      return NextResponse.json({
        ok: true,
        message: "MENSAJE ENVIADO",
        emailId: body.id,
        emailEvent: lastEvent || null,
      });
    }

    const url = new URL(redirectTo, request.url);
    url.searchParams.set("email_sent", "1");
    url.searchParams.set("email_id", body.id);
    if (lastEvent) {
      url.searchParams.set("email_event", lastEvent);
    }
    return NextResponse.redirect(url, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar la cotización por correo.";
    return isJsonRequest
      ? jsonError(message, 500)
      : errorRedirect(request.url, redirectTo, message);
  }
}

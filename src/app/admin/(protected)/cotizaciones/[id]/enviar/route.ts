import { NextResponse } from "next/server";
import { getQuoteById, updateRows } from "@/lib/admin/repository";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));

  const quote = await getQuoteById(id);
  if (!quote) {
    return errorRedirect(request.url, redirectTo, "No se encontró la cotización.");
  }

  const toEmail = String(quote.email || "").trim();
  if (!toEmail) {
    return errorRedirect(request.url, redirectTo, "La cotización no tiene email del cliente.");
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return errorRedirect(request.url, redirectTo, "Falta RESEND_API_KEY en variables de entorno.");
  }

  const from = normalizeFromAddress(process.env.RESEND_FROM_EMAIL, ZYTERON_COMPANY.brandName);
  const replyTo = process.env.RESEND_REPLY_TO || ZYTERON_COMPANY.salesEmail;
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

    const subject = `Cotización ${quote.displayNumber} - ${ZYTERON_COMPANY.brandName}`;
    const html = `
      <p>Hola ${quote.name || "equipo"},</p>
      <p>Te compartimos la cotización <strong>${quote.displayNumber}</strong> en archivo adjunto.</p>
      <p>Si tienes observaciones, responde este correo y te ayudamos de inmediato.</p>
      <p>Saludos,<br/>${ZYTERON_COMPANY.legalName}<br/>${ZYTERON_COMPANY.salesEmail}<br/>${ZYTERON_COMPANY.phone}</p>
    `;

    const payload: Record<string, unknown> = {
      from,
      to: [toEmail],
      subject,
      html,
      reply_to: replyTo,
      attachments: [
        {
          filename: attachmentName,
          content: attachmentBase64,
        },
      ],
    };
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
      return errorRedirect(request.url, redirectTo, message);
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
      return errorRedirect(
        request.url,
        redirectTo,
        `Resend reportó estado de entrega fallido: ${lastEvent}.`,
      );
    }

    const status = normalizeStatus(quote.status);
    if (status === "PENDING") {
      await updateRows("Quote", { status: "SENT" }, { id: quote.id });
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
    return errorRedirect(request.url, redirectTo, message);
  }
}

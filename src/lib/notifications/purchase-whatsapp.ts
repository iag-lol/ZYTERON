import { ZYTERON_COMPANY } from "@/lib/company";

type PurchaseWhatsappInput = {
  orderId: string;
  customerName: string;
  totalAmount: number;
  documentType: "BOLETA" | "FACTURA";
  invoiceUrl?: string | null;
};

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhatsappAddress(raw: string) {
  const value = normalizeText(raw);
  if (!value) return "";
  const normalized = value.replace(/\s+/g, "");
  return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
}

function parseWhatsappRecipients(raw: string | undefined) {
  return Array.from(
    new Set(
      String(raw || "")
        .split(/[,\n;]/)
        .map((value) => normalizeWhatsappAddress(value))
        .filter(Boolean),
    ),
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value || 0)));
}

function buildFallbackBody(input: PurchaseWhatsappInput) {
  const lines = [
    `Compra confirmada #${input.orderId}`,
    `Cliente: ${input.customerName}`,
    `Total pagado: ${formatCurrency(input.totalAmount)}`,
    `Documento: ${input.documentType}`,
    input.invoiceUrl ? `PDF: ${input.invoiceUrl}` : "",
    `Equipo ${ZYTERON_COMPANY.brandName}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function sendPurchaseWhatsappNotification(input: PurchaseWhatsappInput) {
  const accountSid = normalizeText(process.env.TWILIO_ACCOUNT_SID);
  const authToken = normalizeText(process.env.TWILIO_AUTH_TOKEN);
  const from = normalizeWhatsappAddress(
    normalizeText(process.env.TWILIO_WHATSAPP_FROM) || "whatsapp:+14155238886",
  );
  const recipients = parseWhatsappRecipients(
    normalizeText(process.env.TWILIO_WHATSAPP_TO) || normalizeText(process.env.WHATSAPP_NOTIFY_TO),
  );
  const contentSid = normalizeText(process.env.TWILIO_CONTENT_SID);

  if (!accountSid || !authToken || !from || recipients.length === 0) {
    return {
      sent: false as const,
      reason: "missing_config" as const,
    };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const contentVariables = JSON.stringify({
    "1": input.orderId,
    "2": input.customerName,
    "3": formatCurrency(input.totalAmount),
    "4": input.documentType,
    "5": input.invoiceUrl || "No disponible",
  });

  const sent: string[] = [];
  const failed: Array<{ to: string; error: string }> = [];

  for (const to of recipients) {
    const body = new URLSearchParams();
    body.set("From", from);
    body.set("To", to);

    if (contentSid) {
      body.set("ContentSid", contentSid);
      body.set("ContentVariables", contentVariables);
    } else {
      body.set("Body", buildFallbackBody(input));
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { sid?: string; message?: string; code?: number }
      | null;

    if (!response.ok || !payload?.sid) {
      failed.push({
        to,
        error: payload?.message || `Twilio ${response.status}`,
      });
      continue;
    }

    sent.push(payload.sid);
  }

  if (sent.length === 0) {
    throw new Error(failed[0]?.error || "No se pudo enviar WhatsApp por Twilio.");
  }

  return {
    sent: true as const,
    messageSids: sent,
    failed,
  };
}

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

export async function sendAdminWhatsappNotification(messageText: string) {
  const accountSid = normalizeText(process.env.TWILIO_ACCOUNT_SID);
  const authToken = normalizeText(process.env.TWILIO_AUTH_TOKEN);
  const from = normalizeWhatsappAddress(
    normalizeText(process.env.TWILIO_WHATSAPP_FROM) || "whatsapp:+14155238886",
  );
  // Enviar al Admin (usando WHATSAPP_NOTIFY_TO o TWILIO_WHATSAPP_TO)
  const recipients = parseWhatsappRecipients(
    normalizeText(process.env.WHATSAPP_NOTIFY_TO) || normalizeText(process.env.TWILIO_WHATSAPP_TO),
  );

  if (!accountSid || !authToken || !from || recipients.length === 0) {
    console.warn("Falta configuración de Twilio para notificaciones de Admin.");
    return {
      sent: false as const,
      reason: "missing_config" as const,
    };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const sent: string[] = [];
  const failed: Array<{ to: string; error: string }> = [];

  for (const to of recipients) {
    const body = new URLSearchParams();
    body.set("From", from);
    body.set("To", to);
    body.set("Body", messageText);

    try {
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
        console.error(`Twilio error enviando a ${to}:`, payload?.message || response.status);
        failed.push({
          to,
          error: payload?.message || `Twilio ${response.status}`,
        });
        continue;
      }

      sent.push(payload.sid);
    } catch (err) {
      console.error(`Error enviando notificación WhatsApp a ${to}:`, err);
      failed.push({ to, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  if (sent.length === 0) {
    console.error("No se pudo enviar la notificación de WhatsApp al administrador:", failed);
  }

  return {
    sent: sent.length > 0,
    messageSids: sent,
    failed,
  };
}

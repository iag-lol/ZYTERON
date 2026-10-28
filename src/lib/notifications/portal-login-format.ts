export type PortalLoginIdentity = {
  name: string;
  email: string;
  company: string | null;
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

export function portalLoginMessage(
  identity: PortalLoginIdentity,
  occurredAt: Date,
  provider: string,
) {
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(occurredAt);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  const date = `${part("day")}-${part("month")}-${part("year")} ${part("hour")}:${part("minute")}`;
  const label = (identity.company || identity.name || identity.email)
    .replace(/[\r\n]/g, " ")
    .slice(0, 160);
  const subject = `Zyteron | Ingreso de cliente: ${label}`;
  const text = [
    "Un cliente inició sesión correctamente en su perfil de Zyteron.",
    `Cliente: ${identity.name}`,
    `Empresa: ${identity.company || "Sin empresa registrada"}`,
    `Correo: ${identity.email}`,
    `Fecha y hora: ${date} (Chile continental)`,
    `Método: ${provider === "google" ? "Google" : "Correo o RUT y contraseña"}`,
    "Administración: https://www.zyteron.cl/administracion/clients",
  ].join("\n");
  return {
    subject,
    text,
    html: `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;color:#172b24;background:#f4f6f0;padding:24px"><div style="max-width:600px;margin:auto;background:white;border:1px solid #dce3d7;border-radius:16px;padding:28px"><h1 style="font-size:24px">Ingreso de cliente</h1><p style="white-space:pre-wrap;line-height:1.7">${escapeHtml(text)}</p></div></body></html>`,
  };
}

export type LoginMailJob = {
  id: string;
  recipient: string;
  subject: string;
  body_text: string;
  body_html: string;
  sender: string | null;
  first_attempt_at: Date | null;
  attempts: number;
};

export function loginMailNeedsReview(firstAttempt: Date | null, now = Date.now()) {
  // Resend retains idempotency keys for 24 hours; older uncertain sends need reconciliation.
  return !!firstAttempt && now - firstAttempt.getTime() >= 23 * 60 * 60 * 1000;
}

export async function deliverPortalLoginMail(
  job: LoginMailJob,
  apiKey: string,
  transport: typeof fetch = fetch,
) {
  const response = await transport("https://api.resend.com/emails", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `zyteron-portal-login/${job.id}`,
    },
    body: JSON.stringify({
      from: job.sender,
      to: [job.recipient],
      subject: job.subject,
      text: job.body_text,
      html: job.body_html,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.id !== "string")
    throw Error(`LOGIN_EMAIL_HTTP_${response.status}`);
  return data.id as string;
}

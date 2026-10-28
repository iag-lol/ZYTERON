export type ContactEvent = {
  kind: string;
  title: string;
  body: string;
  href: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  html?: string;
  subject?: string;
  replyTo?: string;
  occurredAt?: string | null;
};
export const escapeContactHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
export function contactText(p: ContactEvent) {
  return [
    p.title,
    p.name && `Cliente: ${p.name}`,
    p.email && `Correo: ${p.email}`,
    p.phone && `Teléfono: ${p.phone}`,
    p.body,
    `https://www.zyteron.cl${p.href}`,
  ]
    .filter(Boolean)
    .join("\n");
}
export function legacyContactHtml(p: ContactEvent) {
  const e = escapeContactHtml;
  return `<!doctype html><html lang="es"><body style="background:#f3f6ee;font-family:Arial,sans-serif;color:#18372d;padding:24px"><main style="max-width:600px;margin:auto;background:#fff;border:1px solid #d6e1d9;border-radius:20px;overflow:hidden"><header style="background:#193b30;padding:24px;color:white"><small style="color:#c9f46d;letter-spacing:2px">ZYTERON · CONTACTOS</small><h1 style="font-size:22px">${e(p.title)}</h1></header><section style="padding:24px"><h2 style="font-size:19px">${e(p.name || "Nuevo contacto")}</h2><p>${[
    p.email,
    p.phone,
  ]
    .filter(Boolean)
    .map((v) => e(v!))
    .join(
      " · ",
    )}</p><p style="white-space:pre-wrap;line-height:1.7;background:#f5f7f2;padding:16px;border-radius:12px">${e(p.body)}</p><a href="https://www.zyteron.cl${e(p.href)}" style="display:block;padding:14px;background:#c9f46d;border-radius:12px;color:#17382c;text-align:center;text-decoration:none;font-weight:bold">Abrir conversación en Zyteron</a></section></main></body></html>`;
}
export function parseNotificationRecipients(value: string, channel: "EMAIL" | "WHATSAPP") {
  const recipients = value
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => (channel === "EMAIL" ? v.toLowerCase() : v.replace(/\D/g, "")));
  return [...new Set(recipients)]
    .filter((v) =>
      channel === "EMAIL" ? /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v) : /^\d{8,15}$/.test(v),
    )
    .slice(0, 10);
}

export function contactTemplateSummary(p: ContactEvent) {
  return [
    p.title.slice(0, 100),
    p.name?.slice(0, 100),
    p.email?.slice(0, 100),
    p.phone?.slice(0, 30),
    p.body.replace(/\s+/g, " ").slice(0, 400),
    `https://www.zyteron.cl${p.href}`,
  ]
    .filter(Boolean)
    .join(" · ")
    .replace(/[\r\n\t]/g, " ")
    .slice(0, 1000);
}

function contactMessageDate(value?: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${part("day")}-${part("month")}-${part("year")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export function contactHtml(p: ContactEvent) {
  if (!["whatsapp", "web"].includes(p.kind)) return legacyContactHtml(p);
  const e = escapeContactHtml;
  const channel = p.kind === "whatsapp" ? "WhatsApp" : "Chat web";
  const name =
    p.name?.trim() || (p.kind === "whatsapp" ? "Cliente de WhatsApp" : "Visitante del chat");
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const when = contactMessageDate(p.occurredAt);
  const details = [p.phone, p.email]
    .filter((value) => value && value !== name)
    .map((value) => e(value!))
    .join(" &nbsp;·&nbsp; ");
  const href =
    p.href.startsWith("/administracion/") && !/[\\\r\n]/.test(p.href) ? p.href : "/administracion";
  const message = e(p.body || "Mensaje recibido sin texto.").replace(/\r\n|\r|\n/g, "<br />");
  const preview = e(`${channel} · ${name}: ${p.body.replace(/\s+/g, " ").slice(0, 140)}`);
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Nuevo mensaje · ${channel}</title></head>
<body style="margin:0;padding:0;background-color:#f1f4ef;font-family:Arial,Helvetica,sans-serif;color:#203b30;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preview}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1f4ef"><tr><td align="center" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:640px;border:1px solid #dce4d8;border-radius:18px;overflow:hidden;">
<tr><td bgcolor="#244337" style="padding:23px 26px;background-color:#244337;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="font-size:27px;font-weight:bold;letter-spacing:-1px;color:#ffffff;">zyteron<span style="color:#c5d998;">.</span></td><td align="right" style="font-size:10px;color:#d4dfca;letter-spacing:1.7px;">CONVERSACIONES</td></tr></table>
</td></tr>
<tr><td style="padding:25px 26px 20px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="font-size:11px;color:#617856;font-weight:bold;">${channel.toUpperCase()}</td>${when ? `<td align="right" style="font-size:11px;color:#7a8671;">${when.date} &nbsp;·&nbsp; ${when.time}</td>` : ""}</tr></table>
<h1 style="font-size:24px;line-height:1.3;letter-spacing:-0.6px;font-weight:bold;color:#203b30;margin:10px 0 0;">Te escribió un cliente.</h1>
</td></tr>
<tr><td bgcolor="#f3f6f0" style="padding:23px 22px 27px;background-color:#f3f6f0;border-top:1px solid #e9eee4;border-bottom:1px solid #e9eee4;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;"><tr><td width="43" valign="top" style="width:43px;">
<table role="presentation" width="38" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" valign="middle" width="38" height="38" bgcolor="#dfead5" style="width:38px;height:38px;border-radius:50%;font-size:13px;font-weight:bold;color:#4b6b3a;">${e(initials)}</td></tr></table>
</td><td style="padding-left:8px;">
<p style="font-size:15px;font-weight:bold;line-height:1.4;color:#284433;margin:0 0 5px;word-wrap:break-word;">${e(name)}</p>
${details ? `<p style="font-size:11px;line-height:1.6;color:#78856e;margin:0 0 14px;word-wrap:break-word;">${details}</p>` : '<div style="height:10px;line-height:10px;">&nbsp;</div>'}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border:1px solid #dce5d6;border-radius:0 15px 15px 15px;table-layout:fixed;"><tr><td style="padding:20px 21px 14px;word-wrap:break-word;overflow-wrap:anywhere;">
<p style="font-size:10px;font-weight:bold;color:#7a8b6b;letter-spacing:1.2px;margin:0 0 12px;">MENSAJE DEL CLIENTE</p>
<div style="font-size:18px;line-height:1.7;color:#203b30;word-wrap:break-word;overflow-wrap:anywhere;">${message}</div>
<p style="font-size:10px;line-height:1.5;color:#8a9581;text-align:right;margin:16px 0 0;">${when ? `${when.time} &nbsp;·&nbsp; ` : ""}Mensaje recibido</p>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 26px 25px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" bgcolor="#294a39" style="background-color:#294a39;border-radius:9px;padding:14px 20px;"><a href="https://www.zyteron.cl${e(href)}" style="display:block;font-size:14px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;">Ver y responder en Zyteron &nbsp; →</a></td></tr></table>
<p style="font-size:11px;line-height:1.7;color:#839076;text-align:center;margin:13px 0 0;">Continúa la conversación con el cliente desde el panel.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
<p style="font-size:10px;color:#8c9781;line-height:1.7;margin:16px 0 0;">ZYTERON · Avisos de conversaciones${when ? " · Hora de Chile" : ""}</p>
</td></tr></table></body></html>`;
}

export function contactEmailContent(p: ContactEvent, createdAt: Date, legacy = false) {
  const event = legacy ? p : { ...p, occurredAt: p.occurredAt || createdAt.toISOString() };
  return {
    subject: p.subject || p.title,
    html: p.html || (legacy ? legacyContactHtml(p) : contactHtml(event)),
    text: contactText(p),
  };
}

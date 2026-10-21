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
export function contactHtml(p: ContactEvent) {
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

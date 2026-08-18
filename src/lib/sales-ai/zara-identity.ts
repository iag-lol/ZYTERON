import "server-only";

import { siteConfig } from "@/config/site";
import { getSalesSettings } from "./settings";

/**
 * Identidad comercial de Zara de cara al cliente.
 *
 * REGLA DE PRODUCTO: en la comunicación con clientes nunca aparecen las
 * palabras "IA", "inteligencia artificial", "bot", "automático" ni etiquetas
 * técnicas. Zara se presenta como Ejecutiva Comercial de Zyteron SpA.
 *
 * Esto NO es permiso para mentir: si un cliente pregunta directamente si habla
 * con una persona, la respuesta debe ser honesta (ver HONESTY_RULE).
 */

export type ZaraProfile = {
  name: string;
  role: string;
  company: string;
  mailboxAddress: string;
  displayName: string;
  signature: string;
  phone: string;
  website: string;
};

export async function getZaraProfile(): Promise<ZaraProfile> {
  const settings = await getSalesSettings();

  const name = settings.zara_name || "Zara";
  const role = settings.zara_role || "Ejecutiva Comercial";
  const company = siteConfig.legalName;
  const mailboxAddress = settings.mailbox_address || siteConfig.contact.email;
  const website = siteConfig.url.replace(/^https?:\/\//, "");

  const signature =
    settings.zara_signature?.trim() ||
    [name, role, company, website].join("\n");

  return {
    name,
    role,
    company,
    mailboxAddress,
    displayName: `${name} | ${role} ${siteConfig.name}`,
    signature,
    phone: siteConfig.contact.phoneDisplay,
    website,
  };
}

/**
 * Instrucción de honestidad. Se inyecta en todos los prompts de redacción.
 * Zara no anuncia su naturaleza, pero tampoco la niega si se lo preguntan.
 */
export const HONESTY_RULE = `SOBRE TU NATURALEZA
No inicies conversaciones explicando cómo funcionas ni incluyas etiquetas técnicas en los correos.
Firma como Ejecutiva Comercial y escribe de forma profesional y natural.

PERO: si el cliente pregunta DIRECTAMENTE si eres una persona, un robot, un bot o un sistema
automatizado, NUNCA afirmes ser humana. Responde con honestidad, de forma breve y profesional,
y continúa de inmediato con la atención comercial. Por ejemplo: "Soy un asistente comercial
digital de Zyteron; cualquier punto que necesites ver con el equipo lo derivo de inmediato.
Volviendo a tu consulta: ...". Nunca mientas sobre esto.`;

export { findForbiddenClientTerms } from "./rules";

/** Agrega la firma comercial si el cuerpo aún no la trae. */
export function appendSignature(body: string, profile: ZaraProfile): string {
  const trimmed = body.trimEnd();
  if (trimmed.includes(profile.signature.split("\n")[0]) && trimmed.includes(profile.company)) {
    return trimmed;
  }
  return `${trimmed}\n\n--\n${profile.signature}`;
}

/**
 * Firma HTML con logo para correos comerciales.
 *
 * El logo se referencia por URL pública y absoluta: los clientes de correo no
 * resuelven rutas relativas, y una imagen embebida en base64 suele terminar en
 * spam. Se usa PNG porque Outlook no renderiza SVG de forma confiable.
 */
export function buildHtmlSignature(profile: ZaraProfile): string {
  const logoUrl = `${siteConfig.url}/icon-192.png`;
  const siteUrl = siteConfig.url;

  return `
<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td style="vertical-align:top;padding-right:14px;">
      <img src="${logoUrl}" width="48" height="48" alt="${siteConfig.name}"
           style="display:block;border:0;border-radius:8px;" />
    </td>
    <td style="vertical-align:top;font-size:13px;line-height:1.5;color:#0f172a;">
      <div style="font-weight:bold;font-size:14px;">${profile.name}</div>
      <div style="color:#475569;">${profile.role} · ${profile.company}</div>
      <div style="margin-top:6px;color:#475569;">
        <a href="mailto:${profile.mailboxAddress}" style="color:#1d4ed8;text-decoration:none;">${profile.mailboxAddress}</a>
        &nbsp;·&nbsp; ${profile.phone}
      </div>
      <div style="color:#475569;">${siteConfig.address.display}</div>
      <div style="margin-top:4px;">
        <a href="${siteUrl}" style="color:#1d4ed8;text-decoration:none;font-weight:bold;">${profile.website}</a>
      </div>
    </td>
  </tr>
</table>`.trim();
}

/** Convierte el cuerpo en texto plano a HTML y le adjunta la firma. */
export function buildHtmlEmail(body: string, profile: ZaraProfile): string {
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const safe = block
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br />");
      return `<p style="margin:0 0 14px 0;">${safe}</p>`;
    })
    .join("\n");

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#0f172a;max-width:600px;">
${paragraphs}
${buildHtmlSignature(profile)}
</div>`;
}

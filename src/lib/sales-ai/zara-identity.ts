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

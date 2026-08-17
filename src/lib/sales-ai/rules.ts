/**
 * Reglas comerciales puras: sin base de datos, sin red y sin `server-only`.
 *
 * Todo lo que vive aquí es determinista y NO consume presupuesto de IA. Está
 * separado del resto del módulo justamente para poder probarlo de forma
 * aislada y para dejar explícito qué decisiones toma el código y cuáles la IA.
 */

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

export function normalizeEmail(value?: string | null): string | null {
  const email = (value || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

/** Dominios de correo genéricos: no identifican a una empresa. */
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "live.cl",
  "live.com",
  "icloud.com",
  "hotmail.cl",
  "gmail.cl",
  "yahoo.cl",
]);

export function normalizeDomain(website?: string | null, email?: string | null): string | null {
  const raw = (website || "").trim().toLowerCase();
  if (raw) {
    try {
      const url = raw.startsWith("http") ? raw : `https://${raw}`;
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (host.includes(".")) return host;
    } catch {
      // Si la URL es inválida, se intenta con el dominio del correo.
    }
  }

  const mail = normalizeEmail(email);
  if (!mail) return null;

  const domain = mail.split("@")[1] || "";
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

export function normalizeCompanyName(name?: string | null): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(spa|ltda|limitada|s\.?a\.?|eirl|e\.?i\.?r\.?l\.?|inc|llc)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRut(value?: string | null): string | null {
  const raw = (value || "").replace(/[.\s]/g, "").toUpperCase();
  if (!raw || raw.length < 8) return null;
  return raw.includes("-") ? raw : `${raw.slice(0, -1)}-${raw.slice(-1)}`;
}

export function normalizePhone(value?: string | null): string | null {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(-9);
}

// ---------------------------------------------------------------------------
// Detección en correos entrantes
// ---------------------------------------------------------------------------

const OPT_OUT_PATTERNS = [
  /no me contacten/i,
  /no\s+(?:me\s+)?env[íi]en?\s+m[áa]s/i,
  /elim[íi]nen?me/i,
  /b[óo]rrenme/i,
  /quitar?me?\s+de\s+(?:la\s+)?lista/i,
  /unsubscribe/i,
  /darme?\s+de\s+baja/i,
  /no\s+deseo\s+recibir/i,
  /dejen?\s+de\s+escribir/i,
];

export function detectOptOut(text: string): boolean {
  return OPT_OUT_PATTERNS.some((pattern) => pattern.test(text));
}

const AUTO_REPLY_PATTERNS = [
  /fuera\s+de\s+(?:la\s+)?oficina/i,
  /out\s+of\s+office/i,
  /automatic\s+reply/i,
  /respuesta\s+autom[áa]tica/i,
  /estar[ée]\s+ausente/i,
  /vacaciones\s+hasta/i,
  /me\s+encuentro\s+de\s+vacaciones/i,
];

export function detectAutoReply(subject: string, body: string): boolean {
  return AUTO_REPLY_PATTERNS.some((pattern) => pattern.test(`${subject} ${body}`));
}

const BOUNCE_TEXT_PATTERNS = [
  /address not found/i,
  /recipient not found/i,
  /mailbox unavailable/i,
  /no such user/i,
  /user unknown/i,
  /delivery has failed/i,
  /undeliverable/i,
  /5[59][013]\s|550 5\.1\.1/,
  /destinatario desconocido/i,
  /no se pudo entregar/i,
];

const BOUNCE_SENDER_PATTERNS = [/postmaster@/i, /mailer-daemon/i, /microsoftexchange/i];

/** Un rebote exige remitente de sistema Y texto de fallo: así no confundimos
 *  un correo humano que menciona "no se pudo entregar" con un rebote real. */
export function detectBounce(message: {
  from?: string | null;
  subject?: string | null;
  body?: string | null;
}): boolean {
  const from = message.from ?? "";
  const text = `${message.subject ?? ""} ${message.body ?? ""}`;

  const fromDaemon = BOUNCE_SENDER_PATTERNS.some((pattern) => pattern.test(from));
  const hasBounceText = BOUNCE_TEXT_PATTERNS.some((pattern) => pattern.test(text));

  return fromDaemon && hasBounceText;
}

// ---------------------------------------------------------------------------
// Identidad comercial: terminología prohibida hacia clientes
// ---------------------------------------------------------------------------

const FORBIDDEN_CLIENT_TERMS = [
  /\bIA\b/g,
  /inteligencia artificial/gi,
  /\bA\.?I\.?\b/g,
  /\bbots?\b/gi,
  /\brobots?\b/gi,
  /asistente\s+IA/gi,
  /generad[oa]\s+(?:por|con)\s+IA/gi,
  /correo\s+generado\s+autom[áa]ticamente/gi,
  /Zara\s+A\.?I\.?/gi,
  /Zara\s+IA/gi,
];

export function findForbiddenClientTerms(text: string): string[] {
  const found: string[] = [];
  for (const pattern of FORBIDDEN_CLIENT_TERMS) {
    const matches = text.match(pattern);
    if (matches) found.push(...matches);
  }
  return [...new Set(found)];
}

// ---------------------------------------------------------------------------
// Política de aprobación humana
// ---------------------------------------------------------------------------

/** Intenciones que siempre escalan, sin importar la confianza del modelo. */
export const ALWAYS_HUMAN_INTENTS = new Set([
  "RECLAMO",
  "NEGOCIACION",
  "FUERA_DE_ALCANCE",
  "PIDE_NO_CONTACTAR",
]);

const SENSITIVE_PATTERNS = [
  /descuento/i,
  /rebaj/i,
  /contrato/i,
  /legal/i,
  /demand/i,
  /abogad/i,
  /factura\s+impag/i,
  /reclam/i,
  /devoluci[oó]n/i,
  /urgente.*plazo/i,
];

export function requiresHumanByPolicy(intent: string, text: string): string | null {
  if (ALWAYS_HUMAN_INTENTS.has(intent)) {
    return `La intención "${intent}" siempre requiere revisión humana.`;
  }
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return `El mensaje menciona un tema sensible (${pattern.source}) que requiere aprobación.`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Seguimientos: estados que detienen la secuencia
// ---------------------------------------------------------------------------

export const TERMINAL_STATUSES = new Set(["GANADO", "PERDIDO", "EN_PAUSA"]);
export const ACTIVE_CONVERSATION_STATUSES = new Set(["RESPONDIO", "INTERESADO", "NEGOCIACION"]);

export type FollowupGuardInput = {
  status: string;
  doNotContact: boolean;
  emailInvalid: boolean;
  hasEmail: boolean;
  alreadyReplied: boolean;
};

/**
 * Decide si un seguimiento debe salir. Se evalúa en el momento del envío,
 * no en el de la programación.
 */
export function evaluateFollowupGuards(input: FollowupGuardInput): { shouldSend: boolean; reason: string } {
  if (input.doNotContact) return { shouldSend: false, reason: "Pidió no ser contactada." };
  if (input.emailInvalid) return { shouldSend: false, reason: "Su correo rebotó antes." };
  if (!input.hasEmail) return { shouldSend: false, reason: "No tiene correo registrado." };
  if (TERMINAL_STATUSES.has(input.status)) {
    return { shouldSend: false, reason: `Está en estado ${input.status}.` };
  }
  if (ACTIVE_CONVERSATION_STATUSES.has(input.status)) {
    return { shouldSend: false, reason: `Hay conversación activa (${input.status}).` };
  }
  if (input.alreadyReplied) return { shouldSend: false, reason: "El prospecto ya había respondido." };

  return { shouldSend: true, reason: "Corresponde enviar." };
}

// ---------------------------------------------------------------------------
// Presupuesto de IA
// ---------------------------------------------------------------------------

export type BudgetLevel = "OK" | "WARNING" | "REDUCED" | "BLOCKED";

export function resolveBudgetLevel(percent: number): BudgetLevel {
  if (percent >= 100) return "BLOCKED";
  if (percent >= 90) return "REDUCED";
  if (percent >= 80) return "WARNING";
  return "OK";
}

export function isTaskAllowedForBudget(
  level: BudgetLevel,
  priority: "ESSENTIAL" | "NORMAL" | "BULK",
): boolean {
  if (level === "BLOCKED") return priority === "ESSENTIAL";
  if (level === "REDUCED") return priority !== "BULK";
  return true;
}

// ---------------------------------------------------------------------------
// Importador: mapeo de columnas
// ---------------------------------------------------------------------------

export const HEADER_HINTS: Record<string, string[]> = {
  name: ["nombre", "empresa", "razon", "company", "negocio"],
  legal_name: ["razon social", "razonsocial", "legal"],
  tax_id: ["rut", "tax", "identificacion"],
  industry: ["rubro", "industria", "sector", "giro", "categoria"],
  commune: ["comuna", "ciudad"],
  region: ["region", "provincia"],
  website: ["web", "sitio", "url", "pagina", "website"],
  primary_email: ["email", "correo", "mail", "e-mail"],
  phone: ["telefono", "fono", "phone", "celular"],
  whatsapp: ["whatsapp", "wsp", "wasap"],
  contact_name: ["contacto", "nombre contacto", "encargado", "responsable"],
  contact_role: ["cargo", "puesto", "rol"],
  linkedin_url: ["linkedin"],
  instagram_url: ["instagram", "ig"],
  detected_problem: ["problema", "dolor", "necesidad"],
  recommended_service: ["servicio", "recomendado", "solucion"],
  potential: ["potencial", "score", "prioridad"],
  notes: ["nota", "observacion", "comentario"],
};

function normalizeHeader(header: string) {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function suggestMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    let matched = "";

    for (const [field, hints] of Object.entries(HEADER_HINTS)) {
      if (used.has(field)) continue;
      if (hints.some((hint) => normalized.includes(hint))) {
        matched = field;
        break;
      }
    }

    if (matched) used.add(matched);
    mapping[header] = matched;
  }

  return mapping;
}

export function normalizePotential(value?: string): "BAJO" | "MEDIO" | "POTENCIAL" | "ALTO" {
  const raw = (value || "").trim().toUpperCase();
  if (raw.startsWith("ALT")) return "ALTO";
  if (raw.startsWith("POT")) return "POTENCIAL";
  if (raw.startsWith("BAJ")) return "BAJO";
  return "MEDIO";
}

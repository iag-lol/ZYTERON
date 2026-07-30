/**
 * Normalización de los datos que entran al convenio.
 *
 * La ficha la completan personas distintas y llega con minúsculas, acentos
 * faltantes y nombres de banco escritos de cualquier forma. Aquí se deja todo
 * en su forma correcta antes de imprimirlo en un documento legal, sin alterar
 * el dato de fondo: solo su presentación.
 */

import { cleanRut, formatRut, isValidRut } from "@/lib/sii/rut";

/** Partículas que en español van en minúscula dentro de un nombre propio. */
const LOWERCASE_PARTICLES = new Set([
  "de", "del", "la", "las", "los", "y", "e", "el", "al", "da", "do", "dos", "en",
]);

/** Palabras que conservan su forma exacta pese al título. */
const KEEP_AS_IS = new Set(["RUT", "SpA", "SA", "S.A.", "Ltda.", "EIRL", "N°"]);

/**
 * Título en español: primera letra de cada palabra en mayúscula, respetando
 * partículas, siglas y palabras que ya venían correctamente escritas.
 */
export function titleCase(value: string | null | undefined): string {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";

  return text
    .split(" ")
    .map((word, index) => {
      if (KEEP_AS_IS.has(word)) return word;
      const lower = word.toLocaleLowerCase("es");
      if (index > 0 && LOWERCASE_PARTICLES.has(lower)) return lower;
      // Números y abreviaturas tipo "N°123" se dejan intactos.
      if (/^\d/.test(word)) return word;
      // Una palabra que ya mezcla mayúsculas (BancoEstado, McDonald) se respeta.
      if (/[a-záéíóúñü][A-ZÁÉÍÓÚÑÜ]/.test(word)) return word;
      return lower.charAt(0).toLocaleUpperCase("es") + lower.slice(1);
    })
    .join(" ");
}

/**
 * Comunas y ciudades chilenas que suelen escribirse sin tilde. Se corrige la
 * grafía oficial; cualquier otra pasa por `titleCase`.
 */
const PLACE_SPELLING: Record<string, string> = {
  conchali: "Conchalí",
  maipu: "Maipú",
  nunoa: "Ñuñoa",
  penalolen: "Peñalolén",
  "san joaquin": "San Joaquín",
  "san ramon": "San Ramón",
  "san bernardo": "San Bernardo",
  "la florida": "La Florida",
  "la pintana": "La Pintana",
  "estacion central": "Estación Central",
  "pedro aguirre cerda": "Pedro Aguirre Cerda",
  quilicura: "Quilicura",
  renca: "Renca",
  huechuraba: "Huechuraba",
  independencia: "Independencia",
  recoleta: "Recoleta",
  providencia: "Providencia",
  santiago: "Santiago",
  "las condes": "Las Condes",
  vitacura: "Vitacura",
  "lo barnechea": "Lo Barnechea",
  "la reina": "La Reina",
  macul: "Macul",
  "puente alto": "Puente Alto",
  "san miguel": "San Miguel",
  cerrillos: "Cerrillos",
  "cerro navia": "Cerro Navia",
  "lo espejo": "Lo Espejo",
  "lo prado": "Lo Prado",
  "quinta normal": "Quinta Normal",
  "el bosque": "El Bosque",
  valparaiso: "Valparaíso",
  vina: "Viña del Mar",
  "vina del mar": "Viña del Mar",
  concepcion: "Concepción",
  chillan: "Chillán",
  copiapo: "Copiapó",
  curico: "Curicó",
  "san antonio": "San Antonio",
  talcahuano: "Talcahuano",
  antofagasta: "Antofagasta",
  iquique: "Iquique",
  rancagua: "Rancagua",
  temuco: "Temuco",
  "puerto montt": "Puerto Montt",
  valdivia: "Valdivia",
  osorno: "Osorno",
  arica: "Arica",
  calama: "Calama",
  coquimbo: "Coquimbo",
  serena: "La Serena",
  "la serena": "La Serena",
};

/** Quita tildes para poder comparar contra el diccionario de lugares. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizePlace(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return PLACE_SPELLING[fold(text)] ?? titleCase(text);
}

/** Dirección: título correcto conservando números y abreviaturas. */
export function normalizeAddress(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return titleCase(text)
    .replace(/\bN°\s*/gi, "N° ")
    .replace(/\bDepto\b/gi, "Depto.")
    .replace(/\bDpto\b/gi, "Depto.")
    .replace(/\s+/g, " ")
    .trim();
}

/** Grafía comercial correcta de los bancos chilenos. */
const BANK_SPELLING: Record<string, string> = {
  "banco estado": "BancoEstado",
  bancoestado: "BancoEstado",
  estado: "BancoEstado",
  "banco de chile": "Banco de Chile",
  "banco chile": "Banco de Chile",
  chile: "Banco de Chile",
  santander: "Banco Santander",
  "banco santander": "Banco Santander",
  bci: "Banco BCI",
  "banco bci": "Banco BCI",
  "banco credito e inversiones": "Banco BCI",
  itau: "Banco Itaú",
  "banco itau": "Banco Itaú",
  scotiabank: "Scotiabank",
  "banco scotiabank": "Scotiabank",
  falabella: "Banco Falabella",
  "banco falabella": "Banco Falabella",
  ripley: "Banco Ripley",
  "banco ripley": "Banco Ripley",
  security: "Banco Security",
  "banco security": "Banco Security",
  bice: "Banco BICE",
  "banco bice": "Banco BICE",
  consorcio: "Banco Consorcio",
  internacional: "Banco Internacional",
  "banco internacional": "Banco Internacional",
  tenpo: "Tenpo",
  mercadopago: "Mercado Pago",
  "mercado pago": "Mercado Pago",
};

export function normalizeBank(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return BANK_SPELLING[fold(text)] ?? titleCase(text);
}

/** Denominación comercial del tipo de cuenta. */
const ACCOUNT_TYPE_SPELLING: Record<string, string> = {
  rut: "CuentaRUT",
  cuentarut: "CuentaRUT",
  "cuenta rut": "CuentaRUT",
  corriente: "Cuenta corriente",
  "cuenta corriente": "Cuenta corriente",
  vista: "Cuenta vista",
  "cuenta vista": "Cuenta vista",
  ahorro: "Cuenta de ahorro",
  "cuenta de ahorro": "Cuenta de ahorro",
  "cuenta ahorro": "Cuenta de ahorro",
};

export function normalizeAccountType(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return ACCOUNT_TYPE_SPELLING[fold(text)] ?? titleCase(text);
}

/** RUT con puntos y guion (12.345.678-9). Si no es válido se devuelve tal cual. */
export function normalizeRutDisplay(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return isValidRut(text) ? formatRut(text) : text;
}

/** Teléfono chileno en formato legible: +56 9 1234 5678. */
export function normalizePhone(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const digits = text.replace(/[^\d]/g, "");
  const national = digits.startsWith("56") ? digits.slice(2) : digits;

  if (national.length === 9 && national.startsWith("9")) {
    return `+56 9 ${national.slice(1, 5)} ${national.slice(5)}`;
  }
  if (national.length === 9) {
    return `+56 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  }
  return text;
}

/** Número de cuenta sin separadores ni espacios sobrantes. */
export function normalizeAccountNumber(value: string | null | undefined): string {
  return String(value ?? "").replace(/[\s.\-]/g, "").trim();
}

/** Correo en minúsculas, que es como se escribe en un documento formal. */
export function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase("es");
}

/** Nombre de persona: título correcto respetando partículas. */
export function normalizePersonName(value: string | null | undefined): string {
  return titleCase(value);
}

export { cleanRut, formatRut, isValidRut };

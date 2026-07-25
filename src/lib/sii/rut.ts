/**
 * Utilidades de RUT chileno: limpieza, dígito verificador (módulo 11),
 * validación y formato. Real y determinístico.
 */

export function cleanRut(rut: string): string {
  return String(rut || "").replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Calcula el dígito verificador de un cuerpo numérico (string de dígitos). */
export function computeDv(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/** Valida un RUT completo (cuerpo + DV). */
export function isValidRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeDv(body) === dv;
}

/** Formatea a 78.398.774-0 */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

/** Devuelve el RUT en el formato que exige el SII en XML: 76543210-K (sin puntos). */
export function toSiiRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

import { isValidRut, normalizeRut } from "./rut";
export function normalizeUserRut(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 20 || !/^[0-9kK.\s-]+$/.test(value)) return null;
  const normalized = normalizeRut(value),
    [body, dv] = normalized.split("-");
  const canonical = `${body.replace(/^0+/, "")}-${dv}`;
  return isValidRut(canonical) ? canonical : null;
}

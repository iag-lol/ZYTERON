export function normalizeRutInput(value: string) {
  return String(value || "")
    .trim()
    .replace(/\./g, "")
    .replace(/-/g, "")
    .toUpperCase();
}

export function formatRut(value: string) {
  const normalized = normalizeRutInput(value);
  if (normalized.length < 2) return normalized;

  const body = normalized.slice(0, -1);
  const verifier = normalized.slice(-1);
  const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${bodyWithDots}-${verifier}`;
}

export function isValidRut(value: string) {
  const normalized = normalizeRutInput(value);
  if (!/^\d{7,8}[0-9K]$/.test(normalized)) return false;

  const body = normalized.slice(0, -1);
  const verifier = normalized.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

  return verifier === expected;
}

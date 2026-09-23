const EXCLUDED_WEB_VISIT_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/portal-clientes",
  "/portal-comercial",
  "/checkout",
  "/pagos",
] as const;

/**
 * Conserva sólo el pathname. Rechaza URLs absolutas y protocol-relative para
 * impedir que el endpoint de analytics se use para almacenar datos arbitrarios.
 */
export function normalizeWebVisitPath(value: unknown, maxLength = 300) {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return "";
  return (candidate.split(/[?#]/, 1)[0] || "/").slice(0, maxLength);
}

export function isExcludedWebVisitPath(value: unknown) {
  const pathname = normalizeWebVisitPath(value);
  if (!pathname) return true;
  return EXCLUDED_WEB_VISIT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** El referrer se conserva sin query, fragmento ni credenciales. */
export function sanitizeWebVisitReferrer(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (isExcludedWebVisitPath(url.pathname)) return "";
    return `${url.origin}${url.pathname}`.slice(0, maxLength);
  } catch {
    const pathname = normalizeWebVisitPath(candidate, maxLength);
    return isExcludedWebVisitPath(pathname) ? "" : pathname;
  }
}

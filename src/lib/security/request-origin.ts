const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
type Environment = Record<string, string | undefined>;

/**
 * Flow llama estas rutas desde sus propios servidores o redirige al navegador
 * desde un dominio externo. La autenticidad de esos eventos se comprueba
 * consultando el token directamente contra Flow, no mediante Origin.
 */
const FLOW_EXTERNAL_ROUTES = new Set([
  "/api/portal/payments/quotes/flow/confirmation",
  "/api/portal/payments/quotes/flow/return",
  "/api/portal/payments/quotes/subscription/confirmation",
  "/api/portal/payments/quotes/subscription/return",
]);

function normalizeOrigin(value: string | null | undefined) {
  const candidate = String(value || "").trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function isFlowExternalRoute(pathname: string) {
  return FLOW_EXTERNAL_ROUTES.has(pathname.replace(/\/+$/, "") || "/");
}

export function isUnsafeHttpMethod(method: string) {
  return !SAFE_METHODS.has(String(method || "GET").toUpperCase());
}

export function configuredRequestOrigins(env: Environment = process.env) {
  const candidates = [
    env.NEXTAUTH_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.PUBLIC_SITE_URL,
    env.RENDER_EXTERNAL_URL,
    env.FLOW_PUBLIC_BASE_URL,
  ];

  return candidates.map(normalizeOrigin).filter((origin): origin is string => Boolean(origin));
}

export function isAllowedMutationOrigin(input: {
  requestOrigin: string;
  origin?: string | null;
  referer?: string | null;
  secFetchSite?: string | null;
  allowedOrigins?: string[];
  hasBearerAuthorization?: boolean;
}) {
  // Tokens Bearer no son credenciales ambientales del navegador y, por ello,
  // no están expuestos al ataque CSRF que esta guarda mitiga.
  if (input.hasBearerAuthorization) return true;

  const allowed = new Set(
    [input.requestOrigin, ...(input.allowedOrigins || [])]
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  );

  if (String(input.origin || "").trim()) {
    const suppliedOrigin = normalizeOrigin(input.origin);
    return Boolean(suppliedOrigin && allowed.has(suppliedOrigin));
  }

  if (String(input.referer || "").trim()) {
    const refererOrigin = normalizeOrigin(input.referer);
    return Boolean(refererOrigin && allowed.has(refererOrigin));
  }

  // Algunos clientes omiten Origin/Referer. Sec-Fetch-Site conserva
  // compatibilidad con navegadores modernos sin aceptar peticiones cross-site.
  return String(input.secFetchSite || "").toLowerCase() === "same-origin";
}

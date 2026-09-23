type Environment = Record<string, string | undefined>;

function clean(value?: string) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeSupabaseUrl(value: string) {
  const url = new URL(value);
  const isLocalHttp =
    url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error("SUPABASE_URL debe usar HTTPS fuera del entorno local.");
  }
  return url.origin;
}

function decodeJwtPayload(value: string) {
  const payload = value.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(decoded) as { role?: string };
  } catch {
    return null;
  }
}

export function isPrivilegedSupabaseKey(value: string) {
  const key = clean(value);
  if (/^sb_secret_[A-Za-z0-9_-]{16,}$/.test(key)) return true;
  return decodeJwtPayload(key)?.role === "service_role";
}

export function resolveSupabaseAdminConfig(env: Environment = process.env) {
  const rawUrl = clean(env.SUPABASE_URL || env.SUPABASE_PROJECT_URL);
  if (!rawUrl) {
    throw new Error("Falta SUPABASE_URL para el cliente administrativo del servidor.");
  }

  const candidates = [
    ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY],
    ["SUPABASE_SERVICE_ROLE", env.SUPABASE_SERVICE_ROLE],
    ["SUPABASE_SECRET_KEY", env.SUPABASE_SECRET_KEY],
  ] as const;
  const selected = candidates.find(([, value]) => isPrivilegedSupabaseKey(clean(value)));

  if (!selected) {
    throw new Error(
      "Falta una clave privada válida de Supabase (service_role o sb_secret_). Las claves anon/publishable/NEXT_PUBLIC no están permitidas.",
    );
  }

  return {
    url: normalizeSupabaseUrl(rawUrl),
    key: clean(selected[1]),
    source: selected[0],
  };
}

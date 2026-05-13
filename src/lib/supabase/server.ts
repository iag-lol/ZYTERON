import { createClient } from "@supabase/supabase-js";

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;

    if (
      (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).trim();
    }

    return trimmed;
  }

  return "";
}

function isPlaceholderSupabaseUrl(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("localhost:54321") ||
    normalized.includes("your-project.supabase.co") ||
    normalized.includes("replace-me")
  );
}

function isPlaceholderKey(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length < 40 ||
    normalized.includes("dev-service-role-key") ||
    normalized.includes("dev-anon-key") ||
    normalized.includes("replace-me")
  );
}

function readBestEnv(
  names: string[],
  isInvalid: (value: string) => boolean,
) {
  let fallback = "";

  for (const name of names) {
    const value = readEnv(name);
    if (!value) continue;
    if (!fallback) fallback = value;
    if (!isInvalid(value)) return value;
  }

  return fallback;
}

function normalizeSupabaseUrl(rawUrl: string) {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  const suffixes = ["/rest/v1", "/auth/v1", "/storage/v1"];
  const lowered = trimmed.toLowerCase();

  for (const suffix of suffixes) {
    if (lowered.endsWith(suffix)) {
      return trimmed.slice(0, -suffix.length);
    }
  }

  return trimmed;
}

export function createSupabaseServerClient() {
  const rawUrl = readBestEnv(
    ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL"],
    isPlaceholderSupabaseUrl,
  );

  const keyCandidates = [
    { source: "SUPABASE_SERVICE_ROLE_KEY", value: readEnv("SUPABASE_SERVICE_ROLE_KEY") },
    { source: "SUPABASE_SERVICE_ROLE", value: readEnv("SUPABASE_SERVICE_ROLE") },
    { source: "SUPABASE_SECRET_KEY", value: readEnv("SUPABASE_SECRET_KEY") },
    // Compatibilidad por si el proveedor expone nombres no estándar.
    { source: "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", value: readEnv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY") },
    { source: "NEXT_PUBLIC_SUPABASE_SECRET_KEY", value: readEnv("NEXT_PUBLIC_SUPABASE_SECRET_KEY") },
    // Solo para fallback de lectura en operaciones no críticas.
    { source: "SUPABASE_ANON_KEY", value: readEnv("SUPABASE_ANON_KEY") },
    { source: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
    { source: "SUPABASE_PUBLISHABLE_KEY", value: readEnv("SUPABASE_PUBLISHABLE_KEY") },
    { source: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") },
  ] as const;

  const selected = keyCandidates.find((candidate) => {
    if (typeof candidate.value !== "string") return false;
    const trimmed = candidate.value.trim();
    if (!trimmed) return false;
    return !isPlaceholderKey(trimmed);
  });

  if (!rawUrl || !selected?.value) {
    const observed = [
      `SUPABASE_SERVICE_ROLE_KEY=${readEnv("SUPABASE_SERVICE_ROLE_KEY").length}`,
      `SUPABASE_SERVICE_ROLE=${readEnv("SUPABASE_SERVICE_ROLE").length}`,
      `SUPABASE_SECRET_KEY=${readEnv("SUPABASE_SECRET_KEY").length}`,
      `SUPABASE_ANON_KEY=${readEnv("SUPABASE_ANON_KEY").length}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY").length}`,
      `SUPABASE_URL=${(rawUrl || "").trim().length}`,
    ].join(" | ");
    throw new Error(`SUPABASE_URL o keys válidas de Supabase no configuradas en el servidor. Debug: ${observed}`);
  }
  const trimmedKey = selected.value.trim();
  const url = normalizeSupabaseUrl(rawUrl);
  // We don't use auth helpers; for admin metrics we rely on service role.
  const supabase = createClient(url, trimmedKey, {
    db: { schema: "public" },
    global: { headers: { "X-Client-Info": "zyteron-admin" } },
  });
  return { supabase };
}

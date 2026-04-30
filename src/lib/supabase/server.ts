import { createClient } from "@supabase/supabase-js";

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
  const rawUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawUrl || !key) {
    throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados en el servidor");
  }
  const trimmedKey = key.trim();
  if (
    trimmedKey.length < 40 ||
    trimmedKey.toLowerCase().includes("dev-service-role-key") ||
    trimmedKey.toLowerCase().includes("replace-me")
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY inválida. Debe ser la Service Role Key real de Supabase (no placeholder).",
    );
  }
  const url = normalizeSupabaseUrl(rawUrl);
  // We don't use auth helpers; for admin metrics we rely on service role.
  const supabase = createClient(url, trimmedKey, {
    global: { headers: { "X-Client-Info": "zyteron-admin" } },
  });
  return { supabase };
}

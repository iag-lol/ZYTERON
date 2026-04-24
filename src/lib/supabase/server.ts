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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!rawUrl || !key) {
    throw new Error("Supabase URL o service role key no configurados");
  }
  const url = normalizeSupabaseUrl(rawUrl);
  // We don't use auth helpers; for admin metrics we rely on service role.
  const supabase = createClient(url, key, {
    global: { headers: { "X-Client-Info": "zyteron-admin" } },
  });
  return { supabase };
}

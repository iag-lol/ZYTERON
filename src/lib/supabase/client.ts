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

export function createSupabaseBrowserClient() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const key = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
  if (!url || !key) {
    throw new Error("Supabase URL o anon key no configurados");
  }
  return createClient(url, key);
}

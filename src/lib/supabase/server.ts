import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL o service role key no configurados");
  }
  // We don't use auth helpers; for admin metrics we rely on service role.
  const supabase = createClient(url, key, {
    global: { headers: { "X-Client-Info": "zyteron-admin" } },
  });
  return { supabase, cookiesStore: cookies() };
}

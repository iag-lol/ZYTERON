import "server-only";

import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseAdminConfig } from "@/lib/supabase/admin-config";

export function createSupabaseServerClient() {
  const config = resolveSupabaseAdminConfig();
  const supabase = createClient(config.url, config.key, {
    db: { schema: "public" },
    global: { headers: { "X-Client-Info": "zyteron-admin" } },
  });
  return { supabase };
}

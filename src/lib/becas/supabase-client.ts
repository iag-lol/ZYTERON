import { createSupabaseServerClient } from "../supabase/server";

export function getBecasSupabaseClient() {
  const { supabase } = createSupabaseServerClient();
  return supabase;
}

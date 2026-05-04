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

  if (trimmedKey.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY inválida: estás usando una publishable key. Usa la secret key del backend (sb_secret_...) o la legacy service_role.",
    );
  }

  const jwtParts = trimmedKey.split(".");
  if (jwtParts.length === 3) {
    try {
      const payloadRaw = Buffer.from(jwtParts[1], "base64url").toString("utf8");
      const payload = JSON.parse(payloadRaw) as { role?: unknown };
      const role = typeof payload.role === "string" ? payload.role.toLowerCase() : "";
      if (role && role !== "service_role") {
        throw new Error(
          `SUPABASE_SERVICE_ROLE_KEY inválida: el JWT tiene rol "${role}" y no "service_role". Configura la service role key real del proyecto.`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("rol")) {
        throw error;
      }
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY inválida: no se pudo validar el JWT. Usa la service role key real o la secret key del backend.",
      );
    }
  }

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

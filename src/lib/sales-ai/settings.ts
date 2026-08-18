import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Configuración de Zara. Vive en la tabla sales_settings para poder cambiarla
 * sin desplegar. Se cachea en memoria por un lapso corto: estas claves se leen
 * en casi todas las operaciones y no cambian con frecuencia.
 */

export type SalesSettings = {
  zara_paused: boolean;
  auto_reply_enabled: boolean;
  auto_reply_min_confidence: number;
  approval_min_confidence: number;
  daily_send_limit: number;
  hourly_send_limit: number;
  followup_days: number[];
  dormant_days: number;
  ai_monthly_budget_usd: number;
  ai_daily_budget_usd: number;
  ai_model: string;
  ai_model_prices: Record<string, { input: number; output: number }>;
  test_mode: boolean;
  test_mode_recipient: string;
  mailbox_address: string;
  zara_name: string;
  zara_role: string;
  zara_signature: string;
  bounce_max_attempts: number;
  /** Secreto compartido con Microsoft para validar los webhooks. NUNCA se expone. */
  webhook_client_state: string;

  // --- Cola de envíos (fase 4) ---
  /** Separación mínima absoluta entre envíos, en segundos. 2100 = 35 minutos. */
  queue_min_gap_seconds: number;
  /** Fecha del primer envío REAL. Los de prueba no la inician. */
  warmup_started_on: string | null;
  /** Límite diario aprobado a mano. Sin esto el automatismo no pasa de 15. */
  warmup_manual_override: number | null;
  /** Motivo de la última pausa, para mostrarlo en el panel. */
  pause_reason: string;
  /** Último código SMTP de rebote recibido. */
  last_bounce_code: string;
  bulk_batch_size: number;
};

/**
 * Valores por defecto conservadores: sin autonomía y en modo prueba. Si la
 * tabla no existe todavía, el módulo sigue funcionando en modo seguro en vez
 * de lanzar errores.
 */
export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  zara_paused: false,
  auto_reply_enabled: false,
  auto_reply_min_confidence: 0.93,
  approval_min_confidence: 0.8,
  daily_send_limit: 20,
  hourly_send_limit: 5,
  followup_days: [3, 7, 14],
  dormant_days: 5,
  ai_monthly_budget_usd: 20,
  ai_daily_budget_usd: 2,
  ai_model: "gpt-4o-mini",
  ai_model_prices: {
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4o": { input: 2.5, output: 10 },
  },
  test_mode: true,
  test_mode_recipient: "",
  mailbox_address: "",
  zara_name: "Zara",
  zara_role: "Ejecutiva Comercial",
  zara_signature: "",
  bounce_max_attempts: 2,
  webhook_client_state: "",
  queue_min_gap_seconds: 2100,
  warmup_started_on: null,
  warmup_manual_override: null,
  pause_reason: "",
  last_bounce_code: "",
  bulk_batch_size: 10,
};

/**
 * Claves que jamás deben viajar al navegador. Se filtran en cualquier respuesta
 * de API aunque el endpoint exija sesión de administrador.
 */
export const SECRET_SETTING_KEYS = new Set<keyof SalesSettings>(["webhook_client_state"]);

/** Devuelve la configuración sin los valores secretos, apta para el frontend. */
export function redactSecretSettings(settings: SalesSettings): Omit<SalesSettings, "webhook_client_state"> & {
  webhook_client_state_configured: boolean;
} {
  const { webhook_client_state, ...safe } = settings;
  return { ...safe, webhook_client_state_configured: Boolean(webhook_client_state) };
}

const CACHE_TTL_MS = 30_000;
let cache: { value: SalesSettings; expiresAt: number } | null = null;

export function invalidateSalesSettingsCache() {
  cache = null;
}

export async function getSalesSettings(): Promise<SalesSettings> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  const settings: SalesSettings = { ...DEFAULT_SALES_SETTINGS };

  try {
    const { supabase } = createSupabaseServerClient();
    const { data, error } = await supabase.from("sales_settings").select("key, value");
    if (error) throw error;

    for (const row of data ?? []) {
      const key = row.key as keyof SalesSettings;
      if (!(key in settings)) continue;
      const parsed = row.value;
      // Los valores llegan como jsonb ya deserializado por el cliente.
      (settings as Record<string, unknown>)[key] = parsed as unknown;
    }
  } catch {
    // Sin tabla o sin conexión: se opera con los valores por defecto seguros.
  }

  cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };
  return settings;
}

export async function updateSalesSetting(key: keyof SalesSettings, value: unknown, updatedBy?: string) {
  const { supabase } = createSupabaseServerClient();
  const { error } = await supabase
    .from("sales_settings")
    .upsert({ key, value, updated_by: updatedBy ?? null, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
  invalidateSalesSettingsCache();
}

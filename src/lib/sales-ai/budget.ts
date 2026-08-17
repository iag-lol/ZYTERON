import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSalesSettings } from "./settings";

/**
 * Control de gasto de IA. Toda llamada a OpenAI del módulo comercial debe
 * pasar por aquí: primero se consulta si está permitida y después se registra
 * el consumo real devuelto por la API.
 */

export type BudgetStatus = {
  dailySpentUsd: number;
  monthlySpentUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  dailyPercent: number;
  monthlyPercent: number;
  /** El porcentaje más alto entre diario y mensual, que es el que manda. */
  percent: number;
  level: "OK" | "WARNING" | "REDUCED" | "BLOCKED";
  callCount: number;
};

/** Prioridad de la tarea: define qué se corta primero al acercarse al límite. */
export type TaskPriority = "ESSENTIAL" | "NORMAL" | "BULK";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const settings = await getSalesSettings();
  const dailyLimitUsd = Number(settings.ai_daily_budget_usd) || 0;
  const monthlyLimitUsd = Number(settings.ai_monthly_budget_usd) || 0;

  let dailySpentUsd = 0;
  let monthlySpentUsd = 0;
  let callCount = 0;

  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_ai_budget_usage")
      .select("usage_date, estimated_cost_usd, call_count")
      .gte("usage_date", monthStartISO());

    for (const row of data ?? []) {
      const cost = Number(row.estimated_cost_usd) || 0;
      monthlySpentUsd += cost;
      callCount += Number(row.call_count) || 0;
      if (row.usage_date === todayISO()) dailySpentUsd = cost;
    }
  } catch {
    // Sin datos de consumo se asume 0; nunca se bloquea por un fallo de lectura.
  }

  const dailyPercent = dailyLimitUsd > 0 ? (dailySpentUsd / dailyLimitUsd) * 100 : 0;
  const monthlyPercent = monthlyLimitUsd > 0 ? (monthlySpentUsd / monthlyLimitUsd) * 100 : 0;
  const percent = Math.max(dailyPercent, monthlyPercent);

  let level: BudgetStatus["level"] = "OK";
  if (percent >= 100) level = "BLOCKED";
  else if (percent >= 90) level = "REDUCED";
  else if (percent >= 80) level = "WARNING";

  return {
    dailySpentUsd,
    monthlySpentUsd,
    dailyLimitUsd,
    monthlyLimitUsd,
    dailyPercent,
    monthlyPercent,
    percent,
    level,
    callCount,
  };
}

export type BudgetDecision = {
  allowed: boolean;
  reason?: string;
  status: BudgetStatus;
};

/**
 * Al 100% se detiene la generación masiva y los análisis no prioritarios, pero
 * la recepción de correo, el CRM y las acciones manuales siguen operando: esas
 * no consumen IA o las decide una persona.
 */
export async function canRunAiTask(priority: TaskPriority = "NORMAL"): Promise<BudgetDecision> {
  const status = await getBudgetStatus();

  if (status.level === "BLOCKED" && priority !== "ESSENTIAL") {
    return {
      allowed: false,
      reason: `Presupuesto de IA agotado (${status.percent.toFixed(0)}%). Solo se permiten tareas esenciales.`,
      status,
    };
  }

  if (status.level === "REDUCED" && priority === "BULK") {
    return {
      allowed: false,
      reason: `Presupuesto de IA al ${status.percent.toFixed(0)}%. Se suspendieron las tareas masivas.`,
      status,
    };
  }

  return { allowed: true, status };
}

/** Calcula el costo en USD a partir del usage real y los precios configurados. */
export async function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): Promise<number> {
  const settings = await getSalesSettings();
  const prices = settings.ai_model_prices?.[model];
  if (!prices) return 0;

  // Los precios se expresan por millón de tokens.
  const input = (promptTokens / 1_000_000) * Number(prices.input || 0);
  const output = (completionTokens / 1_000_000) * Number(prices.output || 0);
  return Number((input + output).toFixed(6));
}

export type AiUsageRecord = {
  companyId?: string | null;
  action: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  confidence?: number | null;
  result?: "OK" | "ERROR" | "SKIPPED";
  isAutomated?: boolean;
  approvedBy?: string | null;
  errorDetail?: string | null;
};

/**
 * Registra el consumo en la bitácora de auditoría y actualiza el agregado
 * diario. Nunca lanza: un fallo de medición no debe cortar una operación
 * comercial que ya se ejecutó.
 */
export async function recordAiUsage(record: AiUsageRecord): Promise<number> {
  const totalTokens = (record.promptTokens || 0) + (record.completionTokens || 0);
  const cost = await estimateCostUsd(record.model, record.promptTokens || 0, record.completionTokens || 0);

  try {
    const { supabase } = createSupabaseServerClient();

    await supabase.from("sales_ai_activity").insert({
      company_id: record.companyId ?? null,
      action: record.action,
      model: record.model,
      prompt_tokens: record.promptTokens || 0,
      completion_tokens: record.completionTokens || 0,
      total_tokens: totalTokens,
      estimated_cost_usd: cost,
      confidence: record.confidence ?? null,
      result: record.result ?? "OK",
      is_automated: record.isAutomated ?? true,
      approved_by: record.approvedBy ?? null,
      error_detail: record.errorDetail ?? null,
    });

    // Agregado diario. Se lee primero porque Supabase no expone un incremento
    // atómico desde el cliente JS sin una función RPC dedicada.
    const date = todayISO();
    const { data: existing } = await supabase
      .from("sales_ai_budget_usage")
      .select("total_tokens, estimated_cost_usd, call_count")
      .eq("usage_date", date)
      .maybeSingle();

    await supabase.from("sales_ai_budget_usage").upsert({
      usage_date: date,
      total_tokens: Number(existing?.total_tokens || 0) + totalTokens,
      estimated_cost_usd: Number(existing?.estimated_cost_usd || 0) + cost,
      call_count: Number(existing?.call_count || 0) + 1,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Medición best-effort.
  }

  return cost;
}

import { SlidersHorizontal } from "lucide-react";

import { ZaraControls } from "@/components/admin/sales-ai/zara-controls";
import { getSalesSettings } from "@/lib/sales-ai/settings";
import { getBudgetStatus } from "@/lib/sales-ai/budget";

export const dynamic = "force-dynamic";

export const metadata = { title: "Configuración de Zara" };

export default async function ConfiguracionZaraPage() {
  const settings = await getSalesSettings();
  const budget = await getBudgetStatus();

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <SlidersHorizontal className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Configuración de Zara</h1>
          <p className="mt-1 text-sm text-slate-600">
            Control de autonomía, umbrales de confianza y presupuesto de IA.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-extrabold text-slate-900">Gasto de IA</h2>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${
              budget.percent >= 100
                ? "bg-rose-600"
                : budget.percent >= 90
                  ? "bg-orange-500"
                  : budget.percent >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(budget.percent, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-700">
          ${budget.monthlySpentUsd.toFixed(4)} de ${budget.monthlyLimitUsd} mensuales ·{" "}
          {budget.percent.toFixed(0)}% consumido · {budget.callCount} llamadas
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Modelo configurado: <strong>{settings.ai_model}</strong>. Los precios por modelo se editan
          en la tabla <code>sales_settings</code> (clave <code>ai_model_prices</code>) para no
          quedar fijos en el código.
        </p>
      </div>

      <ZaraControls
        initial={{
          zara_paused: settings.zara_paused,
          auto_reply_enabled: settings.auto_reply_enabled,
          test_mode: settings.test_mode,
          auto_reply_min_confidence: settings.auto_reply_min_confidence,
          approval_min_confidence: settings.approval_min_confidence,
          ai_daily_budget_usd: settings.ai_daily_budget_usd,
          ai_monthly_budget_usd: settings.ai_monthly_budget_usd,
          daily_send_limit: settings.daily_send_limit,
        }}
      />
    </div>
  );
}

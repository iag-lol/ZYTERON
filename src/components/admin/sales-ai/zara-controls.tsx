"use client";

import { useState } from "react";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type Settings = {
  zara_paused: boolean;
  auto_reply_enabled: boolean;
  test_mode: boolean;
  auto_reply_min_confidence: number;
  approval_min_confidence: number;
  ai_daily_budget_usd: number;
  ai_monthly_budget_usd: number;
  daily_send_limit: number;
};

export function ZaraControls({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(key: keyof Settings, value: unknown) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/sales-ai/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      setSettings(data.settings as Settings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>
      ) : null}

      {/* Botón de emergencia */}
      <section
        className={`rounded-2xl border p-5 ${
          settings.zara_paused ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <h2 className="text-sm font-extrabold text-slate-900">Botón de emergencia</h2>
        <p className="mt-1 text-sm text-slate-700">
          {settings.zara_paused
            ? "Zara está pausada. Se siguen recibiendo correos y registrando todo, pero no se envía nada automático."
            : "Al pausar se detienen envíos, respuestas automáticas, campañas y seguimientos. La recepción, el CRM y el historial siguen funcionando."}
        </p>
        <Button
          onClick={() => void patch("zara_paused", !settings.zara_paused)}
          disabled={busy === "zara_paused"}
          className={`mt-4 gap-2 font-bold text-white ${
            settings.zara_paused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          {busy === "zara_paused" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : settings.zara_paused ? (
            <PlayCircle className="h-4 w-4" />
          ) : (
            <PauseCircle className="h-4 w-4" />
          )}
          {settings.zara_paused ? "Reanudar Zara" : "PAUSAR ZARA"}
        </Button>
      </section>

      {/* Interruptores */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-extrabold text-slate-900">Autonomía</h2>
        <div className="mt-3 space-y-3">
          {[
            {
              key: "test_mode" as const,
              label: "Modo prueba",
              help: "Los correos no llegan a prospectos reales. Mantenlo activo hasta validar el flujo completo.",
            },
            {
              key: "auto_reply_enabled" as const,
              label: "Respuesta automática",
              help: "Permite responder sin aprobación cuando la confianza supera el umbral. Actívalo solo en la etapa 3 del go-live.",
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3"
            >
              <span>
                <span className="block text-sm font-bold text-slate-800">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-600">{item.help}</span>
              </span>
              <input
                type="checkbox"
                checked={settings[item.key]}
                disabled={busy === item.key}
                onChange={(event) => void patch(item.key, event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Umbrales y presupuesto */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-extrabold text-slate-900">Umbrales y presupuesto</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { key: "auto_reply_min_confidence" as const, label: "Confianza mínima para responder solo", step: 0.01, max: 1 },
            { key: "approval_min_confidence" as const, label: "Confianza mínima para preparar borrador", step: 0.01, max: 1 },
            { key: "ai_daily_budget_usd" as const, label: "Presupuesto IA diario (USD)", step: 0.5, max: 1000 },
            { key: "ai_monthly_budget_usd" as const, label: "Presupuesto IA mensual (USD)", step: 1, max: 10000 },
            { key: "daily_send_limit" as const, label: "Máximo de correos por día", step: 1, max: 500 },
          ].map((field) => (
            <label key={field.key} className="block">
              <span className="block text-xs font-semibold text-slate-600">{field.label}</span>
              <input
                type="number"
                defaultValue={settings[field.key]}
                step={field.step}
                min={0}
                max={field.max}
                disabled={busy === field.key}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value) || value === settings[field.key]) return;
                  void patch(field.key, value);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Los cambios se guardan al salir del campo. Al 80% del presupuesto se avisa, al 90% se
          suspenden las tareas masivas y al 100% solo siguen las tareas esenciales.
        </p>
      </section>
    </div>
  );
}

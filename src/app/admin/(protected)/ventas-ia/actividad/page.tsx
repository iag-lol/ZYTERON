import { BarChart3 } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBudgetStatus } from "@/lib/sales-ai/budget";

export const dynamic = "force-dynamic";

export const metadata = { title: "Actividad IA" };

type ActivityRow = {
  id: number;
  company_id: string | null;
  action: string;
  model: string | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  confidence: number | null;
  result: string | null;
  is_automated: boolean;
  approved_by: string | null;
  error_detail: string | null;
  created_at: string;
};

export default async function ActividadIaPage() {
  const budget = await getBudgetStatus();

  let rows: ActivityRow[] = [];
  let ready = true;

  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_ai_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    rows = (data ?? []) as ActivityRow[];
  } catch {
    ready = false;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Actividad IA</h1>
          <p className="mt-1 text-sm text-slate-600">
            Auditoría completa de lo que hizo Zara, con tokens y costo por acción.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Gasto hoy", value: `$${budget.dailySpentUsd.toFixed(4)}` },
          { label: "Gasto del mes", value: `$${budget.monthlySpentUsd.toFixed(4)}` },
          { label: "Límite mensual", value: `$${budget.monthlyLimitUsd}` },
          { label: "Llamadas del mes", value: String(budget.callCount) },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {!ready ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Ejecuta <code>supabase/sales_ai_zara.sql</code> para habilitar el registro de actividad.
        </div>
      ) : null}

      {rows.length === 0 && ready ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Zara todavía no ha ejecutado ninguna acción con IA. El costo acumulado es $0.
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 font-bold text-slate-900">Fecha</th>
                <th className="p-3 font-bold text-slate-900">Acción</th>
                <th className="p-3 font-bold text-slate-900">Modelo</th>
                <th className="p-3 font-bold text-slate-900">Tokens</th>
                <th className="p-3 font-bold text-slate-900">Costo</th>
                <th className="p-3 font-bold text-slate-900">Confianza</th>
                <th className="p-3 font-bold text-slate-900">Resultado</th>
                <th className="p-3 font-bold text-slate-900">Origen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="p-3 text-xs text-slate-500">
                    {new Date(row.created_at).toLocaleString("es-CL")}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{row.action}</td>
                  <td className="p-3 text-xs text-slate-600">{row.model ?? "—"}</td>
                  <td className="p-3 text-xs text-slate-600">{row.total_tokens ?? 0}</td>
                  <td className="p-3 text-xs font-semibold text-slate-800">
                    ${Number(row.estimated_cost_usd ?? 0).toFixed(6)}
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {row.confidence != null ? Number(row.confidence).toFixed(2) : "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                        row.result === "OK"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : row.result === "ERROR"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {row.result ?? "—"}
                    </span>
                    {row.error_detail ? (
                      <span className="mt-0.5 block max-w-[220px] truncate text-[11px] text-rose-600">
                        {row.error_detail}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {row.is_automated ? "Automático" : `Manual · ${row.approved_by ?? "?"}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

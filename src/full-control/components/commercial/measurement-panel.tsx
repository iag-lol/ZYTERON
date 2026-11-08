"use client";
import { useEffect, useState } from "react";
import type { Role } from "@zyteron/contracts";
import { apiHeaders } from "@control/lib/api-auth";
type Row = {
  serviceLine: string;
  source: string;
  received: number;
  qualified: number;
  proposals: number;
  opportunities: number;
  sales: number;
  salesValue: Record<string, number>;
};
type Report = {
  window: { start: string; end: string; label: string };
  current: Row[];
  previous: Row[];
  note: string;
};
const labels: Record<string, string> = {
  web_ecommerce: "Web y comercio electrónico",
  sistemas_automatizacion: "Sistemas y automatización",
  soporte: "Soporte",
  sin_definir: "Servicio sin clasificar",
};
export function MeasurementPanel({ role }: { role: Role }) {
  const [days, setDays] = useState(7),
    [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      const headers = await apiHeaders(role);
      if (!active) return;
      setReport(null);
      setError("");
      const response = await fetch(`/api/control-core/api/commercial/measurement?days=${days}`, {
        headers,
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error("No fue posible consultar el informe. No se muestran cifras parciales.");
      const data = (await response.json()) as Report;
      if (active) setReport(data);
    })().catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Medición no disponible.");
    });
    return () => {
      active = false;
    };
  }, [days, role]);
  const rows = new Map<string, { current?: Row; previous?: Row }>();
  for (const item of report?.current || [])
    rows.set(`${item.serviceLine}:${item.source}`, { current: item });
  for (const item of report?.previous || []) {
    const key = `${item.serviceLine}:${item.source}`;
    rows.set(key, { ...rows.get(key), previous: item });
  }
  return (
    <section className="my-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resultados por recorrido comercial</h2>
        <label>
          Período{" "}
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded border p-2"
          >
            <option value={7}>7 días completos</option>
            <option value={28}>28 días completos</option>
          </select>
        </label>
      </div>
      <p className="my-3 text-sm text-slate-600">
        Chile · comparación con el período anterior de igual duración. Cada celda muestra actual /
        anterior.
      </p>
      {error && <p role="alert">{error}</p>}
      {!error && !report && <p role="status">Consultando registros comerciales…</p>}
      {report && (
        <>
          <p className="mb-3 text-sm">
            {report.window.label.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3-$2-$1")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Solicitudes, oportunidades, propuestas y ventas por servicio y fuente registrada
              </caption>
              <thead>
                <tr>
                  {[
                    "Servicio y fuente",
                    "Solicitudes",
                    "Calificados",
                    "Oportunidades",
                    "Propuestas enviadas",
                    "Ventas",
                    "Valor de ventas",
                  ].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows].map(([key, values]) => {
                  const row = values.current || values.previous!;
                  return (
                    <tr key={key} className="border-t">
                      <th scope="row" className="p-3">
                        {labels[row.serviceLine]}
                        <small className="block font-normal">
                          {row.source === "web_registrada"
                            ? "Fuente web registrada"
                            : "Sin atribución web"}
                        </small>
                      </th>
                      {(
                        ["received", "qualified", "opportunities", "proposals", "sales"] as const
                      ).map((metric) => (
                        <td className="p-3" key={metric}>
                          {values.current?.[metric] || 0} / {values.previous?.[metric] || 0}
                        </td>
                      ))}
                      <td className="p-3">
                        {[
                          ...new Set([
                            ...Object.keys(values.current?.salesValue || {}),
                            ...Object.keys(values.previous?.salesValue || {}),
                          ]),
                        ].map((currency) => (
                          <span key={currency} className="block whitespace-nowrap">
                            {currency}:{" "}
                            {(values.current?.salesValue[currency] || 0).toLocaleString("es-CL")} /{" "}
                            {(values.previous?.salesValue[currency] || 0).toLocaleString("es-CL")}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!rows.size && <p>El CRM no tiene registros en estos períodos.</p>}
          <p className="mt-4 text-xs text-slate-600">{report.note}</p>
          <p className="mt-2 text-xs text-slate-600">
            Sesiones, clics orgánicos, margen y tiempo de primera respuesta: pendientes de fuentes
            verificadas. Cambios de referencia: 23-09-2026 y 02-11-2026.
          </p>
        </>
      )}
    </section>
  );
}

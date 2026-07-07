"use client";

import { useState } from "react";

const nf = new Intl.NumberFormat("es-CL");

type SeriesPoint = { key: string; label: string; value: number };
type Segment = { key: string; label: string; value: number; color: string };
type RankedItem = { label: string; value: number };
type FunnelStep = { label: string; value: number; pct: number };

/**
 * Columnas diarias con tooltip por marca. Serie única en un solo tono
 * (magnitud → secuencial); el máximo lleva etiqueta directa permanente.
 */
export function DailyColumns({ points, color = "#2a78d6" }: { points: SeriesPoint[]; color?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
        Sin postulaciones en los últimos 30 días
      </div>
    );
  }

  const maxIdx = points.findIndex((p) => p.value === max);

  return (
    <div>
      <div className="relative flex h-40 items-end pt-6">
        {/* Gridlines hairline recesivas */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-6 flex flex-col justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-px w-full bg-slate-100" />
          ))}
        </div>

        {points.map((point, idx) => {
          const heightPct = max > 0 ? (point.value / max) * 100 : 0;
          return (
            <div
              key={point.key}
              className="group relative flex h-full flex-1 items-end justify-center px-px"
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === idx ? (
                <div className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg">
                  {point.label}: {nf.format(point.value)}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              ) : null}

              {idx === maxIdx && point.value > 0 && hovered !== idx ? (
                <span className="pointer-events-none absolute -top-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700">
                  {nf.format(point.value)}
                </span>
              ) : null}

              <div
                className="w-full max-w-[24px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                style={{
                  height: point.value > 0 ? `max(${heightPct}%, 3px)` : "2px",
                  backgroundColor: point.value > 0 ? color : "#e2e8f0",
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between border-t border-slate-200 pt-1.5 text-[10px] font-medium text-slate-400">
        {points
          .filter((_, idx) => idx % 7 === 0 || idx === points.length - 1)
          .map((point) => (
            <span key={point.key}>{point.label}</span>
          ))}
      </div>
    </div>
  );
}

/**
 * Barra apilada parte-del-todo con separadores de 2px en color de superficie
 * y leyenda con valores visibles (relief para tonos de bajo contraste).
 */
export function StackedStatusBar({ segments }: { segments: Segment[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
        Aún no hay postulaciones para distribuir
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex h-4 w-full gap-[2px]">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="group relative min-w-[6px] first:rounded-l-md last:rounded-r-md"
            style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
            onMouseEnter={() => setHovered(segment.key)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === segment.key ? (
              <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg">
                {segment.label}: {nf.format(segment.value)} ({((segment.value / total) * 100).toFixed(1)}%)
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="font-medium text-slate-600">{segment.label}</span>
            <span className="font-bold tabular-nums text-slate-900">{nf.format(segment.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barras horizontales de magnitud: un solo tono, valor etiquetado al final. */
export function RankedBars({ items, color = "#2a78d6" }: { items: RankedItem[]; color?: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
        Sin datos suficientes
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 truncate text-xs font-medium text-slate-600" title={item.label}>
            {item.label}
          </span>
          <div className="h-3 flex-1 rounded-[4px] bg-slate-100">
            <div
              className="h-3 rounded-[4px]"
              style={{
                width: `max(${(item.value / max) * 100}%, 4px)`,
                backgroundColor: item.label === "Otras" ? "#cbd5e1" : color,
              }}
            />
          </div>
          <span className="w-8 text-right text-xs font-bold tabular-nums text-slate-900">
            {nf.format(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Rampa ordinal azul validada (claro → oscuro) para etapas del embudo.
const FUNNEL_RAMP = ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];

export function FunnelSteps({ steps }: { steps: FunnelStep[] }) {
  return (
    <div className="space-y-3.5">
      {steps.map((step, idx) => (
        <div key={step.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: FUNNEL_RAMP[idx] ?? FUNNEL_RAMP[FUNNEL_RAMP.length - 1] }}
              />
              {step.label}
            </span>
            <span className="font-bold tabular-nums text-slate-900">
              {nf.format(step.value)}
              <span className="ml-1.5 font-semibold text-slate-400">{step.pct.toFixed(0)}%</span>
            </span>
          </div>
          <div className="h-2.5 rounded-[4px] bg-slate-100">
            <div
              className="h-2.5 rounded-[4px]"
              style={{
                width: `max(${step.pct}%, ${step.value > 0 ? 4 : 0}px)`,
                backgroundColor: FUNNEL_RAMP[idx] ?? FUNNEL_RAMP[FUNNEL_RAMP.length - 1],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Sparkline de 14 puntos: línea en gris de de-énfasis, punto actual en acento. */
export function TrendSparkline({ values, accent = "#2a78d6" }: { values: number[]; accent?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;

  const w = 96;
  const h = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => ({
    x: i * step,
    y: h - 3 - ((v - min) / range) * (h - 6),
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible" aria-hidden>
      <path d={path} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4" fill={accent} stroke="#ffffff" strokeWidth="2" />
    </svg>
  );
}

/** Medidor de avance: pista en un paso claro de la misma rampa que el relleno. */
export function ProgressMeter({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-2 w-full rounded-full" style={{ backgroundColor: "#cde2fb" }}>
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: "#2a78d6" }}
      />
    </div>
  );
}

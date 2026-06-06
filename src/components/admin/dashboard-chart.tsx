"use client";

import { useState } from "react";

export interface ChartPoint {
  label: string;
  value: number;
}

type FormatType = "currency" | "number" | "compact";

function formatValue(value: number, formatType: FormatType = "number"): string {
  switch (formatType) {
    case "currency":
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(value || 0);
    case "compact":
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return String(value);
    default:
      return value.toLocaleString("es-CL");
  }
}

interface BarChartProps {
  data: ChartPoint[];
  height?: number;
  formatType?: FormatType;
  accentClass?: string;
  dimClass?: string;
  /** If true, highlight only the last bar */
  highlightLast?: boolean;
}

export function BarChart({
  data,
  height = 160,
  formatType = "currency",
  accentClass = "from-blue-600 to-blue-400",
  dimClass = "from-slate-700 to-slate-600",
  highlightLast = true,
}: BarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="relative flex items-end gap-1.5" style={{ height }}>
      {data.map((point, idx) => {
        const pct = Math.max(3, (point.value / maxValue) * 100);
        const isHighlighted = highlightLast
          ? idx === data.length - 1
          : true;
        const isHovered = hoveredIdx === idx;

        return (
          <div
            key={`${point.label}-${idx}`}
            className="group relative flex flex-1 cursor-default flex-col items-center justify-end"
            style={{ height: "100%" }}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Tooltip */}
            {isHovered && (
              <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-center text-[12px] font-bold text-white shadow-2xl ring-1 ring-white/10">
                {formatValue(point.value, formatType)}
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
              </div>
            )}

            {/* Bar */}
            <div
              className={`w-full rounded-t-lg bg-gradient-to-t transition-all duration-300 ${
                isHighlighted
                  ? accentClass
                  : dimClass
              } ${isHovered ? "brightness-125" : ""}`}
              style={{ height: `${pct}%` }}
            />

            {/* Label */}
            <span
              className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                isHighlighted ? "text-blue-400" : "text-slate-600"
              } ${isHovered ? "!text-slate-300" : ""}`}
            >
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface AreaChartProps {
  data: ChartPoint[];
  height?: number;
  formatType?: FormatType;
  strokeColor?: string;
  fillId?: string;
}

export function AreaChart({
  data,
  height = 160,
  formatType = "currency",
  strokeColor = "#3b82f6",
  fillId = "area-gradient",
}: AreaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  if (data.length < 2) return null;

  const width = 1000;
  const padding = { top: 16, right: 16, bottom: 32, left: 16 };
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  const xStep = (width - padding.left - padding.right) / (data.length - 1);
  const yScale = (height - padding.top - padding.bottom) / maxValue;

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + (maxValue - d.value) * yScale,
    value: d.value,
    label: d.label,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + (1 - frac) * (height - padding.top - padding.bottom)}
            y2={padding.top + (1 - frac) * (height - padding.top - padding.bottom)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        {/* Area fill */}
        <path d={areaD} fill={`url(#${fillId})`} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Hover zones */}
      <div className="absolute inset-0 flex items-stretch">
        {data.map((point, idx) => (
          <div
            key={idx}
            className="relative flex flex-1 items-end"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {hoveredIdx === idx && (
              <div
                className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-bold text-white shadow-xl ring-1 ring-white/10"
              >
                {formatValue(point.value, formatType)}
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
              </div>
            )}
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FunnelStepProps {
  label: string;
  value: number;
  pct: number;
  color: string;
  bgColor: string;
  textColor: string;
  subLabel?: string;
  delay?: number;
}

export function FunnelStep({
  label,
  value,
  pct,
  color,
  bgColor,
  textColor,
  subLabel,
}: FunnelStepProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${color}`} />
          <span className="text-[13px] font-semibold text-slate-300">{label}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${bgColor} ${textColor}`}
          >
            {value}
          </span>
          <span className="w-12 text-right text-[11px] font-semibold text-slate-500">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${color} transition-all duration-700`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      {subLabel && (
        <p className="pl-4 text-[11px] text-slate-600">{subLabel}</p>
      )}
    </div>
  );
}

interface MiniSparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function MiniSparkline({ data, color = "#3b82f6", height = 32 }: MiniSparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = height;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => ({
    x: i * step,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

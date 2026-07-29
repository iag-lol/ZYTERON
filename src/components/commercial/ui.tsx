"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Primitivas visuales del área comercial (portal del ejecutivo y admin).
 * Un solo lugar define tarjetas, métricas, badges y campos de formulario para
 * que ambas vistas se vean como un mismo producto.
 *
 * IMPORTANTE: `icon` recibe un elemento ya renderizado (`<Users className="h-4 w-4" />`),
 * no el componente. Los iconos de lucide-react no son referencias de cliente, así
 * que pasarlos como función desde un Server Component rompe el renderizado.
 */

export const TONES = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  cyan: "bg-cyan-50 text-cyan-600 ring-cyan-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export type Tone = keyof typeof TONES;

export function StatCard({
  label,
  value,
  icon,
  tone = "blue",
  hint,
  trend,
  progress,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: Tone;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  progress?: { current: number; goal: number };
}) {
  const pct =
    progress && progress.goal > 0
      ? Math.min(100, Math.round((progress.current / progress.goal) * 100))
      : null;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1", TONES[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[22px] font-extrabold leading-tight tracking-tight text-slate-900">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2">
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
        {trend && (
          <span
            className={cn(
              "text-[11px] font-bold",
              trend.positive === false ? "text-rose-600" : "text-emerald-600",
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      {pct !== null && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-amber-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            {pct}% de la meta ({progress?.goal})
          </p>
        </div>
      )}
    </div>
  );
}

export function Panel({
  title,
  description,
  icon,
  action,
  children,
  className,
  padded = true,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-extrabold text-slate-900">{title}</h2>
              {description && <p className="text-[11px] text-slate-500">{description}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function Pill({ label, cls, className }: { label: string; cls?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset",
        cls ?? "bg-slate-100 text-slate-600 ring-slate-200",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500", className)}>
      {children}
    </h3>
  );
}

export function DataItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-[12.5px] font-semibold text-slate-700",
          mono && "font-mono tracking-tight",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  spin,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  spin?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      {/* El selector de hijo agranda el icono sin que cada llamada tenga que saberlo. */}
      <div
        className={cn(
          "mx-auto flex h-8 w-8 items-center justify-center text-slate-300 [&>svg]:h-8 [&>svg]:w-8",
          spin && "animate-spin",
        )}
      >
        {icon}
      </div>
      <p className="mt-3 text-[13px] font-bold text-slate-600">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-slate-400">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-4 top-20 z-[60] flex max-w-sm items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-[13px] font-semibold text-white shadow-xl">
      <CheckCircle2 className="h-4 w-4 shrink-0" /> {message}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] font-medium text-rose-700">
      {children}
    </p>
  );
}

export function PrimaryButton({
  children,
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

const FIELD_CLASS =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[11px] font-bold text-slate-600">
      {children}
      {required ? " *" : ""}
    </span>
  );
}

export function InputField({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <FieldLabel required={props.required}>{label}</FieldLabel>
      <input {...props} className={FIELD_CLASS} />
      {hint && <span className="mt-1 block text-[10.5px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <FieldLabel required={props.required}>{label}</FieldLabel>
      <select {...props} className={FIELD_CLASS}>
        {children}
      </select>
      {hint && <span className="mt-1 block text-[10.5px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextareaField({
  label,
  hint,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <FieldLabel required={props.required}>{label}</FieldLabel>
      <textarea {...props} className={FIELD_CLASS} />
      {hint && <span className="mt-1 block text-[10.5px] text-slate-400">{hint}</span>}
    </label>
  );
}

/** Barra horizontal simple para embudos y distribuciones. */
export function BarRow({
  label,
  value,
  total,
  cls = "bg-blue-500",
}: {
  label: string;
  value: number;
  total: number;
  cls?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-[11.5px] font-semibold text-slate-600">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={cn("block h-full rounded-full transition-all", cls)} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-14 shrink-0 text-right text-[11.5px] font-bold text-slate-700">{value}</span>
    </div>
  );
}

import type { ReactNode } from "react";

const nf = new Intl.NumberFormat("es-CL");

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  iconClass?: string;
  trend?: ReactNode;
};

export function StatCard({ label, value, hint, icon, iconClass, trend }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass ?? "bg-blue-50 text-blue-600"}`}>
          {icon}
        </div>
        {trend}
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
        {typeof value === "number" ? nf.format(value) : value}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

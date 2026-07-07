import Link from "next/link";
import { GraduationCap } from "lucide-react";

const TABS = [
  { key: "resumen", label: "Resumen", href: "/admin/becas" },
  { key: "campanas", label: "Campañas", href: "/admin/becas/campanas" },
  { key: "participantes", label: "Participantes", href: "/admin/becas/participantes" },
  { key: "vitrina", label: "Vitrina", href: "/admin/becas/vitrina" },
  { key: "seleccion", label: "Selección", href: "/admin/becas/seleccion" },
] as const;

export type BecasTabKey = (typeof TABS)[number]["key"];

type BecasHeaderProps = {
  active: BecasTabKey;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function BecasHeader({ active, title, description, actions }: BecasHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">
              Becas Web Pyme
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={
              tab.key === active
                ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm"
                : "rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

import { requireCommercialUser } from "@/lib/commercial/session";
import { Users, Target, DollarSign, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  executive: "Ejecutivo comercial",
  portfolio: "Gestor de cartera",
  partner: "Partner / Referidor",
};

export default async function PortalComercialHome() {
  const user = await requireCommercialUser();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Hola, {user.name.split(" ")[0]}</h1>
        <p className="text-[13px] text-slate-500">
          Bienvenido a tu portal comercial de Zyteron · {ROLE_LABEL[user.role] ?? user.role}
        </p>
      </div>

      {/* Resumen (se irá poblando con datos reales por fase) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Referidos / Prospectos", value: "0", icon: Users, cls: "bg-blue-50 text-blue-600" },
          { label: "Oportunidades", value: "0", icon: Target, cls: "bg-violet-50 text-violet-600" },
          { label: "Comisión acumulada", value: "$0", icon: DollarSign, cls: "bg-emerald-50 text-emerald-600" },
          { label: "Estados mensuales", value: "0", icon: FileText, cls: "bg-amber-50 text-amber-600" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${k.cls}`}>
                <k.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-bold text-slate-900">Tu cuenta</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <Row label="Nombre" value={user.name} />
          <Row label="RUT" value={user.rut} />
          <Row label="Correo" value={user.email || "—"} />
          <Row label="Teléfono" value={user.phone || "—"} />
          <Row label="Rol" value={ROLE_LABEL[user.role] ?? user.role} />
          <Row label="% comisión" value={`${user.commission_pct || 0}%`} />
        </dl>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500">
          Las secciones de prospectos, oportunidades, comisiones y estados mensuales se activarán próximamente. Tu acceso
          y tus datos ya quedaron configurados de forma segura.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-1.5">
      <dt className="text-[12px] text-slate-500">{label}</dt>
      <dd className="text-[13px] font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

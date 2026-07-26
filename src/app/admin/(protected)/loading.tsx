/**
 * Pantalla de carga del admin. Se muestra al instante al navegar (streaming de
 * Next), así el panel "responde de inmediato" mientras carga la página real.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Encabezado */}
      <div className="space-y-2">
        <div className="h-6 w-56 rounded-lg bg-slate-200" />
        <div className="h-3 w-80 rounded bg-slate-100" />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-slate-100" />
              <div className="h-9 w-9 rounded-xl bg-slate-100" />
            </div>
            <div className="mt-4 h-7 w-28 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Contenido */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
      </div>
      <div className="h-64 rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}

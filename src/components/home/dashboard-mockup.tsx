import { cssVars } from "./css-vars";

const BARS = [0.42, 0.58, 0.5, 0.74, 0.62, 0.86, 0.7, 0.94];

const TILES = [
  { label: "Pedidos", value: "128", trend: "+12%" },
  { label: "Reservas", value: "46", trend: "+8%" },
  { label: "Formularios", value: "312", trend: "+21%" },
];

const ROWS = [
  { label: "Cotización #1042", state: "Aprobada", tone: "bg-emerald-50 text-emerald-700" },
  { label: "Pedido #8831", state: "En despacho", tone: "bg-sky-50 text-sky-700" },
  { label: "Reserva #219", state: "Pendiente", tone: "bg-amber-50 text-amber-700" },
];

/**
 * Panel administrativo ilustrativo que se arma al entrar en pantalla:
 * tarjetas en cascada, barras que crecen y una línea que se dibuja.
 * Decorativo (aria-hidden): las capacidades reales se listan en texto.
 */
export function DashboardMockup() {
  return (
    <div data-scene="enter" className="cx-dash" aria-hidden="true">
      <div className="flex">
        <div className="hidden w-40 shrink-0 space-y-3 border-r border-slate-100 bg-slate-50/70 p-4 sm:block">
          <div className="flex items-center gap-2 pb-2">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-600 to-blue-900" />
            <span className="h-2 w-14 rounded-full bg-slate-300" />
          </div>
          {[0.8, 0.6, 0.7, 0.5, 0.65].map((width, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${index === 0 ? "bg-blue-100/70" : ""}`}
            >
              <span className={`h-3 w-3 rounded ${index === 0 ? "bg-blue-600" : "bg-slate-300"}`} />
              <span
                className={`h-1.5 rounded-full ${index === 0 ? "bg-blue-400" : "bg-slate-200"}`}
                style={{ width: `${width * 100}%` }}
              />
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="block h-2.5 w-28 rounded-full bg-slate-800" />
              <span className="block h-1.5 w-20 rounded-full bg-slate-200" />
            </div>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold text-white">Exportar PDF</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {TILES.map((tile, index) => (
              <div
                key={tile.label}
                className="cx-dash-tile rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                style={cssVars({ "--k": index })}
              >
                <p className="text-[10px] font-semibold text-slate-500">{tile.label}</p>
                <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">{tile.value}</p>
                <p className="text-[10px] font-bold text-emerald-600">{tile.trend}</p>
              </div>
            ))}
          </div>

          <div className="relative rounded-xl border border-slate-100 p-3">
            <div className="flex h-28 items-end gap-2 sm:h-32">
              {BARS.map((height, index) => (
                <span
                  key={index}
                  className="cx-dash-bar h-full flex-1"
                  style={cssVars({ "--h": height, "--k": index })}
                />
              ))}
            </div>
            <svg
              className="pointer-events-none absolute inset-3"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                className="cx-dash-line"
                pathLength={1}
                d="M0 30 C 12 26, 18 18, 28 21 S 45 12, 55 15 S 72 6, 82 9 S 95 3, 100 2"
                stroke="#0ea5e9"
                strokeWidth="1.2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div className="space-y-2">
            {ROWS.map((row, index) => (
              <div
                key={row.label}
                className="cx-dash-tile flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                style={cssVars({ "--k": index + 2 })}
              >
                <span className="text-[11px] font-semibold text-slate-700">{row.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.tone}`}>{row.state}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

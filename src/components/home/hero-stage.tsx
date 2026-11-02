import Image from "next/image";
import { Lock, MonitorSmartphone, Search, TrendingUp } from "lucide-react";
import { cssVars } from "./css-vars";

/**
 * Escenario decorativo del hero: navegador con un demo real, un celular y
 * chips flotantes. Se inclina al cargar y se endereza con el scroll (lee
 * `--p` de la sección hero). Todo es aria-hidden: el contenido indexable
 * vive en el texto del hero y en la sección de demos.
 */
export function HeroStage() {
  return (
    <div className="cx-stage-wrap relative mx-auto mt-14 w-full max-w-5xl sm:mt-20" aria-hidden="true">
      <div className="cx-stage-enter">
        <div className="cx-stage">
          <div className="cx-browser">
            <div className="cx-browser-bar">
              <span className="cx-browser-dot" />
              <span className="cx-browser-dot" />
              <span className="cx-browser-dot" />
              <span className="mx-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] font-medium text-slate-500">
                <Lock className="h-3 w-3 text-emerald-600" />
                www.tu-empresa.cl
              </span>
              <span className="w-12" />
            </div>
            <div className="relative aspect-[16/9] bg-slate-100">
              <Image
                src="/demos/tienda-ropa/tienda-ropa-01.png"
                alt=""
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 1024px) 100vw, 1024px"
                quality={80}
                className="object-cover object-top"
              />
            </div>
          </div>

          {/* Celular con una versión móvil simplificada */}
          <div
            className="cx-float -right-3 bottom-[-8%] w-[26%] max-w-[210px] sm:-right-8 lg:-right-14"
            style={cssVars({ "--speed": 170 })}
          >
            <div className="cx-float-inner" style={cssVars({ "--bob": "0.6s" })}>
              <div className="cx-phone">
                <div className="flex items-center justify-between px-3 pb-2 pt-3">
                  <span className="h-1.5 w-10 rounded-full bg-slate-800" />
                  <span className="h-1.5 w-4 rounded-full bg-slate-300" />
                </div>
                <div className="space-y-2.5 px-3 pb-4">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 p-2.5">
                    <span className="block h-1.5 w-1/2 rounded-full bg-white/80" />
                    <span className="mt-1.5 block h-1.5 w-3/4 rounded-full bg-white/60" />
                  </div>
                  <span className="block h-2 w-11/12 rounded-full bg-slate-200" />
                  <span className="block h-2 w-3/5 rounded-full bg-slate-200" />
                  <span className="flex h-6 items-center justify-center rounded-lg bg-blue-700 text-[8px] font-bold text-white">
                    Cotizar ahora
                  </span>
                  <span className="flex h-6 items-center justify-center rounded-lg border border-emerald-300 text-[8px] font-bold text-emerald-700">
                    WhatsApp
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <span className="aspect-square rounded-lg bg-slate-100" />
                    <span className="aspect-square rounded-lg bg-blue-50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="cx-float -left-2 top-[18%] hidden sm:block lg:-left-16"
            style={cssVars({ "--speed": 260 })}
          >
            <div className="cx-float-inner cx-chip" style={cssVars({ "--bob": "0s" })}>
              <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
                <Search className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-bold text-slate-900">Base SEO</span>
                <span className="block text-[11px] text-slate-500">Rastreo e indexación</span>
              </span>
            </div>
          </div>

          <div
            className="cx-float -left-4 bottom-[14%] hidden md:block lg:-left-24"
            style={cssVars({ "--speed": 120 })}
          >
            <div className="cx-float-inner cx-chip" style={cssVars({ "--bob": "1.4s" })}>
              <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-bold text-slate-900">Más consultas</span>
                <span className="block text-[11px] text-slate-500">Web enfocada en convertir</span>
              </span>
            </div>
          </div>

          <div
            className="cx-float -right-4 top-[10%] hidden lg:block lg:-right-20"
            style={cssVars({ "--speed": 220 })}
          >
            <div className="cx-float-inner cx-chip" style={cssVars({ "--bob": "2.2s" })}>
              <span className="rounded-xl bg-sky-50 p-2 text-sky-600">
                <MonitorSmartphone className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-bold text-slate-900">Responsive</span>
                <span className="block text-[11px] text-slate-500">Celular · Tablet · Computador</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

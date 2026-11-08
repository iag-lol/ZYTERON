import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { FLEET_PLANS, FLEET_SOFTWARE_OFFER, clp, type FleetPlan } from "@/config/pricing";

function fleetCtaHref(plan: FleetPlan) {
  return `/cotizador?tipo=sistema-web&plan=${plan.id}&origen=planes-flota`;
}

export function FleetSoftwareOffer() {
  return (
    <div className="fleet-commercial-offer grid gap-0 overflow-hidden rounded-xl border border-slate-200 lg:grid-cols-[1.05fr_1fr]">
      <div className="bg-[#1c2d29] p-7 text-white sm:p-9">
        <p className="text-xs font-semibold tracking-widest text-emerald-100 uppercase">
          Inversión en tu plataforma
        </p>
        <h3 className="mt-4 text-2xl font-semibold">Desarrollo del software</h3>
        <p className="mt-5 font-semibold tracking-tight">
          <span className="mb-1 block text-sm font-normal text-slate-200">Desde</span>
          <span className="text-3xl sm:text-4xl">{clp(FLEET_SOFTWARE_OFFER.amount)}</span>
          <span className="ml-2 text-base"> + IVA</span>
        </p>
        <p className="mt-4 max-w-lg text-sm leading-7 text-slate-200">
          {FLEET_SOFTWARE_OFFER.scope}
        </p>
        <p className="mt-4 border-t border-white/20 pt-4 text-sm leading-6 text-slate-200">
          El desarrollo se contrata de forma independiente del equipamiento y los servicios de
          operación.
        </p>
        <Link
          href="/contacto?tipo=sistema&servicio=control-flota&origen=planes-flota"
          className="mt-6 inline-flex min-h-12 items-center gap-3 rounded bg-white px-5 py-3 text-sm font-semibold text-slate-900"
        >
          Solicitar propuesta de flota <ArrowRight size={16} />
        </Link>
      </div>
      <div className="divide-y divide-slate-200 bg-white px-7 sm:px-9">
        <div className="py-7 sm:py-9">
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
            Implementación · Cotización independiente
          </p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">
            Equipamiento GPS e instalación
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {FLEET_SOFTWARE_OFFER.implementation}
          </p>
        </div>
        <div className="py-7 sm:py-9">
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
            Continuidad · Según propuesta
          </p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">Operación y acompañamiento</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{FLEET_SOFTWARE_OFFER.operation}</p>
        </div>
      </div>
    </div>
  );
}

export function FleetPlans() {
  return (
    <div className="space-y-9">
      <FleetSoftwareOffer />
      <div>
        <h3 className="text-xl font-semibold text-slate-900">
          El alcance se adapta a tu operación
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Definimos una primera etapa y las ampliaciones que necesita tu empresa. Las siguientes
          capacidades se evalúan durante el diagnóstico; la cotización confirma cuáles se incluyen.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {FLEET_PLANS.map((plan) => (
          <article key={plan.id} className="flex flex-col border-t border-slate-300 pt-5">
            <h4 className="text-lg font-semibold text-slate-900">{plan.name}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">{plan.summary}</p>
            <details className="group mt-4">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-blue-800">
                Explorar capacidades{" "}
                <ChevronDown size={16} className="shrink-0 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm font-semibold text-slate-800">{plan.featuresTitle}</p>
              <ul className="mt-3 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-600">
                    <Check size={14} className="mt-1 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.portals?.map((portal) => (
                <div key={portal.title} className="mt-5">
                  <p className="text-sm font-semibold text-slate-800">{portal.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{portal.intro}</p>
                  <ul className="mt-2 list-inside list-disc text-sm leading-6 text-slate-600">
                    {portal.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
            <Link
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-800"
              href={fleetCtaHref(plan)}
            >
              Evaluar este alcance <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

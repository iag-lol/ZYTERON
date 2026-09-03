"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, MapPin, Sparkles, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FLEET_COMPARISON,
  FLEET_HARDWARE_AMOUNTS,
  FLEET_HARDWARE_TOTAL,
  FLEET_PLANS,
  FLEET_PLATFORM_MAINTENANCE,
  clp,
  type FleetPlan,
} from "@/config/pricing";

/**
 * Plataformas de gestión de flota.
 *
 * Las listas de funciones son largas por naturaleza (una plataforma operacional
 * hace muchas cosas), así que se muestran plegadas: la tarjeta deja ver el
 * precio, el equipamiento y el costo mensual sin que haya que desplazarse, y
 * quien quiera el detalle lo despliega.
 */

/** Destino del botón: el cotizador identifica el plan por el parámetro. */
function fleetCtaHref(plan: FleetPlan) {
  return `/cotizador?tipo=sistema-web&plan=${plan.id}&origen=planes-flota`;
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function FleetCard({ plan }: { plan: FleetPlan }) {
  const [open, setOpen] = useState(false);
  const panelId = `flota-funciones-${plan.id}`;

  return (
    <article className="flex h-full flex-col rounded-3xl border border-blue-200 border-t-4 border-t-blue-800 bg-white p-6 shadow-md shadow-blue-100/60 sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-extrabold text-slate-900">{plan.name}</h3>
        {plan.tag ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> {plan.tag}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-blue-800">{plan.range}</p>

      <div className="mt-4 border-y border-slate-100 py-4">
        <p className="text-2xl font-extrabold text-slate-900">{plan.price}</p>
        <p className="mt-0.5 text-xs text-slate-500">{plan.summary}</p>
      </div>

      {/* Equipamiento y mensualidad: es lo que más se pregunta, va antes que la
          lista de funciones para que no haya que desplegar nada para verlo. */}
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" /> Equipamiento por vehículo
          </p>
          <div className="mt-2.5 space-y-1.5">
            <PriceRow label="GPS configurado e integrado" value={`${clp(FLEET_HARDWARE_AMOUNTS.gps)} + IVA`} />
            <PriceRow
              label="Instalación profesional"
              value={`${clp(FLEET_HARDWARE_AMOUNTS.installation)} + IVA`}
            />
            <div className="mt-1 border-t border-slate-200 pt-1.5">
              <PriceRow label="Total por vehículo" value={`${clp(FLEET_HARDWARE_TOTAL)} + IVA`} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Servicio mensual
          </p>
          <div className="mt-2.5 space-y-1.5">
            <PriceRow
              label="GPS y conectividad, por vehículo"
              value={`${clp(plan.monthlyPerVehicle)} + IVA`}
            />
            <PriceRow
              label="Mantención de plataforma"
              value={`${clp(FLEET_PLATFORM_MAINTENANCE)} + IVA`}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
        >
          <span>
            {plan.featuresTitle}
            <span className="ml-1.5 font-semibold text-slate-500">({plan.features.length})</span>
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        <div id={panelId} hidden={!open} className="mt-3">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-600">
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {plan.portals?.map((portal) => (
            <div key={portal.title} className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <h4 className="text-sm font-extrabold text-slate-900">{portal.title}</h4>
              <p className="mt-1 text-xs leading-5 text-slate-600">{portal.intro}</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {portal.items.map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />
      <div className="mt-5">
        <Button asChild className="w-full bg-blue-700 font-bold text-white hover:bg-blue-800">
          <Link href={fleetCtaHref(plan)}>
            {plan.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function FleetPlans() {
  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-3">
        {FLEET_PLANS.map((plan) => (
          <FleetCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* Comparativa. En móvil se desplaza dentro de su propio contenedor para
          que la página nunca desborde en horizontal. */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-lg font-extrabold text-slate-900">Comparación de los tres niveles</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Comparación de funcionalidades y precios entre Flota Pequeña, Flota Mediana y Flota Grande
            </caption>
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" className="p-3 font-bold text-slate-900">
                  Característica
                </th>
                {FLEET_PLANS.map((plan) => (
                  <th key={plan.id} scope="col" className="p-3 font-bold text-slate-900">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FLEET_COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-slate-100 last:border-b-0">
                  <th scope="row" className="p-3 text-left font-semibold text-slate-700">
                    {row.feature}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={`${row.feature}-${FLEET_PLANS[index].id}`} className="p-3 text-slate-600">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

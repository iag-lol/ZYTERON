"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, MapPin, Sparkles, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FLEET_COMPARISON,
  FLEET_EXAMPLES,
  FLEET_INFRA_VOLUME_NOTE,
  FLEET_HARDWARE_AMOUNTS,
  FLEET_HARDWARE_TOTAL,
  FLEET_PLANS,
  FLEET_PLATFORM_MAINTENANCE,
  FLEET_VEHICLE_INFRA_INCLUDES,
  clp,
  fleetQuote,
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
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Infraestructura + GPS + conectividad
          </p>
          <div className="mt-2.5 space-y-1.5">
            <PriceRow label="Por vehículo / mes" value={`${clp(plan.monthlyPerVehicle)} + IVA`} />
            <PriceRow
              label="Mantención de plataforma (fija)"
              value={`${clp(FLEET_PLATFORM_MAINTENANCE)} + IVA`}
            />
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">
            La mantención es un valor fijo por cliente; la infraestructura se calcula por vehículo activo.
          </p>

          {/* Qué sostiene ese valor. Va plegado para no competir con el precio,
              pero disponible: es la pregunta que sigue a "¿por qué mensual?". */}
          <details className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-blue-800">
              <span>Qué incluye por vehículo</span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {FLEET_VEHICLE_INFRA_INCLUDES.map((item) => (
                <li key={item} className="flex gap-1.5 text-[11px] leading-5 text-slate-600">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </details>
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

/**
 * Calculadora de operación.
 *
 * Deliberadamente NO suma el desarrollo al total: ese valor parte "desde" y
 * depende del levantamiento, así que sumarlo daría una cifra cerrada que no
 * podríamos sostener. Se muestra aparte, como referencia del tramo.
 */
function FleetCalculator() {
  const [vehicles, setVehicles] = useState(25);
  const quote = fleetQuote(vehicles);

  return (
    <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-md shadow-blue-100/60 sm:p-8">
      <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">Calcula tu operación mensual</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        La infraestructura se cobra por vehículo activo y la mantención de la plataforma es un valor fijo por cliente.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="flota-vehiculos" className="block text-sm font-bold text-slate-800">
            ¿Cuántos vehículos tiene su flota?
          </label>
          <input
            id="flota-vehiculos"
            type="number"
            min={1}
            max={2000}
            inputMode="numeric"
            value={vehicles}
            onChange={(event) => setVehicles(Number(event.target.value))}
            className="mt-2 w-40 rounded-xl border border-slate-300 px-4 py-2.5 text-lg font-bold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900">
          Tramo: {quote.tier.label} · {clp(quote.tier.perVehicle)} + IVA por vehículo
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Operación mensual</p>
          <dl className="mt-3 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-slate-600">
                Infraestructura ({quote.count} × {clp(quote.tier.perVehicle)})
              </dt>
              <dd className="text-sm font-bold text-slate-900">{clp(quote.infrastructure)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-slate-600">Mantención de plataforma</dt>
              <dd className="text-sm font-bold text-slate-900">{clp(quote.maintenance)}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
              <dt className="text-sm font-bold text-slate-800">Total mensual estimado</dt>
              <dd className="text-xl font-extrabold text-slate-900">{clp(quote.monthlyTotal)} + IVA</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Equipamiento inicial</p>
          <dl className="mt-3 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-slate-600">
                GPS ({quote.count} × {clp(FLEET_HARDWARE_AMOUNTS.gps)})
              </dt>
              <dd className="text-sm font-bold text-slate-900">{clp(quote.gps)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-slate-600">
                Instalación ({quote.count} × {clp(FLEET_HARDWARE_AMOUNTS.installation)})
              </dt>
              <dd className="text-sm font-bold text-slate-900">{clp(quote.installation)}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
              <dt className="text-sm font-bold text-slate-800">Total equipamiento</dt>
              <dd className="text-xl font-extrabold text-slate-900">{clp(quote.hardwareTotal)} + IVA</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
            Más el desarrollo de la plataforma, {`desde ${clp(quote.development)} + IVA`} para este tramo. El valor
            final se define tras el levantamiento, por eso no se suma automáticamente.
          </p>
        </div>
      </div>

      <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        {FLEET_INFRA_VOLUME_NOTE}
      </p>
    </div>
  );
}

/** Ejemplos ya calculados, para quien prefiere ver un caso antes que probar. */
function FleetExamples() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
      <h3 className="text-lg font-extrabold text-slate-900">Ejemplos de operación mensual</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Mantención de plataforma + (vehículos × tarifa del tramo).
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {FLEET_EXAMPLES.map((example) => (
          <div key={example.count} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">{example.tier.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{example.count} vehículos</p>
            <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between gap-2">
                <dt>
                  {example.count} × {clp(example.tier.perVehicle)}
                </dt>
                <dd className="font-semibold text-slate-800">{clp(example.infrastructure)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Mantención</dt>
                <dd className="font-semibold text-slate-800">{clp(example.maintenance)}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-slate-200 pt-3 text-lg font-extrabold text-slate-900">
              {clp(example.monthlyTotal)} + IVA
              <span className="ml-1 text-xs font-semibold text-slate-500">/ mes</span>
            </p>
          </div>
        ))}
      </div>
    </div>
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

      <FleetCalculator />

      <FleetExamples />

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

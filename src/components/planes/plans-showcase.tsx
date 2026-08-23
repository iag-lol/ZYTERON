"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, MessageCircle, Sparkles } from "lucide-react";
import { QuickQuoteModal } from "@/components/planes/quick-quote-modal";
import { cn } from "@/lib/utils";

/**
 * Vitrina de planes.
 *
 * La página mostraba ocho planes con su lista completa de inclusiones y
 * exclusiones: demasiada información para decidir. Ahora se presentan tres
 * —el recorrido natural de compra— con lo esencial de cada uno, y el resto
 * queda a un clic de distancia para quien quiera comparar todo.
 */

export type ShowcasePlan = {
  id: string;
  name: string;
  price: string;
  priceNote?: string;
  tag: string;
  audience: string;
  description: string;
  includes: string[];
  quoteHref: string;
  /** Texto del botón. Cambia por nivel: no se cotiza igual una web que una plataforma. */
  cta?: string;
};

export function PlansShowcase({
  featured,
  rest,
}: {
  featured: ShowcasePlan[];
  rest: ShowcasePlan[];
}) {
  const [showAll, setShowAll] = useState(false);
  const [quotePlan, setQuotePlan] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function openQuote(planName: string) {
    setQuotePlan(planName);
    setModalOpen(true);
  }

  return (
    <>
      {/* Tres planes destacados */}
      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        {featured.map((plan, index) => {
          const highlighted = index === 1;
          return (
            <article
              key={plan.id}
              className={cn(
                "relative flex h-full flex-col rounded-3xl border bg-white p-6 transition-shadow sm:p-7",
                highlighted
                  ? "border-blue-300 shadow-xl shadow-blue-100/70 ring-1 ring-blue-100 lg:-mt-4 lg:pb-9 lg:pt-9"
                  : "border-slate-200 shadow-sm hover:shadow-md",
              )}
            >
              {highlighted && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-600 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-600/25">
                  <Sparkles className="h-3 w-3" /> Más elegido
                </span>
              )}

              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">{plan.tag}</p>
              <h3 className="mt-2 text-[22px] font-extrabold tracking-tight text-slate-900">{plan.name}</h3>
              <p className="mt-2 text-[13.5px] leading-6 text-slate-500">{plan.description}</p>

              <div className="mt-5 border-y border-slate-100 py-4">
                <p className="text-[26px] font-extrabold tracking-tight text-slate-900">{plan.price}</p>
                <p className="mt-0.5 text-[12px] text-slate-400">
                  {plan.priceNote ? `${plan.priceNote} · ` : ""}Valor referencial
                </p>
              </div>

              <ul className="mt-5 space-y-2.5">
                {plan.includes.slice(0, 6).map((item) => (
                  <li key={item} className="flex gap-2.5 text-[13.5px] leading-6 text-slate-600">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3 text-[12.5px] leading-5 text-slate-500">
                {plan.audience}
              </p>

              <div className="mt-6 flex-1" />

              <button
                onClick={() => openQuote(plan.name)}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-bold transition-colors",
                  highlighted
                    ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                    : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                )}
              >
                <MessageCircle className="h-4 w-4" /> {plan.cta ?? "Cotizar este plan"}
              </button>
              <Link
                href={plan.quoteHref}
                className="mt-2 inline-flex items-center justify-center gap-1 text-[12.5px] font-semibold text-slate-400 transition-colors hover:text-blue-700"
              >
                Ver detalle completo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          );
        })}
      </div>

      {/* El resto del catálogo, oculto hasta que se pida */}
      <div className="mt-10 text-center">
        <button
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[13.5px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          {showAll
            ? "Ocultar los demás planes"
            : rest.length === 1
              ? "Ver el otro plan"
              : `Ver los ${rest.length} planes restantes`}
          <ChevronDown className={cn("h-4 w-4 transition-transform", showAll && "rotate-180")} />
        </button>
        {!showAll && (
          <p className="mx-auto mt-3 max-w-md text-[12.5px] leading-5 text-slate-400">
            Catálogos, sistemas administrativos y desarrollos a medida.
          </p>
        )}
      </div>

      {showAll && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rest.map((plan) => (
            <article
              key={plan.id}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{plan.tag}</p>
              <h3 className="mt-1.5 text-[17px] font-extrabold tracking-tight text-slate-900">{plan.name}</h3>
              <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-5 text-slate-500">{plan.description}</p>
              <p className="mt-3 text-[18px] font-extrabold text-slate-900">{plan.price}</p>

              <ul className="mt-3 space-y-1.5">
                {plan.includes.slice(0, 3).map((item) => (
                  <li key={item} className="flex gap-2 text-[12.5px] leading-5 text-slate-600">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                    <span className="line-clamp-1">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex-1" />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openQuote(plan.name)}
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-slate-800"
                >
                  Cotizar
                </button>
                <Link
                  href={plan.quoteHref}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Detalle
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <QuickQuoteModal open={modalOpen} planName={quotePlan} onClose={() => setModalOpen(false)} />
    </>
  );
}

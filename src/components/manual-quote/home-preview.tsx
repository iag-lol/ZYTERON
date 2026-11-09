"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Clock3, ArrowRight } from "lucide-react";
import { clp } from "@/config/pricing";
import { CLOSED_PLANS, CLOSED_ADDONS } from "@/lib/manual-quote/catalog";
export function HomeQuotePreview() {
  const [id, setId] = useState("pyme");
  const selected = CLOSED_PLANS.find((p) => p.id === id)!;
  return (
    <section className="manual-home" id="cotizar">
      <div className="site-container mx-auto">
        <div className="manual-home-intro">
          <p className="eyebrow">Tu proyecto, con un alcance claro</p>
          <h2>
            Elige lo que necesitas.
            <br />
            <span>Conoce cuánto cuesta.</span>
          </h2>
          <p>
            Parte de un plan y agrega las funciones que te sirven. Revisa entregables, plazos y
            precio total antes de contratar.
          </p>
          <div className="manual-assurances">
            <span>
              <Check size={16} /> Precios definidos
            </span>
            <span>
              <Check size={16} /> Alcance por escrito
            </span>
            <span>
              <Check size={16} /> Sin suscripciones automáticas
            </span>
          </div>
        </div>
        <div className="manual-home-card">
          <p className="eyebrow">01 / Elige tu punto de partida</p>
          <div className="manual-plan-pills" role="group" aria-label="Plan para cotizar">
            {CLOSED_PLANS.map((p) => (
              <button
                type="button"
                key={p.id}
                aria-pressed={id === p.id}
                onClick={() => setId(p.id)}
              >
                {p.name.replace("Plan ", "")}
              </button>
            ))}
          </div>
          <div className="manual-home-price">
            <div>
              <h3>{selected.name}</h3>
              <p>{selected.summary}</p>
            </div>
            <strong>
              {clp(selected.amount)}
              <small>+ IVA · desarrollo base</small>
            </strong>
          </div>
          <p className="manual-preview-scope">{selected.includes[0]}</p>
          <p className="manual-preview-modules">
            {CLOSED_ADDONS.length} módulos para ampliar tu proyecto: correo corporativo, dominios,
            calendarios, bases de datos, integraciones y más.
          </p>
          <p className="manual-time">
            <Clock3 size={16} />
            {selected.days.join("–")} días hábiles de desarrollo base*
          </p>
          <Link className="design-button" href={`/cotizador/manual?plan=${id}`}>
            Configurar mi proyecto <ArrowRight size={18} />
          </Link>
          <small>
            *Desde pago, contenidos y accesos completos. Los adicionales amplían el plazo.
          </small>
        </div>
      </div>
    </section>
  );
}

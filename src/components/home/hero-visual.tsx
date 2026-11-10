import Image from "next/image";
import { Check } from "lucide-react";

/**
 * Composición decorativa del hero: capturas reales de proyectos publicados
 * apiladas en marcos de navegador. Es puramente visual (aria-hidden, alt
 * vacío): no agrega texto indexable ni cambia el contenido de la portada.
 */
export function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hv-grid" />
      <div className="hv-frame hv-back">
        <div className="hv-bar">
          <i />
          <i />
          <i />
          <b />
        </div>
        <div className="hv-shot">
          <Image
            src="/projects/denurvia.jpg"
            alt=""
            fill
            sizes="(max-width: 1024px) 60vw, 420px"
            className="object-cover object-top"
          />
        </div>
      </div>
      <div className="hv-frame hv-front">
        <div className="hv-bar">
          <i />
          <i />
          <i />
          <b />
        </div>
        <div className="hv-shot">
          <Image
            src="/projects/control-de-flota.jpg"
            alt=""
            fill
            preload
            sizes="(max-width: 1024px) 80vw, 520px"
            className="object-cover object-top"
          />
        </div>
      </div>
      <div className="hv-frame hv-mini">
        <div className="hv-shot">
          <Image
            src="/projects/fenice.jpg"
            alt=""
            fill
            sizes="(max-width: 1024px) 40vw, 260px"
            className="object-cover object-top"
          />
        </div>
      </div>
      <div className="hv-pulse">
        <span>
          <Check size={15} strokeWidth={2.5} />
        </span>
        <div>
          <b />
          <b />
        </div>
      </div>
    </div>
  );
}

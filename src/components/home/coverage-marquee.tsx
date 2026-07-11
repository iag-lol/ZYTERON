import { MapPin } from "lucide-react";
import { localPages } from "@/content/local-pages";

/**
 * Cinta animada con las ciudades atendidas, de Arica a Punta Arenas.
 * Es CSS puro (sin JS): la lista se duplica para lograr un loop continuo y
 * la segunda copia va con aria-hidden para no duplicar contenido accesible.
 */
export function CoverageMarquee() {
  const cities = localPages
    .filter((page) => page.slug !== "region-metropolitana")
    .map((page) => page.city);

  const chips = (hidden: boolean) => (
    <div className="marquee-group" role={hidden ? undefined : "list"} aria-hidden={hidden || undefined}>
      {cities.map((city) => (
        <span
          key={city}
          role={hidden ? undefined : "listitem"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
        >
          <MapPin className="h-3.5 w-3.5 text-blue-600" />
          {city}
        </span>
      ))}
    </div>
  );

  return (
    <section aria-label="Ciudades de Chile donde diseñamos páginas web" className="marquee py-2">
      <div className="marquee-track">
        {chips(false)}
        {chips(true)}
      </div>
    </section>
  );
}

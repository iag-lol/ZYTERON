import Image from "next/image";

type ClientLogo = {
  name: string;
  src: string;
  width: number;
  height: number;
};

// Dimensiones reales de los PNG en public/clientes (fondo blanco puro,
// recortados al contenido del logo). Si agregas uno nuevo, procesa la imagen
// igual: fondo blanco, sin márgenes muertos, alto 220px.
const clientLogos: ClientLogo[] = [
  { name: "Asiss", src: "/clientes/asiss.png", width: 552, height: 220 },
  { name: "New Mini Check", src: "/clientes/new-mini-check.png", width: 746, height: 220 },
  { name: "RedLog", src: "/clientes/redlog.png", width: 656, height: 220 },
  { name: "TurnoERnoc", src: "/clientes/turnoernoc.png", width: 759, height: 220 },
  { name: "Fenice SpA", src: "/clientes/fenice.png", width: 702, height: 220 },
  { name: "Eliana Negocios", src: "/clientes/eliana.png", width: 751, height: 220 },
];

/**
 * Cinta automática con logos de empresas que han trabajado con Zyteron.
 * CSS puro (misma técnica del marquee de cobertura): la lista se repite dos
 * veces por mitad para cubrir monitores anchos sin huecos, y la segunda mitad
 * va con aria-hidden para no duplicar contenido accesible.
 *
 * Las imágenes van `unoptimized` (son PNG livianos ya procesados): se sirven
 * tal cual desde /public, sin depender del optimizador de imágenes.
 */
export function ClientLogosMarquee() {
  const logoCard = (logo: ClientLogo, hidden: boolean, copy: number) => (
    <span
      key={`${logo.name}-${copy}`}
      role={hidden ? undefined : "listitem"}
      className="flex h-20 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 shadow-sm transition-shadow hover:shadow-md sm:h-24 sm:px-8 sm:py-4"
    >
      <Image
        src={logo.src}
        alt={hidden ? "" : `Logo de ${logo.name}, empresa que trabajó con Zyteron`}
        // Se declaran al tamaño en que se muestran (64px de alto), no al del
        // archivo: así Next genera un srcset corto de 1x/2x en vez de veinte
        // candidatos por logo, que en una cinta de 24 copias inflaba el HTML.
        width={Math.round((logo.width / logo.height) * 64)}
        height={64}
        quality={80}
        // Solo la primera copia visible entra en la carga inicial: el resto son
        // duplicados de la animación y la segunda tanda del carrusel.
        loading={hidden || copy > 1 ? "lazy" : "eager"}
        className="h-12 w-auto max-w-none sm:h-16"
      />
    </span>
  );

  const group = (hidden: boolean) => (
    <div
      className="marquee-group items-center"
      role={hidden ? undefined : "list"}
      aria-hidden={hidden || undefined}
    >
      {clientLogos.map((logo) => logoCard(logo, hidden, 1))}
      {clientLogos.map((logo) => logoCard(logo, hidden, 2))}
    </div>
  );

  return (
    <section aria-label="Empresas que han trabajado con Zyteron" className="marquee py-2">
      <div className="marquee-track marquee-track-logos">
        {group(false)}
        {group(true)}
      </div>
    </section>
  );
}

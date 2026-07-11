import Image from "next/image";

type ClientLogo = {
  name: string;
  src: string;
};

const clientLogos: ClientLogo[] = [
  { name: "Asiss", src: "/clientes/asiss.png" },
  { name: "New Mini Check", src: "/clientes/new-mini-check.png" },
  { name: "RedLog", src: "/clientes/redlog.png" },
  { name: "TurnoERnoc", src: "/clientes/turnoernoc.png" },
  { name: "Fenice SpA", src: "/clientes/fenice.png" },
  { name: "Eliana Negocios", src: "/clientes/eliana.png" },
];

/**
 * Cinta automática con logos de empresas que han trabajado con Zyteron.
 * CSS puro (misma técnica del marquee de cobertura): la lista se repite dos
 * veces por mitad para cubrir monitores anchos sin huecos, y la segunda mitad
 * va con aria-hidden para no duplicar contenido accesible.
 */
export function ClientLogosMarquee() {
  const logoCard = (logo: ClientLogo, hidden: boolean, copy: number) => (
    <span
      key={`${logo.name}-${copy}`}
      role={hidden ? undefined : "listitem"}
      className="flex h-20 w-40 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm transition-shadow hover:shadow-md sm:h-24 sm:w-48"
    >
      <Image
        src={logo.src}
        alt={hidden ? "" : `Logo de ${logo.name}, empresa que trabajó con Zyteron`}
        width={140}
        height={99}
        quality={90}
        loading="lazy"
        className="h-full w-auto object-contain"
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

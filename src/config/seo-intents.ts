export type SeoIntent = {
  path: string;
  primaryKeyword: string;
  intent: "marca" | "comercial" | "comercial local" | "confianza" | "informacional" | "conversion";
  indexable: boolean;
  notes?: string;
};

export const seoIntentMap: SeoIntent[] = [
  {
    path: "/",
    primaryKeyword: "desarrollo de páginas web para empresas Santiago y Chile",
    intent: "comercial",
    indexable: true,
    notes: "Portada para la intención amplia con señal geográfica Santiago-primero; la marca queda como señal secundaria.",
  },
  {
    path: "/paginas-web-santiago",
    primaryKeyword: "páginas web Santiago",
    intent: "comercial local",
    indexable: true,
  },
  {
    path: "/desarrollo-web",
    primaryKeyword: "desarrollo web Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/paginas-web-para-pymes",
    primaryKeyword: "paginas web para pymes Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/diseno-web-empresas",
    primaryKeyword: "paginas web para empresas Chile",
    intent: "comercial",
    indexable: true,
    notes: "Incluye diseño web corporativo como variante secundaria, sin duplicar una nueva landing.",
  },
  {
    path: "/desarrollo-web-santiago",
    primaryKeyword: "desarrollo web Santiago",
    intent: "comercial local",
    indexable: true,
  },
  {
    path: "/servicios/seo-para-empresas-chile",
    primaryKeyword: "SEO para empresas Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/soporte-ti",
    primaryKeyword: "soporte TI para empresas Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/tiendas-online",
    primaryKeyword: "tiendas online para pymes Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/sistemas-web",
    primaryKeyword: "sistemas web a medida Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/automatizacion",
    primaryKeyword: "automatización de procesos Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/planes",
    primaryKeyword: "precio pagina web Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/casos-exito",
    primaryKeyword: "proyectos de desarrollo web",
    intent: "confianza",
    indexable: true,
  },
  {
    path: "/blog",
    primaryKeyword: "recursos de desarrollo web y SEO",
    intent: "informacional",
    indexable: true,
  },
  {
    path: "/quienes-somos",
    primaryKeyword: "empresa de desarrollo web Zyteron",
    intent: "confianza",
    indexable: true,
  },
  {
    path: "/contacto",
    primaryKeyword: "cotizar página web Chile",
    intent: "conversion",
    indexable: true,
  },
];

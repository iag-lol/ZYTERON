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
    primaryKeyword: "desarrollo web y soluciones digitales Chile",
    intent: "marca",
    indexable: true,
  },
  {
    path: "/desarrollo-web",
    primaryKeyword: "desarrollo web Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/servicios/paginas-web-para-empresas",
    primaryKeyword: "paginas web para empresas Chile",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/servicios/diseno-web-chile",
    primaryKeyword: "diseño web Chile",
    intent: "comercial",
    indexable: true,
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
    path: "/planes",
    primaryKeyword: "planes de paginas web Chile",
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
  {
    path: "/ciudades",
    primaryKeyword: "diseño web por ciudad Chile",
    intent: "comercial local",
    indexable: false,
    notes: "Noindex por riesgo de páginas locales generadas por plantilla sin contenido aprobado individual.",
  },
];

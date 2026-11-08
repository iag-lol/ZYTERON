export type SeoIntent = {
  path: string;
  primaryKeyword: string;
  intent: "marca" | "comercial" | "comercial local" | "confianza" | "informacional" | "conversion";
  indexable: boolean;
  notes?: string;
};

export const seoIntentMap: SeoIntent[] = [
  {
    path: "/servicios",
    primaryKeyword: "soluciones digitales para empresas",
    intent: "comercial",
    indexable: true,
    notes: "Índice de las cinco familias; enlaza a servicios específicos.",
  },
  {
    path: "/catalogos-digitales",
    primaryKeyword: "catálogos digitales para empresas",
    intent: "comercial",
    indexable: true,
    notes: "Presentación y consultas sin cobro online; se diferencia de ecommerce.",
  },
  {
    path: "/sistemas-web/gestion-personas",
    primaryKeyword: "software de gestión de personas y RRHH a medida",
    intent: "comercial",
    indexable: true,
    notes: "Desarrollo evaluado por proyecto, sin certificaciones o integraciones implícitas.",
  },
  {
    path: "/sistemas-web/control-flota",
    primaryKeyword: "software de control de flota",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/sistemas-web/intranet-corporativa",
    primaryKeyword: "intranets y portales internos",
    intent: "comercial",
    indexable: true,
  },
  {
    path: "/sistemas-web/gestion-documental",
    primaryKeyword: "gestión documental a medida",
    intent: "comercial",
    indexable: true,
  },

  {
    path: "/",
    primaryKeyword: "desarrollo de software y soluciones digitales a medida Chile",
    intent: "comercial",
    indexable: true,
    notes:
      "Portada amplia de la empresa; los destinos de desarrollo web conservan su intención especializada.",
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
    path: "/paginas-web-para-empresas",
    primaryKeyword: "paginas web para empresas Chile",
    intent: "comercial",
    indexable: true,
    notes:
      "Incluye diseño web corporativo como variante secundaria, sin duplicar una nueva landing.",
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
    primaryKeyword: "proyectos de software y desarrollo digital",
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
    primaryKeyword: "empresa de software Zyteron",
    intent: "confianza",
    indexable: true,
  },
  {
    path: "/contacto",
    primaryKeyword: "cotizar proyecto digital Chile",
    intent: "conversion",
    indexable: true,
  },
];

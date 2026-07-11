export interface Ubicacion {
  slug: string;
  nombre: string;
  tipo: "comuna_rm" | "ciudad_chile";
  region: string;
  codigoRegion: string;
  latitud: number;
  longitud: number;
  descripcionLocal?: string;
}

export const ubicaciones: Ubicacion[] = [
  {
    slug: "santiago",
    nombre: "Santiago",
    tipo: "ciudad_chile",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.4489,
    longitud: -70.6693,
    descripcionLocal:
      "Alta competencia en búsquedas B2B, servicios profesionales y empresas que necesitan una web clara para captar reuniones y cotizaciones.",
  },
  {
    slug: "providencia",
    nombre: "Providencia",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.4263,
    longitud: -70.6112,
    descripcionLocal:
      "Zona con alta densidad de oficinas, consultas profesionales y negocios que dependen de reputación digital y contacto rápido.",
  },
  {
    slug: "las-condes",
    nombre: "Las Condes",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.4080,
    longitud: -70.5676,
    descripcionLocal:
      "Mercado empresarial con fuerte demanda de imagen profesional, sitios corporativos y continuidad TI para operación diaria.",
  },
  {
    slug: "nunoa",
    nombre: "Ñuñoa",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.4569,
    longitud: -70.5979,
    descripcionLocal:
      "Comuna con mezcla de servicios, educación y pymes que suelen crecer desde recomendaciones y necesitan ordenar su presencia digital.",
  },
  {
    slug: "maipu",
    nombre: "Maipú",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.5126,
    longitud: -70.7650,
    descripcionLocal:
      "Actividad comercial y de servicios con foco en captación local, WhatsApp y sitios orientados a conversión rápida.",
  },
  {
    slug: "la-florida",
    nombre: "La Florida",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.5310,
    longitud: -70.5920,
    descripcionLocal:
      "Comuna con alto volumen residencial y comercial donde muchas pymes necesitan una web más clara para captar contactos y ordenar su operación digital.",
  },
  {
    slug: "puente-alto",
    nombre: "Puente Alto",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.6117,
    longitud: -70.5758,
    descripcionLocal:
      "Zona con fuerte actividad de servicios y comercio local, ideal para páginas orientadas a conversión, WhatsApp y presencia profesional.",
  },
  {
    slug: "san-miguel",
    nombre: "San Miguel",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.4964,
    longitud: -70.6511,
    descripcionLocal:
      "Comuna urbana con negocios de servicios, salud y comercio que se benefician de sitios mejor estructurados y soporte digital constante.",
  },
  {
    slug: "estacion-central",
    nombre: "Estación Central",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.4592,
    longitud: -70.6996,
    descripcionLocal:
      "Entorno comercial y logístico con necesidad de sitios rápidos, información clara y canales de contacto visibles para captar oportunidades.",
  },
  {
    slug: "quilicura",
    nombre: "Quilicura",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.3634,
    longitud: -70.7443,
    descripcionLocal:
      "Comuna con foco industrial, bodegaje y servicios operativos donde una web profesional ayuda a filtrar mejor consultas y reforzar confianza.",
  },
  {
    slug: "huechuraba",
    nombre: "Huechuraba",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.3662,
    longitud: -70.6780,
    descripcionLocal:
      "Sector empresarial y corporativo que suele requerir imagen digital seria, soporte web continuo y mejor presentación comercial.",
  },
  {
    slug: "vitacura",
    nombre: "Vitacura",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.3810,
    longitud: -70.5744,
    descripcionLocal:
      "Comuna con alta exigencia de imagen, reputación y experiencia digital para empresas, consultas profesionales y marcas de servicio.",
  },
  {
    slug: "lo-barnechea",
    nombre: "Lo Barnechea",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.3523,
    longitud: -70.5188,
    descripcionLocal:
      "Zona con servicios premium, inmobiliario y negocios que necesitan una presencia digital pulida y una ruta comercial bien definida.",
  },
  {
    slug: "la-reina",
    nombre: "La Reina",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.4428,
    longitud: -70.5538,
    descripcionLocal:
      "Comuna con profesionales independientes, servicios especializados y pymes que requieren orden digital y captación local más efectiva.",
  },
  {
    slug: "penalolen",
    nombre: "Peñalolén",
    tipo: "comuna_rm",
    region: "Región Metropolitana",
    codigoRegion: "RM",
    latitud: -33.4863,
    longitud: -70.5367,
    descripcionLocal:
      "Territorio mixto de servicios y comercio local donde una web clara puede mejorar reputación, contacto y seguimiento de oportunidades.",
  },
  {
    slug: "vina-del-mar",
    nombre: "Viña del Mar",
    tipo: "ciudad_chile",
    region: "Región de Valparaíso",
    codigoRegion: "V",
    latitud: -33.0245,
    longitud: -71.5518,
    descripcionLocal:
      "Demanda constante en turismo profesional, servicios médicos, inmobiliario y negocios que necesitan confianza online todo el año.",
  },
  {
    slug: "valparaiso",
    nombre: "Valparaíso",
    tipo: "ciudad_chile",
    region: "Región de Valparaíso",
    codigoRegion: "V",
    latitud: -33.0472,
    longitud: -71.6127,
    descripcionLocal:
      "Servicios técnicos, marítimos y educación con necesidad de mejor estructura digital para consultas y posicionamiento local.",
  },
  {
    slug: "concepcion",
    nombre: "Concepción",
    tipo: "ciudad_chile",
    region: "Región del Biobío",
    codigoRegion: "VIII",
    latitud: -36.8201,
    longitud: -73.0444,
    descripcionLocal:
      "Nodo industrial y de servicios B2B donde una arquitectura web clara puede filtrar mejor leads y reforzar autoridad comercial.",
  },
  {
    slug: "antofagasta",
    nombre: "Antofagasta",
    tipo: "ciudad_chile",
    region: "Región de Antofagasta",
    codigoRegion: "II",
    latitud: -23.6509,
    longitud: -70.3975,
    descripcionLocal:
      "Empresas proveedoras de minería y servicios técnicos suelen necesitar sitios más formales, sistemas de control y soporte remoto estable.",
  },
  {
    slug: "la-serena",
    nombre: "La Serena",
    tipo: "ciudad_chile",
    region: "Región de Coquimbo",
    codigoRegion: "IV",
    latitud: -29.9027,
    longitud: -71.2519,
    descripcionLocal:
      "Pymes regionales y servicios profesionales que requieren presencia digital ordenada para competir mejor en búsquedas locales.",
  },
  {
    slug: "coquimbo",
    nombre: "Coquimbo",
    tipo: "ciudad_chile",
    region: "Región de Coquimbo",
    codigoRegion: "IV",
    latitud: -29.9533,
    longitud: -71.3395,
    descripcionLocal:
      "Ciudad puerto con actividad de servicios, turismo y operaciones técnicas donde una estructura digital clara ayuda a captar consultas todo el año.",
  },
  {
    slug: "rancagua",
    nombre: "Rancagua",
    tipo: "ciudad_chile",
    region: "Región de O'Higgins",
    codigoRegion: "VI",
    latitud: -34.1708,
    longitud: -70.7444,
    descripcionLocal:
      "Empresas de servicios, comercio e industria que necesitan mejorar su visibilidad digital y ordenar mejor los canales de contacto.",
  },
  {
    slug: "talca",
    nombre: "Talca",
    tipo: "ciudad_chile",
    region: "Región del Maule",
    codigoRegion: "VII",
    latitud: -35.4264,
    longitud: -71.6554,
    descripcionLocal:
      "Centro regional con fuerte presencia de pymes y servicios profesionales que se benefician de una web comercial mejor estructurada.",
  },
  {
    slug: "chillan",
    nombre: "Chillán",
    tipo: "ciudad_chile",
    region: "Región de Ñuble",
    codigoRegion: "XVI",
    latitud: -36.6066,
    longitud: -72.1034,
    descripcionLocal:
      "Ciudad con comercio, salud y servicios locales donde una web profesional puede mejorar reputación y volumen de cotizaciones.",
  },
  {
    slug: "temuco",
    nombre: "Temuco",
    tipo: "ciudad_chile",
    region: "Región de La Araucanía",
    codigoRegion: "IX",
    latitud: -38.7359,
    longitud: -72.5904,
    descripcionLocal:
      "Servicios, comercio y empresas regionales que necesitan una base web sólida para captar consultas y centralizar información.",
  },
  {
    slug: "valdivia",
    nombre: "Valdivia",
    tipo: "ciudad_chile",
    region: "Región de Los Ríos",
    codigoRegion: "XIV",
    latitud: -39.8142,
    longitud: -73.2459,
    descripcionLocal:
      "Mercado regional con turismo, servicios y empresas técnicas que requieren una presencia digital confiable y bien presentada.",
  },
  {
    slug: "osorno",
    nombre: "Osorno",
    tipo: "ciudad_chile",
    region: "Región de Los Lagos",
    codigoRegion: "X",
    latitud: -40.5745,
    longitud: -73.1335,
    descripcionLocal:
      "Ciudad con actividad agroindustrial, comercio y servicios donde una web clara ayuda a centralizar información y captar nuevos clientes.",
  },
  {
    slug: "puerto-montt",
    nombre: "Puerto Montt",
    tipo: "ciudad_chile",
    region: "Región de Los Lagos",
    codigoRegion: "X",
    latitud: -41.4693,
    longitud: -72.9424,
    descripcionLocal:
      "Operaciones logísticas, servicios técnicos y empresas del sur con necesidad de continuidad TI y trazabilidad operativa.",
  },
  {
    slug: "iquique",
    nombre: "Iquique",
    tipo: "ciudad_chile",
    region: "Región de Tarapacá",
    codigoRegion: "I",
    latitud: -20.2307,
    longitud: -70.1357,
    descripcionLocal:
      "Ciudad portuaria y comercial donde muchas empresas necesitan una presencia digital más seria para ventas, servicios y soporte remoto.",
  },
  {
    slug: "arica",
    nombre: "Arica",
    tipo: "ciudad_chile",
    region: "Región de Arica y Parinacota",
    codigoRegion: "XV",
    latitud: -18.4783,
    longitud: -70.3126,
    descripcionLocal:
      "Mercado fronterizo y de servicios que puede beneficiarse de una web clara, rápida y orientada a contacto profesional.",
  },
  {
    slug: "calama",
    nombre: "Calama",
    tipo: "ciudad_chile",
    region: "Región de Antofagasta",
    codigoRegion: "II",
    latitud: -22.4561,
    longitud: -68.9237,
    descripcionLocal:
      "Servicios mineros, proveedores y soporte técnico requieren sitios formales, trazabilidad y mejor presentación comercial.",
  },
  {
    slug: "copiapo",
    nombre: "Copiapó",
    tipo: "ciudad_chile",
    region: "Región de Atacama",
    codigoRegion: "III",
    latitud: -27.3668,
    longitud: -70.3314,
    descripcionLocal:
      "Empresas y pymes de servicios regionales que necesitan mejorar visibilidad web y canales de captación comercial.",
  },
  {
    slug: "punta-arenas",
    nombre: "Punta Arenas",
    tipo: "ciudad_chile",
    region: "Región de Magallanes y de la Antártica Chilena",
    codigoRegion: "XII",
    latitud: -53.1638,
    longitud: -70.9171,
    descripcionLocal:
      "Operaciones del extremo sur con fuerte necesidad de soporte remoto, continuidad tecnológica y presencia digital confiable.",
  },
];

export function getUbicacionBySlug(slug: string) {
  return ubicaciones.find((ubicacion) => ubicacion.slug === slug);
}

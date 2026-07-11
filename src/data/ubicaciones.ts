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
];

export function getUbicacionBySlug(slug: string) {
  return ubicaciones.find((ubicacion) => ubicacion.slug === slug);
}

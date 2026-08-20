/**
 * Landings por rubro. Cada entrada debe tener problemas, funcionalidades y
 * escenarios propios del sector: si una vertical solo cambia el nombre del
 * rubro respecto de otra, no se publica.
 */

import { PLAN_PRICE_AMOUNTS, ADDON_PRICE_AMOUNTS } from "@/config/pricing";

/** Formatea un monto CLP con separador de miles chileno: 79990 → "$79.990". */
const clp = (amount: number) => `$${amount.toLocaleString("es-CL")}`;

export type VerticalFaq = {
  question: string;
  answer: string;
};

export type VerticalScenario = {
  title: string;
  description: string;
};

export type VerticalPage = {
  slug: string;
  path: string;
  navLabel: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  heroTitle: string;
  heroDescription: string;
  /** Problemas concretos y verificables del rubro. */
  painPoints: string[];
  /** Qué construimos específicamente para este sector. */
  capabilities: string[];
  /** Escenarios de uso demostrativos, identificados como ejemplos. */
  scenarios: VerticalScenario[];
  /** Secciones que suele necesitar la web de este rubro. */
  siteStructure: string[];
  faqs: VerticalFaq[];
  relatedService: { label: string; href: string };
  finalCtaTitle: string;
  finalCtaCopy: string;
};

export const verticalPages: VerticalPage[] = [
  {
    slug: "transporte-logistica",
    path: "/paginas-web/transporte-logistica",
    navLabel: "Transporte y logística",
    metaTitle: "Páginas Web para Empresas de Transporte y Logística | Zyteron",
    metaDescription:
      "Desarrollamos páginas web para empresas de transporte y logística en Chile: cotización de fletes, seguimiento de carga, cobertura por región y captación de clientes B2B.",
    primaryKeyword: "páginas web para empresas de transporte",
    heroTitle: "Páginas web para empresas de transporte y logística",
    heroDescription:
      "Sitios diseñados para que una empresa de transporte explique su cobertura, su flota y sus tiempos, y reciba solicitudes de cotización de carga sin depender solo del teléfono.",
    painPoints: [
      "Las solicitudes de flete llegan por teléfono y WhatsApp, sin quedar registradas en ninguna parte.",
      "El cliente pregunta siempre lo mismo: cobertura, tipo de carga, tiempos y si emiten factura.",
      "No hay forma de mostrar la flota, las certificaciones ni los seguros que respaldan el servicio.",
      "Las licitaciones B2B exigen una web formal que acredite que la empresa existe y opera.",
      "El equipo comercial pierde tiempo cotizando fletes que nunca iban a cerrarse.",
    ],
    capabilities: [
      "Formulario de solicitud de flete con origen, destino, tipo de carga, peso y fecha.",
      "Mapa o listado de cobertura por región y comuna para filtrar consultas fuera de zona.",
      "Ficha de flota con tipos de vehículo, capacidad y usos recomendados.",
      "Sección de certificaciones, seguros y cumplimiento normativo del transporte.",
      "Integración con WhatsApp para coordinación rápida de retiros urgentes.",
      "Base para conectar con un sistema de seguimiento de carga o control de flota.",
    ],
    scenarios: [
      {
        title: "Ejemplo: transporte de carga general en la Región Metropolitana",
        description:
          "Una empresa con 12 camiones recibe solicitudes por un formulario que pide origen, destino y tipo de carga. El formulario descarta automáticamente destinos fuera de cobertura y deriva el resto al equipo comercial con toda la información ya levantada.",
      },
      {
        title: "Ejemplo: logística de última milla para ecommerce",
        description:
          "Un operador que atiende tiendas online publica sus tarifas por zona y tiempos de entrega, y ofrece un formulario específico para tiendas que necesitan integración con su plataforma de ventas.",
      },
      {
        title: "Ejemplo: transporte especializado o refrigerado",
        description:
          "Una empresa de carga refrigerada muestra su equipamiento, rangos de temperatura y protocolos, porque su cliente necesita verificar capacidad técnica antes de cotizar.",
      },
    ],
    siteStructure: [
      "Portada con servicios de transporte y cobertura principal",
      "Página por tipo de servicio (carga general, refrigerada, última milla)",
      "Cobertura geográfica por región",
      "Flota y equipamiento",
      "Certificaciones y seguros",
      "Solicitud de cotización de flete",
      "Contacto con WhatsApp directo",
    ],
    faqs: [
      {
        question: "¿Pueden integrar un sistema de seguimiento de carga?",
        answer:
          "Sí. Podemos desarrollar un sistema de seguimiento a medida o conectar la web con el que ya uses. Lo habitual es partir con la web comercial y sumar el seguimiento en una segunda etapa, cuando el flujo de solicitudes ya está ordenado.",
      },
      {
        question: "¿El formulario puede calcular tarifas automáticamente?",
        answer:
          "Puede calcular estimaciones si nos entregas la tabla de tarifas por zona, peso o volumen. Si tus precios dependen de negociación caso a caso, es mejor un formulario que capture bien el requerimiento y derive al equipo comercial.",
      },
      {
        question: "¿Sirve para postular a licitaciones?",
        answer:
          "Una web formal con datos de la empresa, servicios, cobertura y certificaciones ayuda a acreditar seriedad. No reemplaza los documentos de la licitación, pero sí es lo primero que revisa un comprador cuando evalúa proveedores nuevos.",
      },
      {
        question: "¿Cuánto cuesta una página web para una empresa de transporte?",
        answer: `Un sitio para empresa de transporte cuesta típicamente entre ${clp(PLAN_PRICE_AMOUNTS.pyme)} y ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA, según cobertura, tipos de servicio y el formulario de solicitud de flete que necesites. Un formulario avanzado con origen, destino y tipo de carga suma desde ${clp(ADDON_PRICE_AMOUNTS.advancedForm)} + IVA. Puedes estimar tu caso en la calculadora de precio de página web y luego te entregamos cotización formal.`,
      },
    ],
    relatedService: { label: "Ver páginas web para empresas", href: "/paginas-web-para-empresas" },
    finalCtaTitle: "¿Tu empresa de transporte necesita recibir solicitudes ordenadas?",
    finalCtaCopy:
      "Cuéntanos qué tipo de carga mueves y qué cobertura tienes. Te proponemos una estructura de sitio que filtre consultas y te llegue el requerimiento completo.",
  },
  {
    slug: "constructoras",
    path: "/paginas-web/constructoras",
    navLabel: "Constructoras",
    metaTitle: "Páginas Web para Constructoras e Inmobiliarias | Zyteron",
    metaDescription:
      "Páginas web para constructoras en Chile: portafolio de obras, fichas de proyecto, galerías de avance y captación de clientes para obra nueva, remodelación y licitaciones.",
    primaryKeyword: "páginas web para constructoras",
    heroTitle: "Páginas web para constructoras que necesitan mostrar obra ejecutada",
    heroDescription:
      "En construcción, el portafolio es el argumento de venta. Construimos sitios donde cada obra tiene ficha propia, con fotos, metros cuadrados, plazo y tipo de proyecto.",
    painPoints: [
      "Las obras terminadas están en el teléfono de alguien, no en un portafolio ordenado y público.",
      "El mandante quiere ver trabajos similares al suyo antes de llamar, y no los encuentra.",
      "No hay forma de separar obra nueva, remodelación y obra pública, que son clientes distintos.",
      "Las consultas llegan sin información básica: superficie, ubicación, plazo ni presupuesto.",
      "La empresa compite con constructoras que sí tienen presencia digital formal.",
    ],
    capabilities: [
      "Portafolio de obras con ficha por proyecto: tipo, superficie, ubicación y plazo.",
      "Galerías de fotografías optimizadas para cargar rápido en terreno con señal débil.",
      "Separación por línea de negocio: obra nueva, remodelación, obra industrial o pública.",
      "Formulario de solicitud de presupuesto con superficie, tipo de obra y plazo estimado.",
      "Sección de equipo técnico, especialidades y experiencia acreditable.",
      "Panel administrable para que el equipo publique nuevas obras sin depender de nosotros.",
    ],
    scenarios: [
      {
        title: "Ejemplo: constructora de vivienda unifamiliar",
        description:
          "Publica cada casa construida con superficie, comuna, plazo de ejecución y galería. El potencial cliente filtra por tipo de proyecto y llega al formulario con una referencia concreta de lo que quiere.",
      },
      {
        title: "Ejemplo: empresa de remodelación comercial",
        description:
          "Muestra locales y oficinas remodeladas con fotos antes y después, y ofrece un formulario que pregunta metros cuadrados, uso del espacio y si el local seguirá operando durante la obra.",
      },
      {
        title: "Ejemplo: constructora que postula a obra pública",
        description:
          "Prioriza la acreditación: experiencia por tipo de mandante, capacidad técnica y obras de referencia, porque su cliente evalúa antecedentes antes que estética.",
      },
    ],
    siteStructure: [
      "Portada con líneas de negocio y obras destacadas",
      "Portafolio filtrable por tipo de obra",
      "Ficha individual por proyecto ejecutado",
      "Servicios por especialidad",
      "Equipo técnico y experiencia",
      "Solicitud de presupuesto",
      "Contacto y ubicación",
    ],
    faqs: [
      {
        question: "¿Podemos cargar nuevas obras nosotros mismos?",
        answer:
          "Sí. Implementamos un panel administrable donde tu equipo sube fotos, datos de la obra y la publica. Es el enfoque recomendado en construcción, porque el portafolio crece constantemente y no conviene depender de un proveedor para cada actualización.",
      },
      {
        question: "¿Cómo manejan las fotos de obra, que suelen ser muy pesadas?",
        answer:
          "Procesamos y optimizamos las imágenes automáticamente en formatos modernos, de modo que una galería con muchas fotos cargue rápido incluso desde el celular en terreno. Tú subes la foto original y el sitio se encarga del resto.",
      },
      {
        question: "¿Sirve para captar clientes o solo como portafolio?",
        answer:
          "Ambas cosas. El portafolio genera confianza, pero el sitio se estructura para que cada obra termine en un formulario de presupuesto. Sin esa ruta, una web de constructora se queda en catálogo y no genera contactos.",
      },
      {
        question: "¿Cuánto cuesta una página web para una constructora?",
        answer: `Un sitio para constructora cuesta típicamente entre ${clp(PLAN_PRICE_AMOUNTS.pyme)} y ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA según líneas de negocio y cantidad de obras a publicar. Si quieres que tu equipo cargue obras nuevas sin depender de nosotros, el portafolio administrable suma desde ${clp(ADDON_PRICE_AMOUNTS.manageableCatalog)} + IVA. Puedes estimar tu caso en la calculadora de precio de página web y luego te entregamos cotización formal.`,
      },
    ],
    relatedService: { label: "Ver páginas web para empresas", href: "/paginas-web-para-empresas" },
    finalCtaTitle: "¿Tu constructora necesita un portafolio que genere presupuestos?",
    finalCtaCopy:
      "Cuéntanos qué tipo de obras ejecutas y cuántas quieres publicar. Te proponemos una estructura de portafolio administrable con ruta clara hacia la solicitud de presupuesto.",
  },
  {
    slug: "servicios-profesionales",
    path: "/paginas-web/servicios-profesionales",
    navLabel: "Servicios profesionales",
    metaTitle: "Páginas Web para Estudios y Servicios Profesionales | Zyteron",
    metaDescription:
      "Páginas web para abogados, contadores, consultoras y estudios profesionales en Chile: áreas de práctica, perfil del equipo, agendamiento y captación de consultas calificadas.",
    primaryKeyword: "páginas web para servicios profesionales",
    heroTitle: "Páginas web para estudios y servicios profesionales",
    heroDescription:
      "En servicios profesionales la web vende credibilidad. Construimos sitios que explican áreas de práctica, muestran quién está detrás y filtran consultas antes de que lleguen a tu agenda.",
    painPoints: [
      "El cliente no distingue entre un estudio serio y uno improvisado si ambos tienen web genérica.",
      "Llegan consultas de materias que el estudio no atiende, y responderlas consume horas facturables.",
      "El equipo tiene credenciales sólidas, pero no están visibles en ninguna parte.",
      "No hay contenido que responda las dudas frecuentes, así que se explican una y otra vez.",
      "El agendamiento se hace por correo, con muchos mensajes de ida y vuelta.",
    ],
    capabilities: [
      "Páginas por área de práctica o especialidad, cada una con su propia ruta de contacto.",
      "Perfiles del equipo con formación, experiencia y áreas de especialización.",
      "Formulario de consulta que filtra por materia y descarta lo que no atienden.",
      "Agendamiento de reunión inicial conectado a tu calendario.",
      "Blog o sección de artículos para responder dudas frecuentes y posicionar por materia.",
      "Área privada de clientes para compartir documentos, cuando el servicio lo requiere.",
    ],
    scenarios: [
      {
        title: "Ejemplo: estudio jurídico con varias áreas",
        description:
          "Cada área —laboral, familia, corporativo— tiene su página con casos típicos y preguntas frecuentes. El formulario pregunta primero la materia, de modo que las consultas llegan clasificadas al abogado que corresponde.",
      },
      {
        title: "Ejemplo: estudio contable para pymes",
        description:
          "Publica sus planes por tamaño de empresa y volumen de documentos, y usa un formulario que pregunta giro, cantidad de trabajadores y si la contabilidad está al día, para cotizar sin reuniones previas.",
      },
      {
        title: "Ejemplo: consultora de recursos humanos",
        description:
          "Estructura el sitio por servicio —selección, capacitación, clima laboral— y ofrece agendamiento directo de una reunión de diagnóstico, que es su principal punto de entrada comercial.",
      },
    ],
    siteStructure: [
      "Portada con áreas de práctica y propuesta de valor",
      "Página por área de práctica o especialidad",
      "Equipo profesional con credenciales",
      "Metodología de trabajo y honorarios referenciales",
      "Artículos o preguntas frecuentes por materia",
      "Formulario de consulta filtrado",
      "Agendamiento de reunión inicial",
    ],
    faqs: [
      {
        question: "¿Se puede agendar reuniones directamente desde la web?",
        answer:
          "Sí. Podemos conectar un agendamiento con tu calendario para que el cliente reserve una hora disponible sin intercambiar correos. Recomendamos filtrar antes por materia, para que la reunión llegue con contexto y no se use para descartar.",
      },
      {
        question: "¿Publicar contenido realmente trae clientes en este rubro?",
        answer:
          "Sí, y es de los rubros donde mejor funciona, porque la gente busca respuestas antes de contratar. Un artículo que responde bien una duda concreta atrae justamente al cliente que tiene ese problema. Requiere constancia: no es un resultado inmediato.",
      },
      {
        question: "¿Podemos tener un área privada para clientes?",
        answer: `Sí. Desarrollamos áreas privadas con acceso por usuario para compartir documentos, estados de avance o informes, desde ${clp(ADDON_PRICE_AMOUNTS.clientArea)} + IVA como desarrollo adicional al sitio público. El valor final depende del nivel de permisos y trazabilidad que necesites.`,
      },
      {
        question: "¿Cuánto cuesta una página web para un estudio o consultora?",
        answer: `Un sitio para estudio profesional cuesta típicamente entre ${clp(PLAN_PRICE_AMOUNTS.pyme)} y ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA, según cantidad de áreas de práctica y perfiles del equipo. El agendamiento de reuniones conectado a tu calendario suma desde ${clp(ADDON_PRICE_AMOUNTS.booking)} + IVA. Puedes estimar tu caso en la calculadora de precio de página web y luego te entregamos cotización formal.`,
      },
    ],
    relatedService: { label: "Ver páginas web para pymes", href: "/paginas-web-para-pymes" },
    finalCtaTitle: "¿Tu estudio necesita recibir consultas mejor filtradas?",
    finalCtaCopy:
      "Cuéntanos qué áreas atiendes y qué consultas te hacen perder tiempo. Te proponemos una estructura que filtre antes de llegar a tu agenda.",
  },
  {
    slug: "industria-b2b",
    path: "/paginas-web/industria-b2b",
    navLabel: "Industria y B2B",
    metaTitle: "Páginas Web para Empresas Industriales y B2B | Zyteron",
    metaDescription:
      "Páginas web para empresas industriales y proveedores B2B en Chile: catálogo técnico, fichas de producto con especificaciones, solicitud de cotización y soporte a licitaciones.",
    primaryKeyword: "páginas web para empresas industriales",
    heroTitle: "Páginas web para empresas industriales y proveedores B2B",
    heroDescription:
      "En B2B industrial la decisión es técnica y participan varias personas. Construimos sitios con especificaciones, fichas descargables y solicitud de cotización que el comprador puede llevar a su comité.",
    painPoints: [
      "El comprador técnico necesita especificaciones exactas y las pide por correo una por una.",
      "El catálogo está en un PDF antiguo que nadie encuentra y que ya tiene precios vencidos.",
      "La empresa vende productos complejos, pero la web los describe en dos líneas.",
      "No hay diferencia entre lo que ve un comprador y lo que necesita un especificador técnico.",
      "Los competidores internacionales tienen fichas técnicas completas y ganan por comparación.",
    ],
    capabilities: [
      "Catálogo técnico con familias, categorías y filtros por especificación.",
      "Ficha de producto con dimensiones, materiales, normas y usos recomendados.",
      "Descarga de fichas técnicas y certificados en PDF, con registro opcional del contacto.",
      "Solicitud de cotización por producto o por lista de productos.",
      "Sección de aplicaciones por industria, para que el cliente se reconozca en un caso.",
      "Base para conectar el catálogo con tu ERP y mantener stock o precios sincronizados.",
    ],
    scenarios: [
      {
        title: "Ejemplo: proveedor de insumos industriales",
        description:
          "Publica su catálogo con filtros por medida, material y norma. El comprador arma una lista de productos y envía una solicitud de cotización completa, en lugar de escribir un correo pidiendo precios de a uno.",
      },
      {
        title: "Ejemplo: fabricante de equipamiento especializado",
        description:
          "Cada equipo tiene ficha con capacidad, consumo, dimensiones y ficha técnica descargable, porque el especificador necesita esos datos para incluirlo en un proyecto.",
      },
      {
        title: "Ejemplo: distribuidor con catálogo amplio y ERP",
        description:
          "Conecta la web con su ERP para mostrar disponibilidad actualizada, evitando cotizar productos que no tiene en stock.",
      },
    ],
    siteStructure: [
      "Portada con líneas de producto y sectores atendidos",
      "Catálogo con filtros técnicos",
      "Ficha individual por producto con especificaciones",
      "Descarga de fichas técnicas y certificados",
      "Aplicaciones por industria",
      "Solicitud de cotización por lista de productos",
      "Contacto comercial y técnico diferenciado",
    ],
    faqs: [
      {
        question: "¿Pueden conectar el catálogo web con nuestro ERP?",
        answer:
          "Sí, siempre que el ERP exponga una API o permita exportar datos de forma programada. La integración se cotiza según la documentación disponible y qué campos necesitas sincronizar: precios, stock, fichas o todo el catálogo.",
      },
      {
        question: "¿Conviene publicar precios en un catálogo industrial?",
        answer:
          "Depende de tu política comercial. Si trabajas con precios negociados por volumen, lo habitual es mostrar el catálogo sin precio y ofrecer solicitud de cotización. Si tus precios son de lista, publicarlos filtra consultas y ahorra tiempo comercial.",
      },
      {
        question: "¿Cuántos productos puede tener el catálogo?",
        answer:
          "No hay un límite técnico relevante. Lo que define el alcance es cómo se cargan y mantienen: una carga inicial acotada con administración manual es más económica, mientras que un catálogo grande conviene sincronizarlo desde tu sistema.",
      },
      {
        question: "¿Cuánto cuesta una página web para una empresa industrial?",
        answer: `Un sitio industrial B2B cuesta típicamente entre ${clp(PLAN_PRICE_AMOUNTS.pyme)} y ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA según líneas de producto y sectores. El catálogo técnico administrable suma desde ${clp(ADDON_PRICE_AMOUNTS.manageableCatalog)} + IVA y una integración con tu ERP desde ${clp(ADDON_PRICE_AMOUNTS.customApi)} + IVA, según la API disponible. Puedes estimar tu caso en la calculadora de precio de página web y luego te entregamos cotización formal.`,
      },
    ],
    relatedService: { label: "Ver tiendas online y catálogos", href: "/tiendas-online" },
    finalCtaTitle: "¿Tu empresa industrial necesita un catálogo técnico que cotice?",
    finalCtaCopy:
      "Cuéntanos cuántos productos manejas y qué especificaciones necesita tu cliente. Te proponemos una estructura de catálogo con solicitud de cotización incorporada.",
  },
];

export function getVerticalPageBySlug(slug: string) {
  return verticalPages.find((page) => page.slug === slug);
}

import { PLAN_PRICE_AMOUNTS, MAINTENANCE_PRICE_AMOUNTS } from "@/config/pricing";

/** Formatea un monto CLP con separador de miles chileno: 79990 → "$79.990". */
const clp = (amount: number) => `$${amount.toLocaleString("es-CL")}`;

export type FaqCategory = {
  title: string;
  items: {
    question: string;
    answer: string;
  }[];
};

export const faqCategories: FaqCategory[] = [
  {
    title: "Cotización, precios y tiempos",
    items: [
      {
        question: "¿Cuánto cuesta una página web profesional?",
        answer: `En Chile una página web profesional cuesta desde ${clp(PLAN_PRICE_AMOUNTS["web-basica"])} + IVA (web básica de presentación); un sitio para pyme parte desde ${clp(PLAN_PRICE_AMOUNTS.pyme)}, uno corporativo desde ${clp(PLAN_PRICE_AMOUNTS.empresa)}, un catálogo por WhatsApp desde ${clp(PLAN_PRICE_AMOUNTS.catalogo)}, una tienda online con carrito y pagos desde ${clp(PLAN_PRICE_AMOUNTS.ecommerce)} y un sistema web a medida desde ${clp(PLAN_PRICE_AMOUNTS.sistema)} + IVA. El valor final depende de secciones, contenido, integraciones y nivel de personalización; en Zyteron entregamos cotización formal por escrito antes de iniciar.`,
      },
      {
        question: "¿Cuánto demora desarrollar una web?",
        answer:
          "Una landing simple puede tomar 1 a 2 semanas. Un sitio corporativo completo suele tomar entre 3 y 6 semanas según contenido, revisiones e integraciones.",
      },
      {
        question: "¿Qué necesito para comenzar?",
        answer:
          "Objetivo del proyecto, información base del negocio, servicios principales, referencias visuales si existen y una conversación inicial para definir alcance real.",
      },
      {
        question: "¿Puedo pagar por etapas?",
        answer:
          "Sí. Según el tipo de proyecto, podemos definir pago inicial y pagos por avance, hitos o entrega final.",
      },
    ],
  },
  {
    title: "Desarrollo web, ecommerce y sistemas",
    items: [
      {
        question: "¿Trabajan con pymes y emprendedores?",
        answer:
          "Sí. Trabajamos con emprendedores, pymes y empresas, ajustando la solución al presupuesto, urgencia y etapa real del negocio.",
      },
      {
        question: "¿Puedo administrar mi sitio web?",
        answer:
          "Sí. Podemos implementar panel administrativo o una estructura editable si el proyecto lo requiere y se incluye en el alcance.",
      },
      {
        question: "¿Crean tiendas online?",
        answer: `Sí. Creamos tiendas online, catálogos digitales y flujos de venta o cotización por WhatsApp según el modelo comercial del negocio. Un catálogo con venta por WhatsApp parte desde ${clp(PLAN_PRICE_AMOUNTS.catalogo)} + IVA y un ecommerce con carrito y pagos online desde ${clp(PLAN_PRICE_AMOUNTS.ecommerce)} + IVA.`,
      },
      {
        question: "¿Desarrollan sistemas internos para empresas?",
        answer: `Sí. Desarrollamos sistemas web, paneles administrativos, cotizadores, reportes, generación de PDF, registros internos y soluciones a medida por etapas. Un sistema web administrativo parte desde ${clp(PLAN_PRICE_AMOUNTS.sistema)} + IVA y se puede iniciar con un módulo acotado para escalar después. Si tu organización necesita ir más lejos, seguimos con intranet corporativa desde ${clp(PLAN_PRICE_AMOUNTS.intranet)} + IVA, plataforma de control operacional desde ${clp(PLAN_PRICE_AMOUNTS.operacional)} + IVA y plataformas corporativas integradas desde ${clp(PLAN_PRICE_AMOUNTS.corporativa)} + IVA.`,
      },
      {
        question: "¿La web queda adaptada a celular?",
        answer:
          "Sí. Todo proyecto web se trabaja responsive para celular, tablet y escritorio, cuidando legibilidad, velocidad y facilidad de contacto.",
      },
    ],
  },
  {
    title: "SEO, integraciones y soporte",
    items: [
      {
        question: "¿Incluyen SEO?",
        answer:
          "Incluimos una base SEO técnica y on-page: title, meta description, canonical, encabezados, sitemap, robots, Open Graph, schema cuando corresponde y estructura de enlaces internos.",
      },
      {
        question: "¿Pueden integrar WhatsApp o formularios?",
        answer:
          "Sí. Podemos integrar WhatsApp, formularios, correos, notificaciones y flujos de contacto según el objetivo del proyecto.",
      },
      {
        question: "¿Realizan mantención después de entregar el proyecto?",
        answer: `Sí. Ofrecemos mantención mensual desde ${clp(MAINTENANCE_PRICE_AMOUNTS.basic)} + IVA para webs básicas, desde ${clp(MAINTENANCE_PRICE_AMOUNTS.professional)} para sitios profesionales, desde ${clp(MAINTENANCE_PRICE_AMOUNTS.ecommerce)} para ecommerce y desde ${clp(MAINTENANCE_PRICE_AMOUNTS.system)} + IVA para sistemas o IA, además de soporte post-entrega y mejoras evolutivas según necesidad.`,
      },
      {
        question: "¿Trabajan con empresas fuera de Santiago?",
        answer:
          "Sí. Tenemos base en Santiago y atendemos empresas, pymes y emprendedores de distintas regiones de Chile mediante trabajo remoto y seguimiento por etapas.",
      },
      {
        question: "¿Emiten factura o boleta?",
        answer:
          "Cuando corresponde y según condiciones acordadas, podemos emitir el documento tributario aplicable.",
      },
    ],
  },
];

export const flatFaqItems = faqCategories.flatMap((category) => category.items);

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
        answer:
          "Depende del alcance, cantidad de secciones, contenido, diseño, integraciones, soporte y nivel de SEO requerido. En Zyteron publicamos valores referenciales y entregamos cotización formal antes de iniciar.",
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
        answer:
          "Sí. Creamos tiendas online, catálogos digitales y flujos de venta o cotización por WhatsApp según el modelo comercial del negocio.",
      },
      {
        question: "¿Desarrollan sistemas internos para empresas?",
        answer:
          "Sí. Desarrollamos sistemas web, paneles administrativos, cotizadores, reportes, generación de PDF, registros internos y soluciones a medida por etapas.",
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
        answer:
          "Sí. Podemos definir soporte post-entrega, mantención mensual, mejoras evolutivas o asistencia técnica según necesidad.",
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

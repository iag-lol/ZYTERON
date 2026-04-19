export type FaqCategory = {
  title: string;
  items: {
    question: string;
    answer: string;
  }[];
};

export const faqCategories: FaqCategory[] = [
  {
    title: "Páginas web para empresas",
    items: [
      {
        question: "¿Qué diferencia una página corporativa de una landing page?",
        answer:
          "La página corporativa cubre posicionamiento integral de marca y servicios. La landing se enfoca en una sola oferta o campaña para maximizar conversión.",
      },
      {
        question: "¿Cuántas páginas debería tener un sitio B2B?",
        answer:
          "Como base: home, hub de servicios, páginas de servicio individual, nosotros, contacto y una sección de soporte comercial como FAQ o casos.",
      },
      {
        question: "¿Puedo partir con una versión inicial y escalar después?",
        answer:
          "Sí. Lo importante es que la arquitectura técnica y semántica quede preparada para crecer sin rehacer estructura ni perder indexación.",
      },
    ],
  },
  {
    title: "SEO y posicionamiento en Chile",
    items: [
      {
        question: "¿Cuándo se empiezan a ver resultados en SEO?",
        answer:
          "Depende de la competencia y del estado inicial del sitio. Normalmente las primeras señales aparecen entre 8 y 16 semanas.",
      },
      {
        question: "¿Qué priorizan primero: técnica, contenido o backlinks?",
        answer:
          "Primero técnica e indexación, luego páginas transaccionales y contenido útil. Después se trabaja autoridad externa.",
      },
      {
        question: "¿Cómo evitan canibalización entre servicios parecidos?",
        answer:
          "Definiendo una keyword primaria por URL, intención clara por página y enlazado interno con anchors diferenciados.",
      },
    ],
  },
  {
    title: "Cotización, tiempos y soporte",
    items: [
      {
        question: "¿Trabajan con empresas fuera de Santiago?",
        answer:
          "Sí. Operamos remoto en todo Chile y coordinamos reuniones presenciales cuando el proyecto lo requiere.",
      },
      {
        question: "¿Qué incluye la mantención web mensual?",
        answer:
          "Monitoreo, actualizaciones, correcciones técnicas, seguridad, mejoras de performance y soporte operativo continuo.",
      },
      {
        question: "¿Puedo pedir una propuesta sin compromiso?",
        answer:
          "Sí. Puedes contactarnos por formulario o WhatsApp y recibir una propuesta inicial según tus objetivos.",
      },
    ],
  },
];

export const flatFaqItems = faqCategories.flatMap((category) => category.items);

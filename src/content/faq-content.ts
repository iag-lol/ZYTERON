export type FaqCategory = {
  title: string;
  items: {
    question: string;
    answer: string;
  }[];
};

export const faqCategories: FaqCategory[] = [
  {
    title: "Cotización y tiempos",
    items: [
      {
        question: "¿Cuánto demora una página web?",
        answer:
          "Depende del alcance. Una landing puede tomar 1 a 2 semanas y un sitio corporativo completo entre 3 y 6 semanas.",
      },
      {
        question: "¿Puedo pagar por etapas?",
        answer:
          "Sí. Podemos definir pagos por hitos según avance y entregables del proyecto.",
      },
      {
        question: "¿Qué necesito para comenzar?",
        answer:
          "Objetivo del proyecto, información base del negocio y alcance inicial para preparar una cotización formal.",
      },
      {
        question: "¿Emiten factura o boleta?",
        answer:
          "Cuando corresponde y según condiciones acordadas, podemos emitir el documento tributario aplicable.",
      },
    ],
  },
  {
    title: "Desarrollo web y sistemas",
    items: [
      {
        question: "¿Incluye dominio y hosting?",
        answer:
          "Puede incluirse según plan. Queda detallado en la cotización formal para evitar ambigüedades.",
      },
      {
        question: "¿Puedo administrar mi web?",
        answer:
          "Sí. Podemos desarrollar un panel administrativo para gestionar contenido, productos, reservas u otros módulos.",
      },
      {
        question: "¿Hacen tiendas online?",
        answer:
          "Sí. Desarrollamos tiendas online con estructura comercial, gestión de catálogo y flujo de compra.",
      },
      {
        question: "¿Integran pagos?",
        answer:
          "Sí. La integración de pagos se evalúa según la necesidad y el alcance técnico de cada proyecto.",
      },
      {
        question: "¿Hacen sistemas personalizados?",
        answer:
          "Sí. Diseñamos sistemas internos y soluciones a medida por etapas, con alcance definido.",
      },
    ],
  },
  {
    title: "Soporte y continuidad",
    items: [
      {
        question: "¿Entregan soporte después?",
        answer:
          "Sí. Cada proyecto considera soporte post-entrega según el alcance contratado y opciones de continuidad.",
      },
      {
        question: "¿Atienden solo Santiago?",
        answer:
          "Operamos con base en Santiago y atendemos empresas, pymes y emprendedores en todo Chile.",
      },
      {
        question: "¿Pueden trabajar con empresas y pymes al mismo tiempo?",
        answer:
          "Sí. Adaptamos el nivel de solución y presupuesto a la etapa real de cada negocio.",
      },
    ],
  },
];

export const flatFaqItems = faqCategories.flatMap((category) => category.items);

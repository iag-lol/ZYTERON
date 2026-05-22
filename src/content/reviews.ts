export type ReviewSnapshot = {
  id: string;
  name: string;
  company: string;
  role: string;
  service: string;
  rating: number;
  comment: string;
  createdAt: string;
  source: "placeholder" | "client";
};

export const placeholderReviews: ReviewSnapshot[] = [
  {
    id: "placeholder-review-1",
    name: "María González",
    company: "Comercial Andina SpA",
    role: "Gerenta de Operaciones",
    service: "Desarrollo web corporativo",
    rating: 5,
    comment:
      "Zyteron nos ayudó a ordenar la información comercial y dejar una web más clara para clientes que cotizan servicios B2B. El proceso fue metódico y con entregables bien definidos.",
    createdAt: "2026-05-10",
    source: "placeholder",
  },
  {
    id: "placeholder-review-2",
    name: "Rodrigo Pérez",
    company: "Servicios Integrales RM",
    role: "Administrador",
    service: "Sistema web a medida",
    rating: 5,
    comment:
      "Pasamos de planillas dispersas a un panel interno con registros y estados. Lo más valioso fue partir por una primera etapa realista sin sobredimensionar el proyecto.",
    createdAt: "2026-05-08",
    source: "placeholder",
  },
  {
    id: "placeholder-review-3",
    name: "Camila Torres",
    company: "Tienda Local Chile",
    role: "Fundadora",
    service: "Tienda online",
    rating: 5,
    comment:
      "Necesitábamos profesionalizar el catálogo y derivar mejor las consultas por WhatsApp. La tienda quedó simple de navegar y preparada para crecer por etapas.",
    createdAt: "2026-05-04",
    source: "placeholder",
  },
  {
    id: "placeholder-review-4",
    name: "Felipe Rojas",
    company: "Constructora Norte Sur",
    role: "Jefe de Administración",
    service: "Automatización de procesos",
    rating: 4,
    comment:
      "Automatizamos solicitudes que antes se revisaban manualmente. Ahora el equipo recibe información más ordenada y puede priorizar respuestas con menos fricción.",
    createdAt: "2026-04-29",
    source: "placeholder",
  },
  {
    id: "placeholder-review-5",
    name: "Valentina Muñoz",
    company: "Clínica Dental Providencia",
    role: "Coordinadora General",
    service: "Soporte TI y mantención web",
    rating: 5,
    comment:
      "El soporte fue claro y práctico. Nos ayudaron a estabilizar la web, revisar correos y dejar recomendaciones concretas para evitar problemas recurrentes.",
    createdAt: "2026-04-22",
    source: "placeholder",
  },
];

export function getReviewAggregate(reviews = placeholderReviews) {
  const validReviews = reviews.filter((review) => Number.isFinite(review.rating) && review.rating > 0);
  const reviewCount = validReviews.length;
  const ratingValue =
    reviewCount === 0
      ? 0
      : Number(
          (validReviews.reduce((total, review) => total + review.rating, 0) / reviewCount).toFixed(1),
        );

  return {
    ratingValue,
    reviewCount,
  };
}

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
    name: "María Fernanda",
    company: "Comercial Referencial SpA",
    role: "Administradora",
    service: "Página web para negocio",
    rating: 5,
    comment:
      "Necesitaba una página para mi negocio y me ayudaron desde el principio hasta el final. Me explicaron todo con paciencia y quedó mucho mejor de lo que esperaba.",
    createdAt: "2026-05-10",
    source: "placeholder",
  },
  {
    id: "placeholder-review-2",
    name: "Rodrigo Pérez",
    company: "Servicios Modelo SpA",
    role: "Dueño",
    service: "Sitio web corporativo",
    rating: 5,
    comment:
      "Tenía muchas dudas antes de hacer mi página web y siempre estuvieron pendientes. Muy buena atención, super recomendado para quienes están empezando.",
    createdAt: "2026-05-08",
    source: "placeholder",
  },
  {
    id: "placeholder-review-3",
    name: "Camila Torres",
    company: "Tienda Ejemplo SpA",
    role: "Fundadora",
    service: "Catálogo web",
    rating: 5,
    comment:
      "Quería mostrar mis productos de forma más ordenada y supieron muy bien cómo ayudarme. La comunicación fue clara y me acompañaron en cada cambio.",
    createdAt: "2026-05-04",
    source: "placeholder",
  },
  {
    id: "placeholder-review-4",
    name: "Felipe Rojas",
    company: "Constructora Demo SpA",
    role: "Encargado comercial",
    service: "Página web empresarial",
    rating: 5,
    comment:
      "Me ayudaron mucho con las dudas que tenía. Pedí una página para mi empresa y se preocuparon de que todo quedara bien antes de entregarla.",
    createdAt: "2026-04-29",
    source: "placeholder",
  },
  {
    id: "placeholder-review-5",
    name: "Valentina Muñoz",
    company: "Centro Familiar Referencial SA",
    role: "Coordinadora",
    service: "Soporte y ajustes web",
    rating: 5,
    comment:
      "Muy buena atención. Teníamos problemas para ordenar la información de la web y nos guiaron con calma. Se nota la preocupación por el cliente.",
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

import {
  getClientReviews,
  getPublicExtras,
  getPublicPlans,
  getPublicProducts,
  getProductPublicMetaMap,
  getWebDiscounts,
  type ClientReview,
  type ExtraRecord,
  type PlanRecord,
  type ProductRecord,
  type WebDiscount,
} from "@/lib/admin/repository";
import type { PublicDiscount, PublicExtra, PublicPlan, PublicProduct, PublicReview } from "@/lib/web-control-types";

const FALLBACK_PYME_PLANS: PublicPlan[] = [
  {
    id: "plan-pyme-basico-canonical",
    slug: "pyme-basico",
    name: "PYME Básico",
    description: "Catálogo simple para mostrar productos fijos con derivación directa a WhatsApp.",
    price: 69990,
    popular: false,
    tier: "BASIC",
    features: [
      "Página de visualización de productos fijos",
      "Botón a WhatsApp por producto o CTA general",
      "Secciones héroe, catálogo y contacto",
      "SSL, performance base y diseño responsive",
      "Precio cerrado, sin extras obligatorios",
    ],
    freeGifts: ["Asesoría de arranque 1h"],
  },
  {
    id: "plan-pyme-medio-canonical",
    slug: "pyme-medio",
    name: "PYME Medio",
    description: "Incluye dominio y hosting gestionado el primer año para que solo te enfoques en vender.",
    price: 139980,
    popular: false,
    tier: "INTERMEDIATE",
    features: [
      "Dominio .cl o .com incluido 1 año",
      "Hosting gestionado + SSL 1 año",
      "Catálogo PYME Básico + formulario de leads",
      "Analítica y eventos de conversión configurados",
      "Precio cerrado, sin extras obligatorios",
    ],
    freeGifts: ["Soporte prioritario 30 días"],
  },
  {
    id: "plan-pyme-avanzado-canonical",
    slug: "pyme-avanzado",
    name: "PYME Avanzado",
    description: "Suite completa con panel administrativo para gestionar productos, descuentos y métricas.",
    price: 209970,
    popular: true,
    tier: "PRO",
    features: [
      "Dominio + hosting 1 año incluidos",
      "Panel admin: alta, baja y edición de productos",
      "Gestión de precios, stock y descuentos",
      "Dashboard con resumen de ventas e informes",
      "Sección de reseñas y moderación",
      "Catálogo responsive para PC y móviles",
      "Precio cerrado, sin extras obligatorios",
    ],
    freeGifts: ["Capacitación 1 sesión", "Soporte 60 días"],
  },
];

const FALLBACK_EXTRAS: PublicExtra[] = [
  { id: "extra-dominio-cl", slug: "dominio-cl-1-anio", name: "Dominio .cl — 1 año", category: "DOMAIN", description: "Registro anual de dominio nacional.", price: 29000 },
  { id: "extra-dominio-com", slug: "dominio-com-1-anio", name: "Dominio .com — 1 año", category: "DOMAIN", description: "Registro anual de dominio internacional.", price: 35000 },
  { id: "extra-hosting-12m", slug: "hosting-extra-12m", name: "Hosting extra (12 meses)", category: "DOMAIN", description: "Hosting adicional anual para proyectos con mayor demanda.", price: 89000 },
  { id: "extra-ssl-premium", slug: "ssl-wildcard-premium", name: "SSL wildcard premium", category: "DOMAIN", description: "Certificado wildcard para subdominios.", price: 59000 },
  { id: "extra-1-correo", slug: "correo-1-anio", name: "1 correo corporativo — 1 año", category: "EMAIL", description: "Cuenta corporativa con dominio propio.", price: 29000 },
  { id: "extra-5-correos", slug: "pack-5-correos", name: "Pack 5 correos — 1 año", category: "EMAIL", description: "Cinco cuentas de correo empresarial.", price: 119000 },
  { id: "extra-10-correos", slug: "pack-10-correos", name: "Pack 10 correos — 1 año", category: "EMAIL", description: "Diez cuentas de correo empresarial.", price: 199000 },
  { id: "extra-seo-basico", slug: "seo-basico-on-page", name: "SEO básico on-page", category: "SEO", description: "Optimización técnica esencial.", price: 99000 },
  { id: "extra-seo-intermedio", slug: "seo-intermedio-schema", name: "SEO intermedio + schema", category: "SEO", description: "Optimización intermedia con esquema estructurado.", price: 199000 },
  { id: "extra-seo-avanzado", slug: "seo-avanzado-contenido", name: "SEO avanzado + contenido", category: "SEO", description: "Plan de crecimiento con contenidos.", price: 349000 },
  { id: "extra-seo-local", slug: "seo-local-ciudad", name: "SEO local (por ciudad)", category: "SEO", description: "Optimización geolocalizada para ciudades objetivo.", price: 149000 },
  { id: "extra-soporte-1m", slug: "soporte-remoto-1m", name: "Soporte remoto — 1 mes", category: "SUPPORT", description: "Mesa de ayuda remota mensual.", price: 59000 },
  { id: "extra-soporte-3m", slug: "soporte-remoto-3m", name: "Soporte remoto — 3 meses", category: "SUPPORT", description: "Mesa de ayuda remota trimestral.", price: 149000 },
  { id: "extra-visita", slug: "visita-tecnica", name: "Visita técnica presencial", category: "SUPPORT", description: "Soporte técnico en terreno.", price: 89000 },
  { id: "extra-mantencion", slug: "mantencion-web", name: "Mantención web mensual", category: "SUPPORT", description: "Mantención y actualizaciones mensuales.", price: 79000 },
  { id: "extra-blog", slug: "blog-integrado", name: "Blog integrado", category: "TECH", description: "Módulo de blog administrable.", price: 149000 },
  { id: "extra-panel-cliente", slug: "panel-cliente", name: "Panel de cliente", category: "TECH", description: "Portal de gestión para clientes finales.", price: 249000 },
  { id: "extra-panel-admin", slug: "panel-admin", name: "Panel de administrador", category: "TECH", description: "Panel administrativo para gestión interna.", price: 299000 },
  { id: "extra-reservas", slug: "modulo-reservas", name: "Módulo de reservas online", category: "TECH", description: "Sistema de agenda y reservas.", price: 199000 },
  { id: "extra-tienda", slug: "tienda-online", name: "Tienda online básica", category: "DESIGN", description: "Catálogo y carrito de compra inicial.", price: 299000 },
  { id: "extra-webpay", slug: "pasarela-webpay-plus", name: "Pasarela Webpay Plus", category: "DESIGN", description: "Integración de pago con Webpay.", price: 199000 },
  { id: "extra-catalogo", slug: "catalogo-productos", name: "Catálogo de productos", category: "DESIGN", description: "Módulo de catálogo administrable.", price: 149000 },
  { id: "extra-notebook", slug: "notebook-oficina-pro", name: "Notebook Oficina Pro", category: "EQUIPMENT", description: "Equipo portátil empresarial.", price: 520000 },
  { id: "extra-pc", slug: "pc-escritorio-empresa", name: "PC Escritorio Empresa", category: "EQUIPMENT", description: "Equipo de escritorio para oficina.", price: 680000 },
  { id: "extra-perifericos", slug: "pack-perifericos", name: "Pack periféricos oficina", category: "EQUIPMENT", description: "Pack teclado, mouse y accesorios.", price: 149000 },
  { id: "extra-cap-2h", slug: "capacitacion-2h", name: "Capacitación inicial (2h)", category: "TRAINING", description: "Inducción al uso de plataforma.", price: 79000 },
  { id: "extra-cap-4h", slug: "capacitacion-4h", name: "Capacitación avanzada (4h)", category: "TRAINING", description: "Formación avanzada para operación.", price: 149000 },
  { id: "extra-manual", slug: "manual-personalizado", name: "Manual de uso personalizado", category: "TRAINING", description: "Documento operativo adaptado a tu negocio.", price: 59000 },
];

const FALLBACK_PRODUCTS: PublicProduct[] = [
  {
    id: "product-notebook-oficina",
    slug: "notebook-oficina-pro",
    name: "Notebook Oficina Pro",
    description: "Equipo ligero, 16GB RAM, SSD 512GB, ideal para productividad.",
    price: 520000,
    discountPct: 5,
    featured: true,
    stock: 20,
    badges: ["Entrega 48h", "Garantía 1 año"],
  },
  {
    id: "product-pc-escritorio",
    slug: "pc-escritorio-empresa",
    name: "PC Escritorio Empresa",
    description: "Desktop confiable, 32GB RAM, SSD 1TB, para oficinas exigentes.",
    price: 680000,
    discountPct: 8,
    featured: false,
    stock: 20,
    badges: ["Configuración incluida"],
  },
  {
    id: "product-combo-pyme",
    slug: "combo-pyme-digital",
    name: "Combo Pyme Digital",
    description: "Landing + dominio + 3 correos + soporte remoto por 1 mes.",
    price: 690000,
    discountPct: 10,
    featured: true,
    stock: 15,
    badges: ["Más vendido"],
  },
  {
    id: "product-combo-pro",
    slug: "combo-empresa-pro",
    name: "Combo Empresa Pro",
    description: "Sitio corporativo + dominio + 5 correos + SEO intermedio + 1 visita.",
    price: 1290000,
    discountPct: 12,
    featured: true,
    stock: 10,
    badges: ["Incluye visita"],
  },
];

function normalizePlan(plan: PlanRecord): PublicPlan | null {
  const price = typeof plan.price === "number" && Number.isFinite(plan.price) ? plan.price : null;
  if (!price || price <= 0) return null;
  const tier = String(plan.tier || "").toUpperCase();
  const normalizedTier = tier === "BASIC" || tier === "INTERMEDIATE" || tier === "PRO" ? tier : "BASIC";

  return {
    id: plan.id,
    slug: plan.slug || plan.id,
    name: plan.name || "Plan",
    description: plan.description || "Plan comercial",
    price,
    popular: Boolean(plan.popular),
    tier: normalizedTier,
    features: Array.isArray(plan.features) ? plan.features.filter(Boolean) : [],
    freeGifts: Array.isArray(plan.freeGifts) ? plan.freeGifts.filter(Boolean) : [],
  };
}

function normalizeExtra(extra: ExtraRecord): PublicExtra | null {
  const price = typeof extra.price === "number" && Number.isFinite(extra.price) ? extra.price : null;
  if (!price || price <= 0) return null;
  return {
    id: extra.id,
    slug: extra.slug || extra.id,
    name: extra.name || "Extra",
    category: String(extra.category || "TECH").toUpperCase(),
    description: extra.description || "Servicio adicional",
    price,
  };
}

function normalizeProduct(product: ProductRecord): PublicProduct | null {
  const price = typeof product.price === "number" && Number.isFinite(product.price) ? product.price : null;
  if (!price || price <= 0) return null;
  return {
    id: product.id,
    slug: product.slug || product.id,
    name: product.name || "Producto",
    description: product.description || "Producto empresarial",
    price,
    discountPct:
      typeof product.discountPct === "number" && Number.isFinite(product.discountPct)
        ? Math.max(0, Math.round(product.discountPct))
        : 0,
    featured: Boolean(product.featured),
    stock: typeof product.stock === "number" && Number.isFinite(product.stock) ? Math.max(0, Math.round(product.stock)) : 0,
    badges: Array.isArray(product.badges) ? product.badges.filter(Boolean) : [],
  };
}

function normalizeReview(review: ClientReview): PublicReview | null {
  const rating = typeof review.rating === "number" ? Math.max(1, Math.min(5, Math.round(review.rating))) : null;
  if (!rating) return null;
  if (!review.comment?.trim()) return null;
  return {
    id: review.id,
    name: review.name,
    company: review.company,
    rating,
    comment: review.comment.trim(),
    service: review.service,
    createdAt: review.createdAt,
  };
}

function normalizeDiscount(discount: WebDiscount): PublicDiscount | null {
  const value = typeof discount.value === "number" && Number.isFinite(discount.value) ? discount.value : null;
  if (!value || value <= 0) return null;
  const targetType = String(discount.targetType || "ORDER").toUpperCase();
  const mode = String(discount.mode || "PERCENT").toUpperCase();
  if (!["PLAN", "EXTRA", "PRODUCT", "ORDER"].includes(targetType)) return null;
  if (!["PERCENT", "FIXED"].includes(mode)) return null;

  return {
    id: discount.id,
    name: discount.name,
    description: discount.description,
    value,
    targetType: targetType as PublicDiscount["targetType"],
    targetId: discount.targetId,
    mode: mode as PublicDiscount["mode"],
    minSubtotal: discount.minSubtotal,
    active: discount.active,
    startsAt: discount.startsAt,
    endsAt: discount.endsAt,
  };
}

export async function getWebPricingSnapshot() {
  const [plansRaw, extrasRaw, productsRaw, discountsRaw, reviewsRaw, productPublicMeta] = await Promise.all([
    getPublicPlans(),
    getPublicExtras(),
    getPublicProducts(),
    getWebDiscounts(true),
    getClientReviews("APPROVED"),
    getProductPublicMetaMap(),
  ]);

  const plans = plansRaw.map(normalizePlan).filter((item): item is PublicPlan => Boolean(item));
  const extras = extrasRaw.map(normalizeExtra).filter((item): item is PublicExtra => Boolean(item));
  const products = productsRaw
    .map(normalizeProduct)
    .filter((item): item is PublicProduct => Boolean(item))
    .map((product) => {
      const meta = productPublicMeta[String(product.slug || "").toLowerCase()];
      return {
        ...product,
        imageUrl: meta?.imageUrl || null,
        publicDescription: meta?.publicDescription || null,
        published: typeof meta?.published === "boolean" ? meta.published : true,
      };
    });
  const discounts = discountsRaw.map(normalizeDiscount).filter((item): item is PublicDiscount => Boolean(item));
  const reviews = reviewsRaw.map(normalizeReview).filter((item): item is PublicReview => Boolean(item));

  return {
    plans: plans.length > 0 ? plans : FALLBACK_PYME_PLANS,
    extras: extras.length > 0 ? extras : FALLBACK_EXTRAS,
    products: products.length > 0 ? products : FALLBACK_PRODUCTS,
    discounts,
    reviews,
  };
}

export async function getApprovedReviewsSnapshot() {
  const reviewsRaw = await getClientReviews("APPROVED");
  return reviewsRaw.map(normalizeReview).filter((item): item is PublicReview => Boolean(item));
}

export const WEB_CONTROL_FALLBACK = {
  plans: FALLBACK_PYME_PLANS,
  extras: FALLBACK_EXTRAS,
  products: FALLBACK_PRODUCTS,
};

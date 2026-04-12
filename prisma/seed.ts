import { PrismaClient, PlanTier, ExtraCategory, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("AdminZyteron!2026", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@zyteron.com" },
    update: {},
    create: {
      email: "admin@zyteron.com",
      name: "Administrador Zyteron",
      role: Role.ADMIN,
      passwordHash: adminPassword,
      company: "Zyteron",
    },
  });

  const serviceCategories = await prisma.$transaction([
    prisma.serviceCategory.upsert({
      where: { slug: "desarrollo-web" },
      update: {},
      create: { slug: "desarrollo-web", name: "Desarrollo web", order: 1 },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "seo" },
      update: {},
      create: { slug: "seo", name: "SEO", order: 2 },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "dominios-correos" },
      update: {},
      create: { slug: "dominios-correos", name: "Dominios y correos", order: 3 },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "soporte" },
      update: {},
      create: { slug: "soporte", name: "Soporte y mantención", order: 4 },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "equipos" },
      update: {},
      create: { slug: "equipos", name: "Equipos y hardware", order: 5 },
    }),
  ]);

  const servicios = [
    {
      slug: "landing-pages",
      name: "Landing pages que convierten",
      description:
        "Diseño y desarrollo de landing pages enfocadas en conversión, velocidad y SEO.",
      shortCopy: "Landing page optimizada para captar leads en días, no semanas.",
      features: [
        "Estructura AIDA + SEO on-page",
        "Formularios con validación + tracking",
        "Velocidad optimizada y Core Web Vitals",
        "Copywriting persuasivo enfocado a negocio",
      ],
      priceFrom: 350000,
      category: "desarrollo-web",
    },
    {
      slug: "sitios-corporativos",
      name: "Sitios web corporativos",
      description: "Web institucional premium, escalable y mantenible con panel administrativo.",
      shortCopy: "Sitio corporativo sólido para credibilidad y generación de demanda.",
      features: [
        "Arquitectura SEO limpia",
        "Panel de administración para contenidos clave",
        "Seguridad y roles",
        "Integración con analytics y CRM",
      ],
      priceFrom: 650000,
      category: "desarrollo-web",
    },
    {
      slug: "ecommerce-empresarial",
      name: "Ecommerce empresarial",
      description: "Tiendas online robustas con catálogo, medios de pago y performance alto.",
      shortCopy: "Ecommerce listo para vender con SEO técnico y velocidad.",
      features: [
        "Checkout seguro",
        "Pasarelas de pago y facturación",
        "Optimización para Core Web Vitals",
        "Integración con inventario y despachos",
      ],
      priceFrom: 900000,
      category: "desarrollo-web",
    },
    {
      slug: "seo-basico",
      name: "SEO Básico",
      description: "Fundamentos técnicos y de contenido para empezar a posicionar.",
      shortCopy: "Setup SEO base + quick wins locales.",
      features: [
        "Research de palabras clave inicial",
        "On-page técnico y metadatos",
        "Optimización de velocidad",
        "Reporte inicial y KPIs",
      ],
      priceFrom: 180000,
      category: "seo",
    },
    {
      slug: "seo-intermedio",
      name: "SEO Intermedio",
      description:
        "Plan de crecimiento con contenidos, enlazado interno y optimización continua.",
      shortCopy: "SEO mensual con foco en negocio y rankings.",
      features: [
        "Contenido optimizado mensual",
        "Linking interno y esquema de clusters",
        "Seguimiento de rankings y leads",
        "Soporte técnico continuo",
      ],
      priceFrom: 320000,
      category: "seo",
    },
    {
      slug: "seo-avanzado",
      name: "SEO Avanzado",
      description: "Cobertura completa con estrategia, contenidos, enlaces y performance.",
      shortCopy: "SEO enterprise para dominar SERPs locales.",
      features: [
        "Estrategia de palabras clave por vertical",
        "Optimización técnica profunda",
        "Producción de contenidos y FAQs",
        "Dashboard de métricas y reportes ejecutivos",
      ],
      priceFrom: 520000,
      category: "seo",
    },
    {
      slug: "dominio-anual",
      name: "Dominio anual",
      description: "Gestión de dominio corporativo por 12 meses con DNS seguro.",
      shortCopy: "Incluye configuración DNS y protección básica.",
      features: ["Registro y renovación", "Configuración DNS segura", "Soporte básico"],
      priceFrom: 25000,
      category: "dominios-correos",
    },
    {
      slug: "correos-corporativos",
      name: "Correos corporativos",
      description: "Cuentas de correo profesionales con seguridad y soporte.",
      shortCopy: "Correos empresariales listos para tu dominio.",
      features: ["Cuentas IMAP/Exchange", "Soporte y configuración", "Backups y seguridad"],
      priceFrom: 3000,
      category: "dominios-correos",
    },
    {
      slug: "soporte-remoto",
      name: "Soporte remoto",
      description: "Mesa de ayuda técnica para incidencias y mejoras.",
      shortCopy: "Respuesta rápida, monitoreo y asistencia.",
      features: ["Ticketing y SLA", "Monitoreo", "Atención remota", "Reportes mensuales"],
      priceFrom: 60000,
      category: "soporte",
    },
    {
      slug: "soporte-presencial",
      name: "Soporte presencial",
      description: "Visitas técnicas programadas para soporte en terreno.",
      shortCopy: "Ingenieros en tu oficina cuando lo necesitas.",
      features: ["Visitas técnicas", "Hardware y redes", "Checklist preventivo", "Reportes"],
      priceFrom: 90000,
      category: "soporte",
    },
    {
      slug: "mantencion",
      name: "Mantención web",
      description: "Actualizaciones, seguridad y mejoras continuas.",
      shortCopy: "Mantén tu web segura y rápida.",
      features: ["Parches y updates", "Backups", "Optimización continua"],
      priceFrom: 80000,
      category: "soporte",
    },
    {
      slug: "equipos-notebooks",
      name: "Notebooks empresariales",
      description: "Equipos listos para oficina con soporte y garantía.",
      shortCopy: "Equipos configurados para productividad.",
      features: ["Modelos balanceados", "Entrega rápida", "Soporte y garantía"],
      priceFrom: 450000,
      category: "equipos",
    },
    {
      slug: "equipos-pc",
      name: "PC de escritorio empresa",
      description: "Escritorios confiables para cargas de trabajo empresariales.",
      shortCopy: "Rendimiento estable y soporte.",
      features: ["Configuraciones por rol", "Soporte en sitio", "Garantía extendida"],
      priceFrom: 380000,
      category: "equipos",
    },
    {
      slug: "capacitacion",
      name: "Capacitaciones",
      description: "Formación para equipos en herramientas digitales y operación.",
      shortCopy: "Capacitaciones a medida para tu equipo.",
      features: ["Sesiones en vivo", "Guías prácticas", "Seguimiento"],
      priceFrom: 120000,
      category: "soporte",
    },
  ];

  for (const service of servicios) {
    const category = serviceCategories.find((c) => c.slug === service.category);
    if (!category) continue;
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: {
        slug: service.slug,
        name: service.name,
        description: service.description,
        shortCopy: service.shortCopy,
        features: service.features,
        priceFrom: service.priceFrom,
        categoryId: category.id,
      },
    });
  }

  const productCategories = await prisma.$transaction([
    prisma.productCategory.upsert({
      where: { slug: "notebooks" },
      update: {},
      create: { slug: "notebooks", name: "Notebooks", order: 1 },
    }),
    prisma.productCategory.upsert({
      where: { slug: "pc-escritorio" },
      update: {},
      create: { slug: "pc-escritorio", name: "PC de escritorio", order: 2 },
    }),
    prisma.productCategory.upsert({
      where: { slug: "packs" },
      update: {},
      create: { slug: "packs", name: "Combos y packs", order: 3 },
    }),
  ]);

  const products = [
    {
      slug: "notebook-oficina",
      name: "Notebook Oficina Pro",
      description: "Equipo ligero, 16GB RAM, SSD 512GB, ideal para productividad.",
      price: 520000,
      discountPct: 5,
      featured: true,
      category: "notebooks",
      badges: ["Entrega 48h", "Garantía 1 año"],
    },
    {
      slug: "pc-escritorio-empresa",
      name: "PC Escritorio Empresa",
      description: "Desktop confiable, 32GB RAM, SSD 1TB, para oficinas exigentes.",
      price: 680000,
      discountPct: 8,
      featured: false,
      category: "pc-escritorio",
      badges: ["Configuración incluida"],
    },
    {
      slug: "combo-pyme-digital",
      name: "Combo Pyme Digital",
      description: "Landing + dominio + 3 correos + soporte remoto por 1 mes.",
      price: 690000,
      discountPct: 10,
      featured: true,
      category: "packs",
      badges: ["Más vendido"],
    },
    {
      slug: "combo-empresa-pro",
      name: "Combo Empresa Pro",
      description:
        "Sitio corporativo + dominio + 5 correos + SEO intermedio + 1 visita.",
      price: 1290000,
      discountPct: 12,
      featured: true,
      category: "packs",
      badges: ["Incluye visita"],
    },
  ];

  for (const product of products) {
    const category = productCategories.find((c) => c.slug === product.category);
    if (!category) continue;
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        price: product.price,
        discountPct: product.discountPct,
        featured: product.featured,
        categoryId: category.id,
        badges: product.badges,
        stock: 20,
      },
    });
  }

  const plans = [
    {
      slug: "basico",
      name: "Plan Básico",
      description: "Para quienes comienzan y necesitan presencia rápida.",
      price: 390000,
      tier: PlanTier.BASIC,
      freeGifts: ["1 mes de atención básica"],
      features: [
        "Landing page 1 sección extendida",
        "Formulario + WhatsApp",
        "Responsive y performance base",
        "Hosting y SSL incluidos 3 meses",
      ],
      popular: false,
    },
    {
      slug: "intermedio",
      name: "Plan Intermedio",
      description: "Para pymes en crecimiento que necesitan mayor estructura comercial.",
      price: 790000,
      tier: PlanTier.INTERMEDIATE,
      freeGifts: ["1 mes de atención incluida"],
      features: [
        "Sitio 5 secciones",
        "Formularios avanzados y analítica",
        "Optimización SEO intermedia",
        "Integración con CRM / email",
      ],
      popular: true,
    },
    {
      slug: "pro",
      name: "Plan Pro",
      description: "Para empresas que buscan presencia premium y escalabilidad.",
      price: 1490000,
      tier: PlanTier.PRO,
      freeGifts: [
        "Dominio gratis 1 año",
        "1 correo corporativo gratis 1 año",
        "1 mes de atención gratis",
        "Capacitación inicial",
      ],
      features: [
        "Sitio corporativo completo + blog",
        "SEO avanzado y schema",
        "Panel cliente + panel admin base",
        "Performance y seguridad avanzada",
      ],
      popular: false,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: plan,
    });
  }

  const extras = [
    {
      slug: "dominio",
      name: "Dominio",
      category: ExtraCategory.DOMAIN,
      description: "Registro y gestión de dominio por 1 año.",
      options: [".cl", ".com", ".net"],
      price: 25000,
    },
    {
      slug: "correos",
      name: "Correos corporativos",
      category: ExtraCategory.EMAIL,
      description: "Cuentas de correo seguras por cantidad.",
      options: ["1", "3", "5", "10", "Personalizado"],
      price: 3000,
    },
    {
      slug: "soporte-remoto-extra",
      name: "Soporte remoto",
      category: ExtraCategory.SUPPORT,
      description: "Atención remota mensual.",
      options: ["Mensual", "Urgencia", "Bolsas de horas"],
      price: 60000,
    },
    {
      slug: "soporte-presencial-extra",
      name: "Soporte presencial",
      category: ExtraCategory.SUPPORT,
      description: "Visitas técnicas programadas.",
      options: ["1 visita", "2 visitas", "3+ visitas"],
      price: 90000,
    },
    {
      slug: "equipos-notebook",
      name: "Notebooks",
      category: ExtraCategory.EQUIPMENT,
      description: "Equipos según cantidad.",
      options: ["1", "2", "3+"],
      price: 450000,
    },
    {
      slug: "equipos-pc",
      name: "PC escritorio",
      category: ExtraCategory.EQUIPMENT,
      description: "PC de escritorio para oficina.",
      options: ["1", "2", "3+"],
      price: 380000,
    },
    {
      slug: "seo-basico-extra",
      name: "SEO básico",
      category: ExtraCategory.SEO,
      description: "Optimización esencial.",
      options: ["Setup", "Mensual"],
      price: 180000,
    },
    {
      slug: "seo-intermedio-extra",
      name: "SEO intermedio",
      category: ExtraCategory.SEO,
      description: "Plan de crecimiento.",
      options: ["Mensual"],
      price: 320000,
    },
    {
      slug: "seo-avanzado-extra",
      name: "SEO avanzado",
      category: ExtraCategory.SEO,
      description: "Cobertura completa.",
      options: ["Mensual"],
      price: 520000,
    },
    {
      slug: "panel-cliente",
      name: "Panel de cliente",
      category: ExtraCategory.TECH,
      description: "Portal para clientes con tickets y servicios.",
      options: ["Incluido Pro", "Addon"],
      price: 0,
    },
    {
      slug: "panel-admin",
      name: "Panel administrativo",
      category: ExtraCategory.TECH,
      description: "Panel interno para gestión total.",
      options: ["Incluido Pro", "Addon"],
      price: 0,
    },
    {
      slug: "capacitacion-basica",
      name: "Capacitación básica",
      category: ExtraCategory.TRAINING,
      description: "Sesión de inducción.",
      options: ["1 sesión"],
      price: 0,
    },
    {
      slug: "capacitacion-administrativa",
      name: "Capacitación administrativa",
      category: ExtraCategory.TRAINING,
      description: "Gestión del sitio y contenidos.",
      options: ["1 sesión"],
      price: 0,
    },
  ];

  for (const extra of extras) {
    await prisma.extra.upsert({
      where: { slug: extra.slug },
      update: {},
      create: extra,
    });
  }

  console.log({ admin });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

/** Tarifas netas de implementación de módulos con alcance definido. */
export const EXTENDED_ADDON_PRICING = {
  domainSetup: {
    name: "Dominio adicional y subdominios",
    category: "Dominios y correo",
    amount: 49990,
  },
  domainMigration: {
    name: "Traslado y puesta en marcha de dominio",
    category: "Dominios y correo",
    amount: 99990,
  },
  hostingSetup: {
    name: "Ambiente de pruebas y despliegue",
    category: "Dominios y correo",
    amount: 129990,
  },
  emailSetup5: {
    name: "Correo corporativo · hasta 5 cuentas",
    category: "Dominios y correo",
    amount: 99990,
  },
  emailSetup15: {
    name: "Correo corporativo · hasta 15 cuentas",
    category: "Dominios y correo",
    amount: 199990,
  },
  emailMigration: {
    name: "Migración de hasta 5 buzones",
    category: "Dominios y correo",
    amount: 249990,
  },
  transactionalEmail: {
    name: "Correos automáticos del sitio",
    category: "Contacto y comunicación",
    amount: 179990,
  },
  newsletterSetup: {
    name: "Boletín y suscripción por correo",
    category: "Contacto y comunicación",
    amount: 149990,
  },
  whatsappTemplateSetup: {
    name: "Avisos con plantillas de WhatsApp",
    category: "Contacto y comunicación",
    amount: 349990,
  },
  faqChatbot: {
    name: "Chat de preguntas frecuentes",
    category: "Contacto y comunicación",
    amount: 199990,
  },
  calendarEmbed: {
    name: "Calendario público integrado",
    category: "Calendarios y reservas",
    amount: 79990,
  },
  calendarSync: {
    name: "Sincronización con Google u Outlook",
    category: "Calendarios y reservas",
    amount: 299990,
  },
  eventRegistration: {
    name: "Inscripción a eventos",
    category: "Calendarios y reservas",
    amount: 299990,
  },
  databaseBasic: {
    name: "Base de datos básica",
    category: "Bases de datos y archivos",
    amount: 299990,
  },
  databaseMedium: {
    name: "Base de datos intermedia",
    category: "Bases de datos y archivos",
    amount: 599990,
  },
  databaseAdvanced: {
    name: "Base de datos avanzada",
    category: "Bases de datos y archivos",
    amount: 1190000,
  },
  dataImport: {
    name: "Migración inicial de datos",
    category: "Bases de datos y archivos",
    amount: 249990,
  },
  csvImport: {
    name: "Importador de planillas CSV",
    category: "Bases de datos y archivos",
    amount: 249990,
  },
  backupSetup: {
    name: "Configuración y prueba de respaldos",
    category: "Bases de datos y archivos",
    amount: 199990,
  },
  fileUploads: {
    name: "Carga privada de archivos",
    category: "Bases de datos y archivos",
    amount: 299990,
  },
  googleSheets: { name: "Conexión con Google Sheets", category: "Integraciones", amount: 199990 },
  mapsLocations: {
    name: "Mapa de sucursales y ubicaciones",
    category: "Integraciones",
    amount: 149990,
  },
  videoMeetings: {
    name: "Enlaces de videoreuniones automáticos",
    category: "Integraciones",
    amount: 199990,
  },
  productVariants: {
    name: "Variantes de productos",
    category: "Tienda y productos",
    amount: 249990,
  },
  wishList: { name: "Lista de favoritos", category: "Tienda y productos", amount: 149990 },
  productReviews: {
    name: "Reseñas de productos moderadas",
    category: "Tienda y productos",
    amount: 199990,
  },
  volumePricing: { name: "Precios por cantidad", category: "Tienda y productos", amount: 249990 },
  digitalDownloads: {
    name: "Entrega de productos digitales",
    category: "Tienda y productos",
    amount: 349990,
  },
  quoteCalculator: {
    name: "Cotizador con reglas y precios",
    category: "Gestión y automatización",
    amount: 499990,
  },
  serviceRequests: {
    name: "Solicitudes y seguimiento de servicios",
    category: "Gestión y automatización",
    amount: 449990,
  },
  ticketDesk: {
    name: "Mesa de ayuda y tickets",
    category: "Gestión y automatización",
    amount: 649990,
  },
  jobBoard: {
    name: "Ofertas de empleo y postulaciones",
    category: "Gestión y automatización",
    amount: 349990,
  },
  surveyBuilder: {
    name: "Encuestas y resultados",
    category: "Gestión y automatización",
    amount: 249990,
  },
  emailSequences: {
    name: "Secuencia automática de correos",
    category: "Gestión y automatización",
    amount: 299990,
  },
  leadScoring: {
    name: "Calificación y asignación de contactos",
    category: "Gestión y automatización",
    amount: 249990,
  },
  faqAccordion: {
    name: "Preguntas frecuentes administrables",
    category: "Contenido y diseño",
    amount: 99990,
  },
  testimonials: {
    name: "Testimonios administrables",
    category: "Contenido y diseño",
    amount: 99990,
  },
  portfolio: { name: "Portafolio de proyectos", category: "Contenido y diseño", amount: 199990 },
  contentEditor: {
    name: "Editor de contenido de páginas",
    category: "Contenido y diseño",
    amount: 349990,
  },
  cookieConsent: {
    name: "Preferencias y consentimiento de cookies",
    category: "Seguridad y acceso",
    amount: 149990,
  },
  twoFactor: {
    name: "Segundo factor de autenticación",
    category: "Seguridad y acceso",
    amount: 299990,
  },
  securityHardening: {
    name: "Revisión y refuerzo de seguridad web",
    category: "Seguridad y acceso",
    amount: 299990,
  },
  accessibilityReview: {
    name: "Revisión de accesibilidad web",
    category: "Contenido y diseño",
    amount: 249990,
  },
  lookerDashboard: {
    name: "Informe conectado en Looker Studio",
    category: "Reportes y documentos",
    amount: 299990,
  },
} as const;

export const EXTENDED_ADDON_AMOUNTS = Object.fromEntries(
  Object.entries(EXTENDED_ADDON_PRICING).map(([id, item]) => [id, item.amount]),
) as { [K in keyof typeof EXTENDED_ADDON_PRICING]: (typeof EXTENDED_ADDON_PRICING)[K]["amount"] };

import type { ServicePageData } from "./service-pages";

export const customerAiService: ServicePageData = {
  slug: "asistentes-ia-para-webs",
  navLabel: "Asistentes IA para sitios web",
  metaTitle: "Asistentes IA para sitios web de empresas en Chile",
  metaDescription:
    "Integra un asistente IA en tu web para responder consultas, orientar sobre productos, recibir solicitudes y derivarlas a tu equipo. Alcance y costos por proyecto.",
  primaryKeyword: "asistentes IA para sitios web",
  secondaryKeywords: [
    "asistente virtual para página web",
    "chat de atención con inteligencia artificial",
    "captación y calificación de consultas comerciales",
  ],
  heroTitle: "Un asistente IA en tu web para orientar consultas y conectarlas con tu equipo",
  heroDescription:
    "Tus visitantes pueden consultar servicios, encontrar productos o explicar lo que necesitan desde el mismo sitio. Configuramos un asistente con información aprobada de tu empresa, preguntas pertinentes y una salida clara hacia atención humana.",
  summary:
    "Servicio de integración de asistentes con inteligencia artificial en sitios web existentes o nuevos. Puede incluir preguntas frecuentes, orientación de catálogo, captura de consultas, calificación comercial o solicitudes de cita, según el alcance. No sustituye una cotización aprobada, la confirmación de disponibilidad ni el criterio de tu equipo.",
  problem:
    "Una página puede recibir visitas y aun así dejar consultas sin resolver: el cliente no encuentra el producto adecuado, repite preguntas frecuentes o abandona antes de explicar su necesidad. Añadir un chat sin información fiable ni responsables para continuar la atención puede aumentar ese desorden.",
  solution:
    "Definimos qué puede responder el asistente, qué debe preguntar y cuándo necesita derivar. Conectamos el flujo con las fuentes y canales acordados para que una consulta pertinente llegue al equipo con contexto. El resultado se evalúa por solicitudes válidas recibidas y calidad de la atención, además del uso del chat.",
  idealFor: [
    "Empresas de servicios que reciben preguntas repetidas antes de cotizar.",
    "Negocios con catálogos que necesitan orientar por uso, categoría o características publicadas.",
    "Equipos comerciales que requieren conocer servicio solicitado, ubicación o alcance antes de responder.",
    "Organizaciones que quieren recibir solicitudes de cita o derivarlas a un canal de atención existente.",
  ],
  deliverables: [
    "Mapa de consultas, preguntas y criterios comerciales acordados, con límites de respuesta y rutas de derivación a personas.",
    "Interfaz de chat integrada en la web, adaptable a celulares y con acceso visible al contacto humano.",
    "Base de respuestas y fuentes aprobadas: servicios, preguntas frecuentes o catálogo, con responsables para mantener su información.",
    "Captura y clasificación de solicitudes según datos y reglas definidos, con validaciones y permisos de acceso mínimos.",
    "Conexiones incluidas en la propuesta con CRM, correo, catálogo o agenda, sujetas a sus API, permisos y disponibilidad.",
    "Pruebas con casos representativos, criterios de aceptación, medición de solicitudes recibidas y guía de operación para el equipo.",
  ],
  process: [
    "Revisamos el objetivo de atención, la web actual, las consultas frecuentes y los canales que recibirán la derivación.",
    "Acordamos las fuentes autorizadas, los datos necesarios, su destino y conservación, las acciones permitidas y sus responsables.",
    "Diseñamos ejemplos de conversación para preguntas frecuentes, catálogo, captura comercial o citas, diferenciando orientación de confirmación.",
    "Integramos el asistente y las conexiones acordadas con accesos limitados al flujo necesario.",
    "Probamos consultas ambiguas, falta de información, errores de proveedores, datos incompletos y derivación; el equipo revisa y aprueba el comportamiento antes de publicar.",
    "Publicamos y revisamos el período de estabilización acordado, midiendo consultas válidas, derivaciones, incidencias y costos de uso para ajustar el servicio.",
  ],
  scopeNotes: [
    "La propuesta confirma funciones, fuentes, integraciones, pruebas, soporte y precio. No todas las capacidades están incluidas en una misma implementación.",
    "El consumo del proveedor de IA, mensajería, hosting, licencias y otros servicios externos se informa y cobra por separado según el proyecto.",
    "El asistente puede cometer errores. La información de precios, stock, citas y condiciones debe provenir de fuentes autorizadas; si no puede verificarse, se deriva la consulta.",
    "Se solicitan únicamente los datos necesarios para la finalidad acordada. Los accesos, avisos de privacidad y reglas de conservación se revisan antes de la publicación.",
    "Las confirmaciones de citas, condiciones, pagos y propuestas siguen las reglas y aprobaciones de la empresa. La recepción de una consulta no equivale a aceptar un compromiso comercial.",
    "La integración no garantiza ventas ni reemplaza la atención del equipo. Se definen horarios, responsables y canales para continuar las consultas.",
  ],
  faqs: [
    {
      question: "¿Qué datos pide el asistente y dónde se guardan?",
      answer:
        "Se define según la finalidad: por ejemplo, servicio de interés y un medio de contacto para responder. La propuesta identifica los sistemas que reciben esos datos, los permisos y las reglas de conservación. Se evitan datos sensibles que no sean necesarios y se revisan los avisos que verá el visitante antes de publicarlo.",
    },
    {
      question: "¿Puede entregar una respuesta incorrecta o inventar un precio?",
      answer:
        "Puede equivocarse. Por eso se limita a información aprobada, se prueban casos ambiguos y se establece qué hacer cuando faltan datos. No debe inventar precios, stock ni compromisos. Si una respuesta no puede verificarse o sale de su alcance, debe reconocer la limitación y ofrecer contacto con el equipo.",
    },
    {
      question: "¿Qué costos tiene además de la implementación?",
      answer:
        "La implementación se cotiza según funciones e integraciones. El consumo del proveedor de IA, hosting, licencias, mensajería y otros servicios externos se consideran por separado. Antes de contratar se define cómo se medirá el uso y qué soporte o ajustes posteriores incluye la propuesta.",
    },
    {
      question: "¿Cuándo pasa la conversación a una persona?",
      answer:
        "Se acuerdan rutas para solicitudes expresas de atención humana, información no disponible, errores, reclamos o temas fuera de alcance. La derivación puede crear una solicitud o abrir el canal indicado con el contexto necesario. El tiempo de respuesta posterior depende del horario y de la operación del equipo responsable.",
    },
    {
      question: "¿Puede confirmar citas, aprobar una cotización o cerrar una venta solo?",
      answer:
        "Recibir una solicitud no equivale a confirmarla. Una cita solo puede confirmarse si existe una integración autorizada y una regla de disponibilidad acordada. Los precios finales, condiciones, pagos y aprobaciones comerciales siguen el proceso definido por la empresa.",
    },
    {
      question: "¿Se puede incorporar a mi web actual y conectarlo con mi CRM?",
      answer:
        "Primero se revisan la tecnología del sitio, el acceso disponible y la documentación de los proveedores. Si el CRM, catálogo o agenda ofrece una API compatible y los permisos necesarios, se define la conexión en la propuesta. Si no existe una integración viable, puede evaluarse una recepción de solicitudes por un canal disponible, sin prometer sincronización automática.",
    },
  ],
  relatedSlugs: ["landing-pages-para-empresas", "mantencion-web-chile"],
  relatedLinks: [
    { label: "Automatización e integraciones con CRM", href: "/automatizacion" },
    { label: "Automatización de WhatsApp para empresas", href: "/automatizacion-whatsapp-empresas" },
    { label: "Catálogos digitales para presentar productos", href: "/catalogos-digitales" },
  ],
};

export const solutionFamilies = [
  {
    id: "software",
    name: "Software y sistemas empresariales",
    shortName: "Software empresarial",
    path: "/sistemas-web",
    description:
      "Plataformas y herramientas que reúnen información, usuarios y procesos en un sistema diseñado para tu empresa.",
    examples: "Gestión de clientes, inventario, documentos y portales.",
    groups: [
      {
        title: "Información y gestión",
        text: "Sistemas web, plataformas completas y paneles administrativos u operacionales. Gestión de clientes, proveedores, solicitudes, productos, inventario y movimientos.",
      },
      {
        title: "Acceso y colaboración",
        text: "Intranets, gestión documental y portales para clientes, proveedores y colaboradores, con usuarios, roles, permisos y flujos de aprobación.",
      },
      {
        title: "Control y evolución",
        text: "Reportes, indicadores, tableros y exportación de información o documentos. Integraciones con herramientas existentes, evaluadas según sus accesos y compatibilidad.",
      },
    ],
    scope:
      "El alcance se define por procesos, módulos, datos, perfiles de usuario e integraciones. Podemos desarrollar una plataforma completa o comenzar por una primera etapa.",
    links: [
      { label: "Sistemas a medida", href: "/sistemas-web" },
      { label: "Intranets y portales", href: "/sistemas-web/intranet-corporativa" },
      { label: "Gestión documental", href: "/sistemas-web/gestion-documental" },
    ],
  },
  {
    id: "personas-operaciones",
    name: "Gestión de personas, flotas y operaciones",
    shortName: "Personas y operaciones",
    path: "/servicios#personas-operaciones",
    description:
      "Soluciones para coordinar equipos, recursos humanos, vehículos y trabajo en terreno, con responsables y estados visibles.",
    examples: "Personal, solicitudes, despachos, mantenimiento y seguimiento.",
    groups: [
      {
        title: "Personas y recursos humanos",
        text: "Gestión de personal, solicitudes y documentación. Registros de asistencia, turnos y actividades según el proyecto, con acceso acorde a cada responsabilidad.",
      },
      {
        title: "Flota y terreno",
        text: "Control de vehículos y conductores, despachos, servicios y recorridos. Mantenimiento, incidencias y documentos de flota, con operación en terreno o por sucursal.",
      },
      {
        title: "Coordinación diaria",
        text: "Asignación de tareas, responsables y fechas; seguimiento de estados, evidencias, alertas y reportes para revisar lo pendiente y lo realizado.",
      },
    ],
    scope:
      "Son posibilidades de desarrollo a medida. Los equipos, instalación, conectividad y servicios externos se evalúan y cotizan por separado. Las integraciones y requisitos normativos se revisan antes de comprometer el alcance.",
    links: [
      { label: "Gestión de personas y RRHH", href: "/sistemas-web/gestion-personas" },
      { label: "Control de flota", href: "/sistemas-web/control-flota" },
      { label: "Evaluar una operación", href: "/contacto?tipo=operaciones&origen=soluciones" },
    ],
  },
  {
    id: "comercio-digital",
    name: "Ecommerce y catálogos digitales",
    shortName: "Ecommerce y catálogos",
    path: "/servicios#comercio-digital",
    description:
      "Desde mostrar productos o recibir consultas hasta vender con carrito y pagos, con un flujo adecuado a tu operación comercial.",
    examples: "Catálogos de presentación, pedidos por WhatsApp y tiendas online.",
    groups: [
      {
        title: "Catálogo de presentación",
        text: "Categorías, fichas, buscador y administración de productos para informar. No requiere un proceso de compra online.",
      },
      {
        title: "Catálogo con consultas o pedidos",
        text: "Selección de productos, solicitudes de cotización o pedidos que se coordinan por WhatsApp. La atención comercial confirma disponibilidad, entrega y pago.",
      },
      {
        title: "Tienda online",
        text: "Carrito, proceso de compra y medios de pago compatibles. Gestión de pedidos, stock y condiciones de entrega según el alcance acordado.",
      },
      {
        title: "Comercio conectado",
        text: "Integración de catálogo o tienda con inventario, pedidos y herramientas de gestión. Se revisan la fuente de los datos, la sincronización y los costos de terceros.",
      },
    ],
    scope:
      "Catálogo y ecommerce resuelven necesidades diferentes. La propuesta especifica administración, carga inicial, variantes, pagos y conexiones; no todas las capacidades están incluidas en el mismo plan.",
    links: [
      { label: "Catálogos digitales", href: "/catalogos-digitales" },
      { label: "Tiendas online con pagos", href: "/tiendas-online" },
      { label: "Comparar planes", href: "/planes#bloque-ecommerce" },
    ],
  },
  {
    id: "sitios-web",
    name: "Sitios corporativos, institucionales y profesionales",
    shortName: "Sitios web profesionales",
    path: "/desarrollo-web",
    description:
      "Sitios para presentar tu empresa o profesión, informar, transmitir confianza, mostrar proyectos y facilitar el contacto.",
    examples: "Empresas, instituciones, profesionales, portafolios y campañas.",
    groups: [
      {
        title: "Presencia y confianza",
        text: "Presentación de empresas, instituciones, profesionales y marcas personales. Servicios, trayectoria, equipo, portafolios y proyectos con información clara.",
      },
      {
        title: "Información y productos",
        text: "Contenidos institucionales, recursos y catálogos sin compra online. Estructura pensada para que cada visitante encuentre lo que necesita.",
      },
      {
        title: "Contacto y acciones concretas",
        text: "Páginas de campaña o servicios específicos, formularios, solicitudes y reservas según alcance. Una web puede informar, recibir consultas o vender: definimos su objetivo antes de diseñarla.",
      },
    ],
    scope:
      "Páginas, contenidos, administración, formularios y servicios externos se detallan en la propuesta. Diseño adaptable a celulares y base SEO técnica según el servicio contratado.",
    links: [
      { label: "Desarrollo web", href: "/desarrollo-web" },
      { label: "Webs para empresas", href: "/paginas-web-para-empresas" },
      { label: "Webs para profesionales", href: "/paginas-web/servicios-profesionales" },
    ],
  },
  {
    id: "automatizacion",
    name: "Automatización e integraciones",
    shortName: "Automatización e integraciones",
    path: "/automatizacion",
    description:
      "Conexiones entre plataformas y tareas automatizadas para reducir la digitación repetida y dar seguimiento a cada solicitud.",
    examples: "Formularios conectados, avisos, documentos y sincronización.",
    groups: [
      {
        title: "De la consulta a la gestión",
        text: "Un formulario puede crear una solicitud en tu sistema, asignarla a un responsable y enviar una notificación. Así el equipo trabaja sobre el mismo registro.",
      },
      {
        title: "Documentos y aprobaciones",
        text: "Generación de documentos o cotizaciones a partir de datos registrados. Flujos de pedidos, solicitudes y aprobaciones con avisos y estados consultables.",
      },
      {
        title: "Información conectada",
        text: "Sincronización entre plataformas comerciales y operacionales, con validaciones, registro de errores y reintentos definidos según cada integración.",
      },
    ],
    scope:
      "La factibilidad depende de las API, permisos, calidad de los datos y condiciones de cada proveedor. Licencias y consumos externos se informan por separado.",
    links: [
      { label: "Automatización de procesos", href: "/automatizacion" },
      { label: "Flujos con WhatsApp", href: "/automatizacion-whatsapp-empresas" },
      { label: "Cotizaciones y PDF", href: "/cotizador-web-pdf" },
    ],
  },
] as const;

export const industrySolutions = [
  {
    id: "abogados",
    name: "Abogados y estudios jurídicos",
    need: "Presentación profesional, consultas, agenda, documentos o un portal para clientes.",
    href: "/paginas-web/servicios-profesionales",
    label: "Presencia profesional",
    type: "sistema",
  },
  {
    id: "constructoras",
    name: "Constructoras",
    need: "Mostrar obras y coordinar personal, documentación, tareas y avances de cada proyecto.",
    href: "/paginas-web/constructoras",
    label: "Web para constructoras",
    type: "gestion-personas",
  },
  {
    id: "inmobiliarias",
    name: "Inmobiliarias",
    need: "Sitio institucional, catálogo de propiedades, formularios y seguimiento comercial.",
    href: "/catalogos-digitales",
    label: "Catálogos y consultas",
    type: "catalogo",
  },
  {
    id: "transporte",
    name: "Transporte y logística",
    need: "Presencia corporativa, cotizaciones, despachos y control de vehículos y conductores.",
    href: "/paginas-web/transporte-logistica",
    label: "Web para transporte",
    type: "control-flota",
  },
  {
    id: "comercio",
    name: "Comercio y distribución",
    need: "Catálogos, ecommerce, pedidos, inventario y control de caja conectados según alcance.",
    href: "/tiendas-online",
    label: "Ecommerce",
    type: "sistema",
  },
  {
    id: "industria",
    name: "Industria y proveedores B2B",
    need: "Fichas técnicas, cotizaciones, portales de proveedores y seguimiento de servicios.",
    href: "/paginas-web/industria-b2b",
    label: "Presencia industrial B2B",
    type: "sistema",
  },
  {
    id: "consultoras",
    name: "Consultoras y servicios profesionales",
    need: "Presentación de servicios, reservas, portales y gestión de entregables y solicitudes.",
    href: "/paginas-web/servicios-profesionales",
    label: "Web para profesionales",
    type: "sistema",
  },
  {
    id: "negocios",
    name: "Emprendimientos y negocios",
    need: "Presencia digital, productos y consultas, con herramientas que puedan crecer por etapas.",
    href: "/paginas-web-para-pymes",
    label: "Web para pymes",
    type: "orientacion",
  },
] as const;

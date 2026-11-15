import type { ServicePageData } from "./service-pages";

export const mobileAppService: ServicePageData = {
  slug: "desarrollo-apps-moviles",
  navLabel: "Apps Android e iOS",
  metaTitle: "Desarrollo de apps Android e iOS en Chile para empresas",
  metaDescription:
    "Diseño y desarrollo de apps Android e iOS para empresas en Chile: funciones a medida, integración con sistemas, pruebas y apoyo para publicación según alcance.",
  primaryKeyword: "desarrollo de apps Android e iOS en Chile",
  secondaryKeywords: [
    "aplicaciones móviles para empresas",
    "desarrollo de aplicaciones Android",
    "desarrollo de aplicaciones iOS",
    "apps conectadas a sistemas empresariales",
  ],
  heroTitle: "Desarrollo de apps Android e iOS para empresas en Chile",
  heroDescription:
    "Lleva un servicio o proceso de tu empresa al celular. Diseñamos y desarrollamos aplicaciones con las funciones, integraciones y dispositivos definidos para tu proyecto, desde la primera versión hasta las pruebas y el acompañamiento para su publicación.",
  summary:
    "Aplicaciones móviles a medida para clientes, colaboradores y equipos en terreno. Podemos evaluar inicio de sesión, agenda, pedidos, formularios, fotografías y otras funciones según la necesidad de tu negocio.",
  problem:
    "Un proceso móvil necesita considerar cómo se usa el teléfono: pantallas pequeñas, permisos, conexión variable y tareas que deben completarse en pocos pasos. Si la aplicación no se conecta con los datos y responsables de la empresa, la información termina copiándose entre sistemas y la operación sigue dependiendo de gestiones manuales.",
  solution:
    "Definimos quién usará la app, qué tarea debe resolver y con qué sistemas se comunicará. A partir de ese alcance diseñamos las pantallas, elegimos una solución nativa o multiplataforma y construimos por etapas. Las funciones móviles, el uso sin conexión y la distribución se evalúan antes de comprometer su implementación.",
  idealFor: [
    "Microempresas y pymes que necesitan evaluar una aplicación para un servicio o proceso concreto.",
    "Empresas que quieren ofrecer a sus clientes un acceso móvil a solicitudes, reservas, pedidos o información autorizada.",
    "Equipos en terreno que requieren registrar formularios, fotografías o avances desde el teléfono.",
    "Organizaciones con un sistema web que necesitan una aplicación conectada a sus usuarios y datos.",
  ],
  deliverables: [
    "Definición de usuarios, funciones, plataformas y dispositivos compatibles, con el alcance de la primera versión por escrito.",
    "Diseño de navegación y pantallas, con revisión de los recorridos principales antes del desarrollo.",
    "Desarrollo para Android, iOS o ambas plataformas según la solución nativa o multiplataforma acordada.",
    "Implementación de las integraciones contratadas mediante API, con validaciones de acceso, intercambio de datos y manejo de errores.",
    "Pruebas de los flujos acordados en dispositivos y versiones definidos, incluyendo permisos y conectividad cuando formen parte del alcance.",
    "Entrega de archivos, código y documentación según contrato, más acompañamiento para preparar la distribución y atender observaciones de las tiendas dentro del alcance acordado.",
  ],
  process: [
    "Levantamos el objetivo, los usuarios y los sistemas existentes; definimos las funciones prioritarias y las dependencias del proyecto.",
    "Acordamos plataformas, modalidad de desarrollo, pantallas, integraciones, datos utilizados y criterios de aceptación.",
    "Construimos por etapas y revisamos los recorridos con tu equipo para validar el funcionamiento de la app.",
    "Realizamos las pruebas acordadas y preparamos los recursos de distribución, la información de privacidad y los accesos de revisión necesarios.",
    "Acompañamos el envío desde las cuentas del cliente y entregamos documentación, accesos y condiciones de mantenimiento según la propuesta.",
  ],
  scopeNotes: [
    "El presupuesto se define por funciones, pantallas, plataformas, integraciones y pruebas. El uso sin conexión, las notificaciones y los servicios de servidor se incluyen cuando están expresamente contratados.",
    "Las cuentas de publicación quedan bajo titularidad y control del cliente. El titular completa las verificaciones, acepta los acuerdos de las plataformas y autoriza los accesos necesarios para el proyecto.",
    "Membresías, tarifas de las tiendas, infraestructura, mensajería, mapas y otros servicios de terceros se identifican por separado en la propuesta.",
    "Apple y Google aplican sus propios requisitos de revisión y publicación. El acompañamiento no garantiza aprobación ni una fecha de disponibilidad en las tiendas.",
    "La entrega de código, las licencias, el soporte inicial y el mantenimiento posterior se detallan en el contrato. Los cambios de sistemas operativos, políticas o integraciones pueden requerir actualizaciones.",
  ],
  faqs: [
    {
      question: "¿Conviene una app nativa o multiplataforma?",
      answer:
        "Depende de las funciones, los dispositivos y la evolución prevista. Una solución nativa se desarrolla específicamente para cada plataforma; una multiplataforma permite compartir parte del desarrollo y requiere igualmente pruebas en Android e iOS. La propuesta explica la alternativa elegida y sus límites.",
    },
    {
      question: "¿La aplicación puede funcionar sin Internet?",
      answer:
        "Podemos evaluar funciones sin conexión, como consultar información descargada o guardar registros pendientes. Debe definirse qué datos quedan en el dispositivo, cómo se protegen y cómo se sincronizan al recuperar la conexión. No todas las operaciones pueden completarse sin acceso al servidor.",
    },
    {
      question: "¿Pueden conectar la app con mi sistema web, ERP o CRM?",
      answer:
        "Sí, sujeto a evaluación técnica. Revisamos la API disponible, sus permisos, documentación y condiciones de uso. La cotización identifica los datos y operaciones que se integrarán; si hace falta construir o modificar servicios de servidor, se incorpora como parte del alcance.",
    },
    {
      question: "¿Se pueden incorporar notificaciones y funciones del teléfono?",
      answer:
        "Podemos evaluar notificaciones, cámara, ubicación y otras funciones necesarias para el proyecto. Cada una se define y prueba según su propósito, permisos y compatibilidad. Las notificaciones dependen también de la autorización y configuración del dispositivo del usuario.",
    },
    {
      question: "¿Incluye publicación en App Store y Google Play?",
      answer:
        "Puede incluirse el acompañamiento para preparar la ficha, las versiones y el envío a revisión. La publicación se gestiona desde cuentas del cliente, con las verificaciones y tarifas que correspondan. Las tiendas deciden la aprobación y pueden solicitar información, pruebas o cambios; sus tiempos se consideran por separado del desarrollo.",
    },
    {
      question: "¿Cómo se entrega el proyecto y se mantiene después?",
      answer:
        "La propuesta establece código, archivos, documentación, cuentas y licencias que se entregan, junto con el soporte inicial. El mantenimiento se acuerda según actualizaciones de Android e iOS, correcciones, infraestructura e integraciones. Las nuevas funciones se evalúan como ampliaciones del proyecto.",
    },
  ],
  officialResources: [
    {
      label: "Apple: requisitos de revisión de aplicaciones",
      href: "https://developer.apple.com/app-store/review/guidelines/",
    },
    {
      label: "Apple Developer Program: inscripción de personas y organizaciones",
      href: "https://developer.apple.com/programs/enroll/",
    },
    {
      label: "Google Play: configuración de la cuenta de desarrollador",
      href: "https://support.google.com/googleplay/android-developer/answer/6112435?hl=es",
    },
    {
      label: "Google Play: proceso y estados de publicación",
      href: "https://support.google.com/googleplay/android-developer/answer/9859751?hl=es",
    },
  ],
  relatedSlugs: ["paginas-web-para-pymes", "desarrollo-web-chile"],
  relatedLinks: [
    { label: "Software y sistemas empresariales a medida", href: "/sistemas-web" },
    { label: "Sitios web para microempresas y pymes", href: "/paginas-web-para-pymes" },
    { label: "Automatización de procesos e integraciones", href: "/automatizacion" },
  ],
};

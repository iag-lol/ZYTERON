/**
 * Subpáginas de sistemas web. Son proyectos de mayor ticket con intención de
 * búsqueda propia y distinta a /sistemas-web, que actúa como hub del cluster.
 */

export type SystemFaq = {
  question: string;
  answer: string;
};

export type SystemModule = {
  title: string;
  description: string;
};

export type SystemPage = {
  slug: string;
  path: string;
  navLabel: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  heroTitle: string;
  heroDescription: string;
  /** Señales de que la empresa ya necesita este sistema. */
  signals: string[];
  modules: SystemModule[];
  /** Qué se gana de forma concreta y medible por el propio cliente. */
  outcomes: string[];
  /** Etapas de implementación, para proyectos largos. */
  phases: string[];
  faqs: SystemFaq[];
  finalCtaTitle: string;
  finalCtaCopy: string;
};

export const systemPages: SystemPage[] = [
  {
    slug: "intranet-corporativa",
    path: "/sistemas-web/intranet-corporativa",
    navLabel: "Intranet corporativa",
    metaTitle: "Desarrollo de Intranet Corporativa en Chile | Zyteron",
    metaDescription:
      "Desarrollamos intranets corporativas a medida en Chile: comunicación interna, documentos, solicitudes de personal, permisos por rol y acceso desde cualquier dispositivo.",
    primaryKeyword: "desarrollo intranet Chile",
    heroTitle: "Intranet corporativa a medida para ordenar la operación interna",
    heroDescription:
      "Una intranet centraliza lo que hoy vive en correos, grupos de WhatsApp y carpetas compartidas: comunicados, documentos vigentes, solicitudes del personal y procesos internos, con permisos por rol.",
    signals: [
      "Los comunicados importantes se pierden entre correos y grupos de WhatsApp.",
      "Nadie sabe cuál es la versión vigente de un procedimiento o de un formulario.",
      "Las solicitudes de vacaciones o permisos se piden por correo y se aprueban sin trazabilidad.",
      "Cuando alguien entra o sale de la empresa, no hay proceso claro de acceso a la información.",
      "La información sensible está en carpetas compartidas sin control real de quién la ve.",
    ],
    modules: [
      {
        title: "Comunicación interna",
        description:
          "Comunicados segmentados por área o cargo, con confirmación de lectura cuando el mensaje es crítico.",
      },
      {
        title: "Gestión documental interna",
        description:
          "Procedimientos, políticas y formularios con versión vigente única y control de quién puede verlos.",
      },
      {
        title: "Solicitudes del personal",
        description:
          "Vacaciones, permisos, anticipos o requerimientos con flujo de aprobación y registro histórico.",
      },
      {
        title: "Directorio y organigrama",
        description:
          "Quién es quién, en qué área está y a quién corresponde escalar cada tipo de solicitud.",
      },
      {
        title: "Permisos por rol",
        description:
          "Cada perfil ve solo lo que le corresponde: operarios, jefaturas, administración y gerencia.",
      },
      {
        title: "Registro de actividad",
        description:
          "Trazabilidad de accesos, descargas y aprobaciones para auditoría interna.",
      },
    ],
    outcomes: [
      "Una sola fuente de verdad para procedimientos y documentos vigentes.",
      "Solicitudes internas con estado visible, sin perseguir aprobaciones por correo.",
      "Menos tiempo de jefaturas respondiendo las mismas consultas administrativas.",
      "Control real de qué información ve cada perfil dentro de la empresa.",
      "Proceso ordenado de ingreso y salida de personal respecto de los accesos.",
    ],
    phases: [
      "Levantamiento de procesos internos y perfiles de usuario reales.",
      "Definición de módulos prioritarios y flujos de aprobación.",
      "Desarrollo del módulo de mayor impacto y puesta en marcha con un área piloto.",
      "Incorporación gradual del resto de módulos y áreas.",
      "Capacitación, ajustes y soporte de operación.",
    ],
    faqs: [
      {
        question: "¿Conviene una intranet a medida o una herramienta ya existente?",
        answer:
          "Si tus procesos son estándar, una herramienta de mercado suele ser más barata y rápida. La intranet a medida se justifica cuando tus flujos de aprobación, perfiles o reglas internas no calzan con lo que ofrecen esas herramientas, o cuando necesitas integrarla con sistemas que ya tienes.",
      },
      {
        question: "¿Cuántos usuarios soporta?",
        answer:
          "La arquitectura no impone un límite práctico para el tamaño de una empresa mediana. Lo que sí influye en el costo es la cantidad de perfiles distintos y de reglas de permisos, no la cantidad de personas.",
      },
      {
        question: "¿Se puede usar desde el celular?",
        answer:
          "Sí. Se desarrolla responsive desde el inicio, porque en la mayoría de las empresas hay personal que no trabaja frente a un computador y necesita revisar comunicados o enviar solicitudes desde el teléfono.",
      },
      {
        question: "¿Cómo se protege la información interna?",
        answer:
          "Con autenticación por usuario, permisos por rol, cifrado en tránsito y registro de actividad. Las políticas concretas se definen en el levantamiento, según qué tan sensible sea la información que vas a alojar.",
      },
    ],
    finalCtaTitle: "¿Tu empresa necesita ordenar la información interna?",
    finalCtaCopy:
      "Cuéntanos cuántas personas trabajan contigo y qué procesos internos se te están escapando. Partimos por el módulo de mayor impacto, no por todo a la vez.",
  },
  {
    slug: "gestion-documental",
    path: "/sistemas-web/gestion-documental",
    navLabel: "Gestión documental",
    metaTitle: "Sistema de Gestión Documental a Medida en Chile | Zyteron",
    metaDescription:
      "Desarrollamos sistemas de gestión documental para empresas en Chile: versionado, permisos, vencimientos, búsqueda por metadatos y trazabilidad completa para auditorías.",
    primaryKeyword: "gestión documental a medida",
    heroTitle: "Sistema de gestión documental con trazabilidad y control de vencimientos",
    heroDescription:
      "Para empresas que manejan contratos, certificados, permisos o documentación técnica que caduca, y donde tener la versión equivocada tiene consecuencias reales.",
    signals: [
      "Los documentos están repartidos entre correos, carpetas compartidas y computadores personales.",
      "Se descubren certificados vencidos cuando ya generaron un problema operativo o una multa.",
      "Buscar un contrato específico toma más tiempo del que debería.",
      "No hay registro de quién modificó o descargó un documento sensible.",
      "En auditorías hay que reconstruir a mano la trazabilidad de la documentación.",
    ],
    modules: [
      {
        title: "Repositorio con metadatos",
        description:
          "Cada documento se clasifica por tipo, área, cliente, proyecto o cualquier campo que necesites buscar después.",
      },
      {
        title: "Versionado",
        description:
          "Historial completo de versiones, con marca clara de cuál es la vigente y quién la subió.",
      },
      {
        title: "Control de vencimientos",
        description:
          "Alertas automáticas antes de que caduque un certificado, contrato o permiso.",
      },
      {
        title: "Permisos granulares",
        description:
          "Control por usuario, área o tipo de documento, distinguiendo entre ver, descargar y editar.",
      },
      {
        title: "Búsqueda avanzada",
        description:
          "Filtros combinados por metadatos y búsqueda por contenido cuando el formato lo permite.",
      },
      {
        title: "Auditoría",
        description:
          "Registro inmutable de cada acceso, descarga, modificación y eliminación.",
      },
    ],
    outcomes: [
      "Encontrar cualquier documento en segundos en vez de revisar carpetas.",
      "Cero sorpresas por documentación vencida, gracias a las alertas anticipadas.",
      "Trazabilidad lista para auditoría sin trabajo manual de reconstrucción.",
      "Certeza de que quien abre un documento está viendo la versión vigente.",
      "Control efectivo sobre quién accede a documentación sensible.",
    ],
    phases: [
      "Levantamiento de tipos documentales, metadatos y reglas de vencimiento.",
      "Definición de perfiles y matriz de permisos.",
      "Desarrollo del repositorio, carga y búsqueda.",
      "Migración de la documentación existente.",
      "Puesta en marcha, capacitación y ajustes.",
    ],
    faqs: [
      {
        question: "¿Se puede migrar la documentación que ya tenemos?",
        answer:
          "Sí. La migración se cotiza aparte porque depende del volumen, del formato de origen y de cuánta metadata haya que completar. Si los archivos están razonablemente ordenados, buena parte se puede automatizar; si no, hay un trabajo de clasificación inicial.",
      },
      {
        question: "¿Cómo funcionan las alertas de vencimiento?",
        answer:
          "Defines para cada tipo de documento con cuánta anticipación quieres el aviso y a quién debe llegar. El sistema envía la notificación por correo y la muestra en el panel, con la lista de lo que está por caducar.",
      },
      {
        question: "¿Sirve para certificaciones tipo ISO?",
        answer:
          "El control de versiones, los permisos y el registro de auditoría cubren buena parte de lo que exigen esos estándares en materia de control documental. La certificación depende del organismo certificador y de tus procesos, no solo del software.",
      },
      {
        question: "¿Dónde se almacenan los documentos?",
        answer:
          "En infraestructura que definimos contigo según sensibilidad y volumen. Puede ser almacenamiento en la nube con cifrado o tu propia infraestructura, si tienes requisitos de residencia de datos.",
      },
    ],
    finalCtaTitle: "¿Tu empresa maneja documentación crítica que vence?",
    finalCtaCopy:
      "Cuéntanos qué tipos de documento manejas y qué volumen tienes. Te proponemos un alcance por etapas, partiendo por el tipo documental que más riesgo genera hoy.",
  },
  {
    slug: "control-flota",
    path: "/sistemas-web/control-flota",
    navLabel: "Control de flota",
    metaTitle: "Sistema de Control de Flota a Medida en Chile | Zyteron",
    metaDescription:
      "Desarrollo de sistemas de control de flota para empresas en Chile: mantenciones preventivas, documentación de vehículos, consumo de combustible, conductores y reportes de costo.",
    primaryKeyword: "desarrollo sistema control de flota",
    heroTitle: "Sistema de control de flota para saber qué cuesta cada vehículo",
    heroDescription:
      "Para empresas con vehículos propios que necesitan controlar mantenciones, documentación al día, consumo de combustible y costo real por unidad, sin depender de planillas.",
    signals: [
      "Las mantenciones se hacen cuando falla algo, no cuando corresponde por kilometraje.",
      "Los permisos de circulación y revisiones técnicas se vencen sin que nadie lo note a tiempo.",
      "No se sabe cuánto cuesta realmente mantener cada vehículo al mes.",
      "El control de combustible se lleva en una planilla que solo entiende una persona.",
      "Cuando un vehículo falla, no hay historial de qué se le hizo antes.",
    ],
    modules: [
      {
        title: "Ficha de vehículo",
        description:
          "Datos técnicos, patente, año, kilometraje actual e historial completo por unidad.",
      },
      {
        title: "Mantención preventiva",
        description:
          "Programación por kilometraje o fecha, con alertas antes de que se cumpla el plazo.",
      },
      {
        title: "Documentación y vencimientos",
        description:
          "Permiso de circulación, revisión técnica, seguros y padrón, con alertas anticipadas.",
      },
      {
        title: "Control de combustible",
        description:
          "Registro de cargas, cálculo de rendimiento y detección de consumos fuera de rango.",
      },
      {
        title: "Conductores",
        description:
          "Asignación de vehículo, vencimiento de licencias e historial por conductor.",
      },
      {
        title: "Reportes de costo",
        description:
          "Costo por vehículo, por kilómetro y por período, para decidir cuándo renovar una unidad.",
      },
    ],
    outcomes: [
      "Mantenciones al día y menos detenciones imprevistas por fallas evitables.",
      "Cero multas por documentación vencida gracias a las alertas anticipadas.",
      "Visibilidad del costo real por vehículo, no un total agregado sin detalle.",
      "Detección de consumos anómalos de combustible al comparar rendimientos.",
      "Historial completo por unidad, útil también al momento de venderla.",
    ],
    phases: [
      "Levantamiento de la flota, tipos de vehículo y rutinas de mantención actuales.",
      "Carga inicial de vehículos, documentación y kilometrajes.",
      "Desarrollo de fichas, alertas y registro de mantenciones.",
      "Incorporación de combustible, conductores y reportes de costo.",
      "Capacitación del equipo de operaciones y ajustes en marcha.",
    ],
    faqs: [
      {
        question: "¿Se integra con GPS o rastreo satelital?",
        answer:
          "Sí, si tu proveedor de GPS ofrece una API. Con eso el kilometraje puede actualizarse automáticamente y disparar las mantenciones sin carga manual. Si no hay integración disponible, el kilometraje se registra manualmente, que es como funciona la mayoría de las flotas hoy.",
      },
      {
        question: "¿Sirve para flotas pequeñas?",
        answer:
          "Desde unos 5 vehículos ya se nota la diferencia respecto de una planilla, sobre todo por las alertas de vencimiento. Bajo ese número, conviene evaluar si el ahorro justifica el desarrollo; te lo decimos con franqueza en el levantamiento.",
      },
      {
        question: "¿Puede registrar cargas de combustible desde el celular?",
        answer:
          "Sí. El registro se diseña para usarse desde el teléfono en la estación de servicio, incluyendo la foto de la boleta, que es la forma en que realmente se captura el dato sin que nadie lo postergue.",
      },
      {
        question: "¿Cómo se controlan las mantenciones por kilometraje?",
        answer:
          "Defines las rutinas por tipo de vehículo, por ejemplo cambio de aceite cada cierta cantidad de kilómetros. El sistema compara contra el kilometraje registrado y avisa cuando se acerca el momento, mostrando además qué unidades están atrasadas.",
      },
    ],
    finalCtaTitle: "¿Necesitas saber cuánto te cuesta realmente cada vehículo?",
    finalCtaCopy:
      "Cuéntanos cuántos vehículos tienes y cómo llevas hoy las mantenciones. Te proponemos un alcance por etapas, partiendo por alertas de vencimiento y mantención preventiva.",
  },
];

export function getSystemPageBySlug(slug: string) {
  return systemPages.find((page) => page.slug === slug);
}

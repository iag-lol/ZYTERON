export type CaseStudyData = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  clientProfile: string;
  location: string;
  industry: string;
  publishedAt: string;
  updatedAt?: string;
  challenge: string;
  objectives: string[];
  solution: string[];
  implementation: string[];
  outcomes: string[];
  kpis: string[];
  notes?: string[];
  relatedServices: string[];
  relatedPages: Array<{
    label: string;
    href: string;
  }>;
};

export const caseStudies: CaseStudyData[] = [
  {
    slug: "app-checklist-revision-buses",
    title: "Caso anónimo: aplicación para checklist de revisión de buses",
    metaTitle: "Caso checklist de buses | App con formularios, KPIs y SLA",
    metaDescription:
      "Caso anónimo de digitalización de checklist de buses: formularios, registros limpios, KPIs, SLA y mejor control operativo para toma de decisiones.",
    summary:
      "Digitalización de revisiones operativas que antes se registraban en papel, transformándolas en formularios, registros limpios y datos para control de gestión.",
    clientProfile: "Empresa operativa con flota de buses y procesos de revisión periódica",
    location: "Chile",
    industry: "Transporte y operación de flota",
    publishedAt: "2026-05-19",
    challenge:
      "El equipo registraba revisiones de buses en papel, lo que dificultaba buscar historial, medir cumplimiento, detectar recurrencias y generar indicadores confiables para la operación.",
    objectives: [
      "Reemplazar registros manuales por formularios digitales ordenados.",
      "Centralizar evidencia de cada revisión por fecha, responsable y unidad.",
      "Obtener KPIs operativos para seguimiento de cumplimiento y fallas recurrentes.",
      "Crear base para SLA internos y mejor control de tiempos de respuesta.",
    ],
    solution: [
      "Aplicación web con formularios de checklist por bus y tipo de revisión.",
      "Registro estructurado de respuestas, observaciones, responsables y estados.",
      "Panel administrativo para revisar historial y filtrar por unidad, fecha o condición.",
      "Datos preparados para análisis de KPIs, SLA y toma de decisiones operativas.",
    ],
    implementation: [
      "Levantamiento del checklist usado en papel y normalización de campos.",
      "Diseño de formularios digitales para uso rápido desde terreno u oficina.",
      "Creación de registros consultables y estructura de control por estado.",
      "Visualización de indicadores para seguimiento de cumplimiento y pendientes.",
      "Ajustes de flujo para que el equipo pudiera adoptar el sistema sin fricción.",
    ],
    outcomes: [
      "El proceso dejó de depender exclusivamente de documentos físicos dispersos.",
      "La empresa obtuvo trazabilidad de revisiones por unidad, fecha y responsable.",
      "La información quedó disponible para análisis de cumplimiento, reincidencias y tiempos de respuesta.",
      "La operación pudo avanzar hacia control por SLA y decisiones basadas en datos.",
    ],
    kpis: [
      "Cantidad de revisiones realizadas por periodo.",
      "Pendientes por unidad o responsable.",
      "Cumplimiento de checklist por tipo de revisión.",
      "Incidencias recurrentes por bus.",
      "Base para tiempos de respuesta y SLA internos.",
    ],
    notes: [
      "Caso anonimizado para proteger información operativa del cliente.",
      "No se publican datos internos, patentes, responsables ni métricas confidenciales.",
    ],
    relatedServices: ["desarrollo-web-chile", "paginas-web-para-empresas"],
    relatedPages: [
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Automatización", href: "/automatizacion" },
      { label: "Cotizar sistema", href: "/contacto?caso=checklist-buses" },
    ],
  },
  {
    slug: "control-asistencia-personal",
    title: "Caso anónimo: sistema de control de asistencia de personal",
    metaTitle: "Caso control de asistencia | Sistema web para personal",
    metaDescription:
      "Caso anónimo de sistema para control de asistencia de personal: registros ordenados, seguimiento operativo y mejor visibilidad para administración.",
    summary:
      "Implementación de un flujo digital para registrar asistencia, ordenar datos por trabajador y mejorar la revisión administrativa del personal.",
    clientProfile: "Empresa con personal operativo y necesidad de control administrativo diario",
    location: "Chile",
    industry: "Operaciones y gestión de personal",
    publishedAt: "2026-05-19",
    challenge:
      "El control de asistencia se gestionaba con registros poco centralizados, lo que generaba diferencias, baja trazabilidad y mayor tiempo administrativo al revisar cumplimiento del personal.",
    objectives: [
      "Registrar asistencia de forma más ordenada y consultable.",
      "Reducir dependencia de planillas o registros manuales dispersos.",
      "Facilitar revisión por fechas, trabajadores y estados.",
      "Entregar información útil para administración y control interno.",
    ],
    solution: [
      "Sistema web con formularios de registro y panel de consulta.",
      "Organización de datos por trabajador, fecha, estado y observación.",
      "Vista administrativa para revisar registros y detectar inconsistencias.",
      "Base escalable para reportes, exportaciones y reglas internas.",
    ],
    implementation: [
      "Levantamiento del flujo de asistencia existente.",
      "Definición de campos mínimos para evitar carga innecesaria de datos.",
      "Desarrollo de formulario y panel administrativo.",
      "Pruebas con escenarios de registro diario y revisión administrativa.",
    ],
    outcomes: [
      "La asistencia quedó más ordenada y fácil de consultar.",
      "La administración redujo fricción al revisar registros por periodo.",
      "El negocio obtuvo una base más confiable para control interno.",
    ],
    kpis: [
      "Registros por trabajador.",
      "Asistencias, ausencias y observaciones por periodo.",
      "Casos pendientes de revisión.",
      "Trazabilidad de carga y modificación según alcance.",
    ],
    notes: ["Caso anonimizado; no se publican nombres de trabajadores ni datos internos."],
    relatedServices: ["desarrollo-web-chile"],
    relatedPages: [
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Automatización", href: "/automatizacion" },
      { label: "Contacto", href: "/contacto?caso=asistencia-personal" },
    ],
  },
  {
    slug: "control-flota-combustible",
    title: "Caso anónimo: control de flota por combustible",
    metaTitle: "Caso control de flota y combustible | Sistema web",
    metaDescription:
      "Caso anónimo de sistema para control de flota por combustible: registros de consumo, trazabilidad, reportes y apoyo a decisiones operativas.",
    summary:
      "Sistema para registrar consumos de combustible, controlar unidades y entregar información útil para seguimiento operativo de flota.",
    clientProfile: "Empresa con vehículos operativos y necesidad de control de combustible",
    location: "Chile",
    industry: "Transporte, logística y operación vehicular",
    publishedAt: "2026-05-19",
    challenge:
      "El control de combustible no estaba suficientemente ordenado para comparar consumos, revisar historial por vehículo y detectar desviaciones o registros incompletos.",
    objectives: [
      "Registrar cargas de combustible por vehículo, fecha y responsable.",
      "Mejorar trazabilidad de consumo y costos asociados.",
      "Facilitar revisión administrativa y operativa.",
      "Crear base para reportes de consumo por unidad o periodo.",
    ],
    solution: [
      "Sistema web para ingreso estructurado de cargas y datos asociados.",
      "Panel de consulta por unidad, fecha, responsable y tipo de registro.",
      "Estructura preparada para KPIs de consumo, costos y comportamiento por flota.",
      "Base para exportaciones o reportes según necesidad administrativa.",
    ],
    implementation: [
      "Definición de datos críticos para cada carga de combustible.",
      "Creación de formularios para registro rápido.",
      "Construcción de panel para seguimiento de unidades.",
      "Validación del flujo con escenarios operativos reales.",
    ],
    outcomes: [
      "La empresa obtuvo mejor control del historial de combustible.",
      "La información quedó disponible para revisar tendencias y desviaciones.",
      "El equipo pudo tomar decisiones con datos más ordenados y verificables.",
    ],
    kpis: [
      "Consumo por vehículo.",
      "Registros por periodo.",
      "Costos asociados por unidad.",
      "Desviaciones o registros pendientes de revisión.",
    ],
    notes: ["Caso anonimizado; no se publican patentes, rutas ni montos internos."],
    relatedServices: ["desarrollo-web-chile"],
    relatedPages: [
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Soporte TI", href: "/soporte-ti" },
      { label: "Cotizar plataforma", href: "/contacto?caso=control-combustible" },
    ],
  },
  {
    slug: "tienda-online-articulos-personalizados",
    title: "Caso anónimo: tienda online para artículos personalizados",
    metaTitle: "Caso tienda online artículos personalizados | Ecommerce Chile",
    metaDescription:
      "Caso anónimo de tienda online para artículos personalizados: catálogo, productos, contacto, experiencia responsive y base para venta digital.",
    summary:
      "Desarrollo de una tienda online para presentar artículos personalizados, ordenar catálogo y facilitar consultas o pedidos desde canales digitales.",
    clientProfile: "Negocio de productos personalizados para clientes finales y empresas",
    location: "Chile",
    industry: "Ecommerce y artículos personalizados",
    publishedAt: "2026-05-19",
    challenge:
      "El negocio necesitaba mostrar productos de forma profesional, ordenar opciones personalizables y facilitar contacto sin depender solo de redes sociales o mensajes manuales.",
    objectives: [
      "Crear una tienda online clara y responsive.",
      "Ordenar productos, categorías y detalles de personalización.",
      "Facilitar consultas, pedidos y contacto por WhatsApp.",
      "Preparar una base escalable para futuras funciones de ecommerce.",
    ],
    solution: [
      "Tienda online con catálogo organizado y fichas de producto.",
      "Diseño visual adaptado a venta de artículos personalizados.",
      "Rutas de contacto y pedido con llamados a la acción claros.",
      "Estructura base para SEO de productos y categorías.",
    ],
    implementation: [
      "Diseño de arquitectura de catálogo por tipo de producto.",
      "Creación de páginas y componentes para productos destacados.",
      "Optimización responsive para navegación móvil.",
      "Integración de canales de contacto para venta asistida.",
    ],
    outcomes: [
      "El negocio obtuvo un canal propio para presentar productos.",
      "Los clientes pudieron revisar opciones con mayor claridad antes de consultar.",
      "La marca quedó mejor preparada para campañas, SEO y crecimiento digital.",
    ],
    kpis: [
      "Productos publicados.",
      "Categorías activas.",
      "Consultas generadas desde WhatsApp o formulario.",
      "Páginas de producto disponibles para indexación.",
    ],
    notes: ["Caso anonimizado; no se publican imágenes ni datos comerciales del cliente."],
    relatedServices: ["paginas-web-para-pymes", "landing-pages-para-empresas"],
    relatedPages: [
      { label: "Tiendas online", href: "/tiendas-online" },
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes" },
      { label: "Cotizar ecommerce", href: "/contacto?caso=tienda-personalizados" },
    ],
  },
  {
    slug: "control-ventas-inventario-efectivo",
    title: "Caso anónimo: control de ventas, efectivo e inventario para negocio",
    metaTitle: "Caso control de ventas e inventario | Sistema para negocio",
    metaDescription:
      "Caso anónimo de sistema para negocio que no registraba ventas: control de efectivo, inventario, productos y trazabilidad comercial.",
    summary:
      "Sistema para ordenar ventas e inventario en un negocio que perdía visibilidad de efectivo, productos y movimientos diarios.",
    clientProfile: "Negocio con venta diaria de productos y control manual insuficiente",
    location: "Chile",
    industry: "Comercio, ventas e inventario",
    publishedAt: "2026-05-19",
    challenge:
      "El negocio no registraba sus ventas de forma ordenada, lo que generaba pérdida de control sobre efectivo, inventario disponible y productos vendidos.",
    objectives: [
      "Registrar ventas diarias de forma estructurada.",
      "Controlar inventario y movimientos de productos.",
      "Mejorar visibilidad sobre efectivo y operación comercial.",
      "Reducir pérdidas por desorden o falta de trazabilidad.",
    ],
    solution: [
      "Sistema web para registrar ventas, productos y movimientos.",
      "Panel administrativo con información de inventario y ventas.",
      "Estructura para controlar ingresos, salidas y stock disponible.",
      "Base para reportes comerciales y revisión de caja según alcance.",
    ],
    implementation: [
      "Levantamiento del flujo de venta y registro actual.",
      "Definición de datos mínimos para venta, producto, cantidad y estado.",
      "Creación de panel de administración y registros consultables.",
      "Pruebas de uso con escenarios de venta e inventario.",
    ],
    outcomes: [
      "El negocio obtuvo mayor control sobre ventas registradas.",
      "La información de inventario quedó más ordenada y consultable.",
      "La administración pudo revisar movimientos con menor dependencia de memoria o papeles.",
    ],
    kpis: [
      "Ventas por día o periodo.",
      "Productos vendidos.",
      "Stock disponible.",
      "Movimientos de inventario.",
      "Diferencias o pendientes de revisión.",
    ],
    notes: ["Caso anonimizado; no se publican montos, proveedores ni productos específicos."],
    relatedServices: ["desarrollo-web-chile"],
    relatedPages: [
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Tiendas online", href: "/tiendas-online" },
      { label: "Solicitar sistema", href: "/contacto?caso=ventas-inventario" },
    ],
  },
  {
    slug: "web-empresa-combustible-seo",
    title: "Caso anónimo: presentación web y SEO para empresa de combustible",
    metaTitle: "Caso SEO empresa de combustible | Web corporativa Chile",
    metaDescription:
      "Caso anónimo de web corporativa para empresa de combustible con problemas de SEO y posicionamiento: estructura, contenido, metadata y confianza.",
    summary:
      "Mejora de presencia digital para una empresa de combustible que necesitaba una presentación más profesional y una estructura SEO más clara.",
    clientProfile: "Empresa relacionada con servicios de combustible y atención B2B",
    location: "Chile",
    industry: "Combustible, energía y servicios B2B",
    publishedAt: "2026-05-19",
    challenge:
      "La empresa tenía problemas de posicionamiento y una presentación digital insuficiente para explicar servicios, generar confianza y aparecer mejor en búsquedas relevantes.",
    objectives: [
      "Mejorar la presentación corporativa y comercial.",
      "Ordenar servicios en páginas y secciones claras.",
      "Optimizar metadata, jerarquía de encabezados y contenido SEO.",
      "Crear rutas de contacto más visibles para clientes potenciales.",
    ],
    solution: [
      "Web corporativa con estructura profesional y enfoque B2B.",
      "Contenido orientado a servicios, confianza, cobertura y contacto.",
      "SEO técnico base: titles, descriptions, canonical, sitemap, Open Graph y schema.",
      "Enlaces internos hacia servicios, contacto y preguntas frecuentes.",
    ],
    implementation: [
      "Diagnóstico de estructura actual y oportunidades SEO.",
      "Reorganización de contenido por intención de búsqueda.",
      "Desarrollo responsive con bloques comerciales y técnicos.",
      "Configuración de señales SEO base para indexación y presentación social.",
    ],
    outcomes: [
      "La empresa obtuvo una presentación digital más clara y confiable.",
      "La estructura quedó mejor preparada para Google y usuarios reales.",
      "Los servicios principales quedaron más visibles y enlazados internamente.",
      "La web quedó lista para medir mejoras desde Search Console y analítica.",
    ],
    kpis: [
      "Páginas indexables por servicio.",
      "CTR e impresiones en Search Console.",
      "Consultas por formulario o WhatsApp.",
      "Rendimiento móvil y Core Web Vitals.",
    ],
    notes: ["Caso anonimizado; no se publican datos estratégicos ni métricas confidenciales."],
    relatedServices: ["paginas-web-para-empresas", "seo-para-empresas-chile", "diseno-web-chile"],
    relatedPages: [
      { label: "Desarrollo web", href: "/desarrollo-web" },
      { label: "Páginas web para empresas", href: "/diseno-web-empresas" },
      { label: "Contacto", href: "/contacto?caso=web-combustible-seo" },
    ],
  },
  {
    slug: "tickets-dano-estructural-georreferenciado",
    title: "Caso anónimo: tickets georreferenciados para daño estructural y perimetral",
    metaTitle: "Caso tickets georreferenciados | Fotos, ubicación y daños",
    metaDescription:
      "Caso anónimo de sistema para registrar tickets de daño estructural y perimetral con foto, ubicación georreferenciada, luminarias y seguimiento.",
    summary:
      "Sistema para registrar incidentes de daño estructural o perimetral con evidencia fotográfica, ubicación y trazabilidad para atención operativa.",
    clientProfile: "Operación que necesita registrar daños, luminarias e incidencias en terreno",
    location: "Chile",
    industry: "Mantenimiento, infraestructura y operación en terreno",
    publishedAt: "2026-05-19",
    challenge:
      "Los daños estructurales, perimetrales o de luminaria se reportaban con información incompleta, dificultando ubicar el problema, priorizar atención y generar seguimiento.",
    objectives: [
      "Crear tickets con descripción, foto y ubicación georreferenciada.",
      "Centralizar reportes de daño estructural, perimetral y luminaria.",
      "Mejorar seguimiento por estado, responsable y prioridad.",
      "Facilitar evidencia para mantenimiento y toma de decisiones.",
    ],
    solution: [
      "Aplicación web para registro de tickets en terreno.",
      "Carga de fotos como evidencia del problema.",
      "Georreferenciación para ubicar el punto reportado.",
      "Panel para revisar, filtrar y gestionar estados de atención.",
    ],
    implementation: [
      "Definición de tipos de daño y campos obligatorios.",
      "Diseño de formulario móvil para uso en terreno.",
      "Implementación de registro con foto y ubicación.",
      "Panel administrativo para seguimiento de tickets y estados.",
    ],
    outcomes: [
      "Los reportes quedaron mejor documentados con evidencia y ubicación.",
      "El equipo pudo priorizar atención con mayor contexto.",
      "La operación ganó trazabilidad por ticket, zona, estado y responsable.",
    ],
    kpis: [
      "Tickets por tipo de daño.",
      "Incidencias por zona o ubicación.",
      "Estados abiertos, en revisión y cerrados.",
      "Tiempo de atención según flujo definido.",
    ],
    notes: ["Caso anonimizado; no se publican ubicaciones reales ni fotografías operativas."],
    relatedServices: ["desarrollo-web-chile"],
    relatedPages: [
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Automatización", href: "/automatizacion" },
      { label: "Cotizar sistema de tickets", href: "/contacto?caso=tickets-georreferenciados" },
    ],
  },
  {
    slug: "control-equipos-tareas-reuniones-informes",
    title: "Caso anónimo: control de equipos, tareas, reuniones e informes",
    metaTitle: "Caso control de equipos y tareas | Sistema administrativo",
    metaDescription:
      "Caso anónimo de sistema para control de equipos: asignación de tareas, reuniones, informes, responsables y seguimiento operativo.",
    summary:
      "Plataforma para organizar equipos de trabajo, asignar tareas, registrar reuniones, generar informes y mejorar seguimiento operativo.",
    clientProfile: "Empresa con equipos internos, coordinación de tareas y necesidad de seguimiento",
    location: "Chile",
    industry: "Gestión operativa y administración interna",
    publishedAt: "2026-05-19",
    challenge:
      "La coordinación de equipos, tareas, reuniones e informes dependía de canales dispersos, lo que hacía difícil revisar responsables, avances y compromisos.",
    objectives: [
      "Centralizar asignación de tareas y responsables.",
      "Registrar reuniones, acuerdos e informes.",
      "Mejorar seguimiento de pendientes y estados.",
      "Facilitar control de equipos y toma de decisiones interna.",
    ],
    solution: [
      "Sistema web con módulos de tareas, reuniones e informes.",
      "Panel para responsables, estados, fechas y observaciones.",
      "Registro histórico para seguimiento de compromisos.",
      "Base escalable para reportes y nuevas funciones administrativas.",
    ],
    implementation: [
      "Levantamiento de roles, tipos de tarea y flujo de seguimiento.",
      "Diseño de módulos internos por prioridad operativa.",
      "Desarrollo de panel administrativo y registros consultables.",
      "Pruebas con escenarios de reunión, asignación y cierre de tareas.",
    ],
    outcomes: [
      "El equipo obtuvo mayor claridad sobre tareas y responsables.",
      "Las reuniones quedaron mejor documentadas y conectadas con acciones.",
      "La administración pudo revisar pendientes e informes con mayor orden.",
    ],
    kpis: [
      "Tareas asignadas y completadas.",
      "Pendientes por responsable.",
      "Reuniones registradas.",
      "Informes emitidos por periodo.",
    ],
    notes: ["Caso anonimizado; no se publican equipos, responsables ni documentos internos."],
    relatedServices: ["desarrollo-web-chile"],
    relatedPages: [
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Automatización", href: "/automatizacion" },
      { label: "Solicitar evaluación", href: "/contacto?caso=control-equipos" },
    ],
  },
  {
    slug: "web-cotizaciones-personalizadas-pdf",
    title: "Caso anónimo: web para cotizaciones personalizadas en PDF",
    metaTitle: "Caso cotizaciones PDF | Web con generación personalizada",
    metaDescription:
      "Caso anónimo de web para generar cotizaciones personalizadas en PDF: formularios, datos del cliente, propuesta ordenada y trazabilidad comercial.",
    summary:
      "Herramienta web para levantar requerimientos, construir cotizaciones personalizadas y generar documentos PDF con formato profesional.",
    clientProfile: "Empresa que necesitaba formalizar propuestas comerciales de forma más rápida",
    location: "Chile",
    industry: "Servicios comerciales y cotización B2B",
    publishedAt: "2026-05-19",
    challenge:
      "El equipo armaba cotizaciones manualmente, con formatos inconsistentes y pérdida de tiempo al repetir información de servicios, condiciones y datos del cliente.",
    objectives: [
      "Estandarizar la creación de cotizaciones.",
      "Generar PDF personalizados con datos del cliente y propuesta.",
      "Reducir tiempo administrativo en preparación comercial.",
      "Mantener trazabilidad de solicitudes y propuestas emitidas.",
    ],
    solution: [
      "Web con formulario de levantamiento comercial.",
      "Generador de cotizaciones PDF con estructura profesional.",
      "Registro de datos para seguimiento de oportunidades.",
      "Base para notificaciones y flujo interno de ventas.",
    ],
    implementation: [
      "Definición de campos comerciales y estructura del PDF.",
      "Diseño del flujo de cotización desde formulario hasta documento.",
      "Desarrollo del generador PDF y validación de datos.",
      "Pruebas con distintos escenarios de servicios y condiciones.",
    ],
    outcomes: [
      "Las cotizaciones quedaron más consistentes y profesionales.",
      "El equipo redujo tareas repetitivas al generar propuestas.",
      "La información comercial quedó mejor ordenada para seguimiento posterior.",
    ],
    kpis: [
      "Cotizaciones generadas por periodo.",
      "Solicitudes recibidas.",
      "Estados de propuesta.",
      "Servicios más cotizados.",
    ],
    notes: ["Caso anonimizado; no se publican valores, clientes ni condiciones comerciales internas."],
    relatedServices: ["desarrollo-web-chile", "landing-pages-para-empresas"],
    relatedPages: [
      { label: "Cotizador web con PDF", href: "/cotizador-web-pdf" },
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Cotizar herramienta", href: "/contacto?caso=cotizaciones-pdf" },
    ],
  },
  {
    slug: "control-documentacion-flota-permisos-rtg-soap",
    title: "Caso anónimo: control de documentación de flota, permisos, RTG y SOAP",
    metaTitle: "Caso documentación de flota | Permisos, RTG y SOAP",
    metaDescription:
      "Caso anónimo de sistema para controlar documentación de flota: permisos, revisión técnica, RTG, SOAP, vencimientos y alertas operativas.",
    summary:
      "Sistema para ordenar documentación de flota, fechas de vencimiento y estados de permisos críticos para continuidad operativa.",
    clientProfile: "Empresa con vehículos, documentos recurrentes y necesidad de seguimiento preventivo",
    location: "Chile",
    industry: "Transporte, flota y cumplimiento operativo",
    publishedAt: "2026-05-19",
    challenge:
      "La documentación de flota se controlaba de forma dispersa, aumentando el riesgo de vencimientos no detectados en permisos, revisión técnica, RTG, SOAP y otros documentos relevantes.",
    objectives: [
      "Centralizar documentos por vehículo o unidad.",
      "Controlar vencimientos y estados críticos.",
      "Facilitar revisión administrativa de permisos y documentación.",
      "Crear base para alertas, reportes y continuidad operacional.",
    ],
    solution: [
      "Sistema web para registrar documentación de flota.",
      "Campos por tipo de documento, fecha, estado y observación.",
      "Panel de vencimientos y pendientes de actualización.",
      "Base escalable para alertas y carga de archivos según alcance.",
    ],
    implementation: [
      "Levantamiento de documentos críticos por tipo de vehículo.",
      "Diseño de estructura para permisos, RTG, SOAP y revisiones.",
      "Desarrollo de panel de control por unidad y vencimiento.",
      "Pruebas con escenarios de renovación y revisión administrativa.",
    ],
    outcomes: [
      "La documentación quedó centralizada y más fácil de auditar.",
      "El equipo obtuvo mejor visibilidad de vencimientos próximos.",
      "La empresa redujo riesgo operativo asociado a documentos desordenados.",
    ],
    kpis: [
      "Documentos vigentes y vencidos.",
      "Vencimientos próximos por periodo.",
      "Unidades con documentación incompleta.",
      "Tipos de documentos pendientes de actualización.",
    ],
    notes: ["Caso anonimizado; no se publican patentes, documentos ni fechas reales del cliente."],
    relatedServices: ["desarrollo-web-chile"],
    relatedPages: [
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Automatización", href: "/automatizacion" },
      { label: "Contacto", href: "/contacto?caso=documentacion-flota" },
    ],
  },
];

export function getCaseStudyBySlug(slug: string) {
  return caseStudies.find((caseStudy) => caseStudy.slug === slug);
}

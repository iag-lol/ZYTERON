import type { AddonId, PlanId } from "@/config/pricing";

export type ExtraDefinition = {
  id: AddonId;
  days: number;
  scope: string;
  excludes: string;
  category?: string;
  max?: number;
  plans?: PlanId[];
  conflicts?: AddonId[];
  covers?: AddonId[];
};

const shop: PlanId[] = ["catalogo", "ecommerce"];
const ecommerce: PlanId[] = ["ecommerce"];
const provider =
  " El cliente aporta una cuenta habilitada, permisos y documentación vigente del proveedor.";

export const EXTRA_DEFINITIONS: ExtraDefinition[] = [
  {
    id: "domainSetup",
    days: 1,
    scope:
      "Conexión de un dominio adicional o hasta 2 subdominios al sitio, hasta 10 registros DNS y validación de HTTPS y redirecciones. El dominio principal ya está contemplado en el plan base.",
    excludes:
      "Registro o renovación del dominio, compra del nombre, hosting y recuperación de titularidad.",
    conflicts: ["domainMigration"],
  },
  {
    id: "domainMigration",
    days: 3,
    scope:
      "Traslado técnico de un dominio existente entre proveedores, inventario y réplica de hasta 20 registros DNS, coordinación de una ventana de cambio y validación del sitio y correo." +
      provider,
    excludes:
      "Compra, renovación, tarifa de transferencia del registrador, recuperación de accesos o garantía de disponibilidad de proveedores. No migra buzones.",
    covers: ["domainSetup"],
  },
  {
    id: "hostingSetup",
    days: 3,
    scope:
      "Configuración de un ambiente de pruebas adicional a producción en el hosting compatible del cliente, variables de entorno separadas, HTTPS y un flujo documentado para publicar cambios.",
    excludes:
      "Mensualidad, servidor dedicado, licencias, alta disponibilidad, administración continua y migración de otra aplicación.",
  },
  {
    id: "emailSetup5",
    days: 2,
    scope:
      "Alta de hasta 5 buzones y 5 alias en un dominio y un proveedor; registros MX, SPF y DKIM, política DMARC inicial y prueba de envío y recepción. Una guía de acceso.",
    excludes:
      "Licencias o espacio de buzones, compra del dominio, dispositivos presenciales y traslado de mensajes antiguos.",
    conflicts: ["emailSetup15"],
  },
  {
    id: "emailSetup15",
    days: 4,
    scope:
      "Alta de hasta 15 buzones y 15 alias en un dominio y un proveedor; MX, SPF y DKIM, política DMARC inicial y pruebas de envío y recepción. Una guía de acceso.",
    excludes:
      "Licencias o espacio de buzones, compra del dominio, dispositivos presenciales y traslado de mensajes antiguos.",
    conflicts: ["emailSetup5"],
  },
  {
    id: "emailMigration",
    days: 5,
    scope:
      "Migración por IMAP de hasta 5 buzones, con máximo 5 GB de mensajes por buzón, entre dos proveedores compatibles; inventario, una pasada de copia y validación por muestreo.",
    excludes:
      "Licencias, mensajes eliminados o inaccesibles, contactos, calendarios, archivos locales PST y recuperación de contraseñas. Requiere buzones de destino activos.",
  },
  {
    id: "transactionalEmail",
    days: 4,
    scope:
      "Conexión con un proveedor de correo transaccional, autenticación de un dominio y hasta 3 plantillas automáticas ligadas a eventos del sitio; registro de envío y prueba de entrega.",
    excludes:
      "Consumo, licencia, campañas masivas, bandeja de correo, garantía de llegada a la carpeta principal y funciones que originan los eventos.",
  },
  {
    id: "newsletterSetup",
    days: 3,
    scope:
      "Formulario de suscripción con consentimiento, una lista de audiencia y una plantilla reutilizable en una plataforma de email marketing; prueba y guía para enviar campañas.",
    excludes:
      "Plan de la plataforma, base de destinatarios, compra de contactos, redacción y envío o administración mensual de campañas.",
  },
  {
    id: "whatsappTemplateSetup",
    days: 8,
    scope:
      "Conexión de un número con WhatsApp Business Platform y hasta 3 plantillas para 2 eventos existentes del sitio; registro de estado, reintento acotado y prueba con un destinatario autorizado." +
      provider,
    excludes:
      "Verificación del negocio, aprobación de Meta, consumo de mensajes, campañas, atención humana, chatbot y soporte mensual. Requiere consentimiento del destinatario.",
  },
  {
    id: "faqChatbot",
    days: 4,
    scope:
      "Chat guiado por opciones con hasta 20 preguntas y respuestas aportadas, 3 rutas de conversación y derivación a WhatsApp o formulario. Instalación en el sitio.",
    excludes:
      "Inteligencia artificial generativa, lectura de datos privados, cotizaciones dinámicas, atención humana y WhatsApp API.",
  },
  {
    id: "calendarEmbed",
    days: 2,
    scope:
      "Integración de un calendario público de Google, Microsoft o una herramienta de agenda mediante el mecanismo de inserción del proveedor; adaptación móvil y prueba de visualización.",
    excludes:
      "Agenda propia, sincronización por API, cobros, cuentas del proveedor y edición del calendario desde la web.",
  },
  {
    id: "calendarSync",
    days: 6,
    scope:
      "Conexión por API con un calendario de Google o Microsoft para crear y actualizar eventos desde hasta 2 acciones existentes de la web; autorización y registro de errores." +
      provider,
    excludes:
      "Motor de reservas, licencias, múltiples organizaciones, sincronización de contactos y migración de eventos históricos.",
  },
  {
    id: "booking",
    days: 10,
    category: "Calendarios y reservas",
    scope:
      "Agenda propia para un servicio y hasta 3 profesionales: horarios semanales, cupos, bloqueo de fechas, solicitud de reserva, cancelación y 2 avisos por correo. Panel protegido para la agenda.",
    excludes:
      "Pagos, sincronización externa, múltiples sedes, turnos clínicos, ficha médica, recordatorios SMS o WhatsApp y licencias de terceros.",
  },
  {
    id: "eventRegistration",
    days: 6,
    scope:
      "Listado administrable de hasta 10 eventos activos, formulario de inscripción de hasta 8 campos, cupos, correo de confirmación y exportación CSV de inscritos; acceso administrativo protegido.",
    excludes:
      "Venta de entradas, QR de acceso, numeración de asientos, certificados, videotransmisión y consumo de correo.",
  },
  {
    id: "databaseBasic",
    days: 6,
    scope:
      "Diseño e implementación de una base relacional para hasta 3 entidades, 10 campos por entidad y 3 relaciones; validaciones, restricciones y acceso exclusivo desde el backend. Diagrama y guía de conexión.",
    excludes:
      "Panel de edición, carga histórica, reportes, hosting, capacidad contratada, respaldos administrados y garantía de usuarios simultáneos.",
    conflicts: ["databaseMedium", "databaseAdvanced"],
  },
  {
    id: "databaseMedium",
    days: 10,
    scope:
      "Base relacional para hasta 8 entidades, 15 campos por entidad y 10 relaciones; migraciones versionadas, índices para hasta 5 consultas y acceso restringido por backend. Diagrama y diccionario de datos.",
    excludes:
      "Panel de edición, carga histórica, reportes visuales, hosting, operación mensual y garantía de usuarios simultáneos.",
    conflicts: ["databaseBasic", "databaseAdvanced"],
  },
  {
    id: "databaseAdvanced",
    days: 18,
    scope:
      "Base relacional para hasta 15 entidades, 20 campos por entidad y 25 relaciones; transacciones en 3 operaciones, 10 consultas indexadas, políticas de acceso por registro y prueba de restauración. Diagrama, diccionario y migraciones.",
    excludes:
      "Panel de edición, big data, alta disponibilidad, réplicas, datos clínicos o financieros regulados, licencias e infraestructura. No implica capacidad ilimitada.",
    conflicts: ["databaseBasic", "databaseMedium"],
  },
  {
    id: "dataImport",
    days: 5,
    scope:
      "Importación inicial de hasta 5.000 filas en 3 tablas existentes, desde un CSV por tabla; mapeo de hasta 15 columnas, validación y reporte de registros rechazados.",
    excludes:
      "Creación de la base o tablas de destino, limpieza manual, extracción de un sistema cerrado, adjuntos y cargas periódicas.",
  },
  {
    id: "csvImport",
    days: 5,
    scope:
      "Pantalla protegida para cargar un tipo de archivo CSV de hasta 5 MB y 2.000 filas por carga en una tabla existente; vista previa, validación de hasta 15 columnas y reporte de errores.",
    excludes:
      "Creación del modelo de datos, fórmulas Excel, múltiples formatos, sincronización programada y procesamiento de archivos mayores.",
  },
  {
    id: "backupSetup",
    days: 4,
    scope:
      "Configuración de respaldo diario de una base de hasta 5 GB, retención de 7 copias en almacenamiento del cliente y una prueba de restauración en un ambiente aislado. Guía de recuperación.",
    excludes:
      "Almacenamiento, respaldo de buzones, supervisión continua, recuperación de datos ya perdidos y compromiso de tiempo de recuperación.",
  },
  {
    id: "fileUploads",
    days: 6,
    scope:
      "Carga y descarga privada de PDF, JPG y PNG, hasta 10 MB por archivo y 3 archivos por registro de un módulo existente; validación de formato y acceso mediante enlaces temporales.",
    excludes:
      "Escaneo antivirus contratado, firma digital, OCR, edición de archivos, capacidad de almacenamiento y creación del módulo de negocio.",
  },
  {
    id: "userLogin",
    days: 7,
    category: "Seguridad y acceso",
    scope:
      "Registro y acceso con correo y contraseña, verificación de correo, recuperación de clave y cierre de sesión para un tipo de usuario. Incluye almacenamiento de identidad y protección de rutas.",
    excludes:
      "Área privada con funciones de negocio, SSO, segundo factor, múltiples roles y consumo de correo.",
  },
  {
    id: "clientArea",
    days: 10,
    category: "Gestión y automatización",
    scope:
      "Área privada con registro, verificación y recuperación de acceso; perfil editable y consulta de hasta 2 listados propios de módulos existentes. Hasta 3 pantallas privadas.",
    excludes:
      "Creación de los módulos o bases de negocio, cobros recurrentes, chat privado, firma electrónica y roles de empresa.",
    covers: ["userLogin"],
  },
  {
    id: "miniAdminPanel",
    days: 10,
    category: "Gestión y automatización",
    scope:
      "Panel protegido con acceso de administrador y hasta 2 módulos CRUD, 10 campos por módulo, búsqueda y paginación. Incluye almacenamiento de esos módulos y recuperación de acceso.",
    excludes:
      "Roles personalizados, reportes, integraciones externas y administración de todos los módulos de la web.",
    covers: ["userLogin"],
    conflicts: ["fullAdminPanel"],
  },
  {
    id: "fullAdminPanel",
    days: 20,
    category: "Gestión y automatización",
    scope:
      "Panel protegido con hasta 6 módulos CRUD de 15 campos, 3 perfiles de permisos, filtros y exportación CSV en 2 módulos. Incluye el modelo de datos de esos módulos y gestión de acceso.",
    excludes:
      "ERP completo, contabilidad, recursos humanos, multisucursal, integraciones y pantallas fuera de los 6 módulos definidos.",
    covers: ["miniAdminPanel", "userLogin", "roles"],
    conflicts: ["miniAdminPanel"],
  },
  {
    id: "roles",
    days: 7,
    category: "Seguridad y acceso",
    scope:
      "Hasta 3 roles con permisos de lectura, creación, edición y eliminación en hasta 5 módulos existentes. Matriz de permisos y comprobación en el backend; incluye acceso por correo si el sitio no lo tiene.",
    excludes:
      "Creación de los módulos, permisos por empresa, delegación temporal y reglas de autorización por cada registro.",
    covers: ["userLogin"],
  },
  {
    id: "auditLog",
    days: 7,
    category: "Seguridad y acceso",
    scope:
      "Historial de creación, edición y eliminación en hasta 3 módulos existentes: fecha, usuario y acción; consulta protegida por fecha y usuario, con retención configurada de 90 días.",
    excludes:
      "Monitoreo de equipos, historial anterior a la instalación, certificación forense, almacenamiento y captura de contraseñas o secretos.",
  },
  {
    id: "approvals",
    days: 10,
    category: "Gestión y automatización",
    scope:
      "Un flujo de hasta 3 etapas para un tipo de solicitud, aprobador por etapa, aceptar o rechazar con comentario e historial. Incluye formulario de hasta 10 campos y acceso de participantes.",
    excludes:
      "Firma electrónica, múltiples flujos, delegaciones, ERP y reglas condicionales distintas de las 3 etapas.",
    covers: ["userLogin"],
  },
  {
    id: "docManagement",
    days: 12,
    category: "Bases de datos y archivos",
    scope:
      "Repositorio privado con hasta 5 categorías, archivos PDF/JPG/PNG de hasta 10 MB, descripción, búsqueda por nombre y 2 perfiles: administrador y lector. Incluye acceso de usuarios.",
    excludes:
      "OCR, firma electrónica, editor de documentos, versionado colaborativo, carga histórica y almacenamiento del proveedor.",
    covers: ["userLogin"],
  },
  {
    id: "customApi",
    days: 8,
    scope:
      "API REST de hasta 5 endpoints para consultar o crear datos en hasta 2 módulos existentes, autenticación mediante token, validación y documentación con ejemplos.",
    excludes:
      "Creación de los módulos de negocio, APIs de terceros, streaming, certificaciones y soporte a consumidores externos.",
  },
  {
    id: "crm",
    days: 8,
    scope:
      "Envío de contactos de un formulario existente a un CRM con API pública documentada, hasta 10 campos y una etapa de negocio; registro de errores, reintento acotado y prueba de recepción." +
      provider,
    excludes:
      "Licencia del CRM, sincronización bidireccional, migración histórica, múltiples embudos y automatizaciones comerciales adicionales.",
  },
  {
    id: "erp",
    days: 15,
    scope:
      "Integración unidireccional de un tipo de registro con un ERP que cuente con API REST pública documentada; hasta 15 campos, una frecuencia programada y registro de errores." +
      provider,
    excludes:
      "Licencia y modificaciones del ERP, ingeniería inversa, DTE, certificación SII, múltiples empresas y conciliación contable.",
  },
  {
    id: "workspace",
    days: 10,
    scope:
      "Conexión de una organización Google Workspace o Microsoft 365 con hasta 2 operaciones por API, elegidas entre lectura de directorio, creación de evento y envío de correo; permisos y prueba documentada." +
      provider,
    excludes:
      "Licencias, administración continua del tenant, SSO, migración de correo y funcionalidades de negocio fuera de esas 2 operaciones.",
  },
  {
    id: "webhooks",
    days: 6,
    scope:
      "Hasta 2 webhooks entre el sitio y un proveedor: validación de firma cuando esté disponible, un formato de datos por webhook, registro de estado y hasta 3 reintentos.",
    excludes:
      "Suscripción del proveedor, colas de alto volumen, procesamiento masivo, conciliación financiera y creación de módulos de negocio.",
  },
  {
    id: "googleSheets",
    days: 4,
    scope:
      "Envío unidireccional de un formulario existente a una hoja Google Sheets, hasta 15 columnas y una cuenta de servicio; validación y prueba de registro.",
    excludes:
      "Licencias, sincronización bidireccional, fórmulas, limpieza histórica y uso de la planilla como base transaccional.",
  },
  {
    id: "mapsLocations",
    days: 3,
    scope:
      "Mapa interactivo con hasta 20 ubicaciones aportadas, ficha con dirección y teléfono, filtro por región y enlace para abrir indicaciones.",
    excludes:
      "Consumo de mapas, geocodificación masiva, ubicación de vehículos, optimización de rutas y seguimiento GPS.",
  },
  {
    id: "videoMeetings",
    days: 4,
    scope:
      "Generación de un enlace de Google Meet o Microsoft Teams al confirmar un evento existente, para una cuenta organizadora; inclusión del enlace en el correo de confirmación." +
      provider,
    excludes:
      "Licencias, agenda de reservas, grabación, transcripción, plataforma propia de video y administración de reuniones.",
  },
  {
    id: "stock",
    days: 8,
    category: "Tienda y productos",
    plans: ["catalogo"],
    scope:
      "Stock por producto en un catálogo existente: entradas y salidas manuales, saldo disponible, alerta por mínimo y registro de movimientos en una bodega.",
    excludes:
      "Multibodega, lotes, series, inventario valorizado, código de barras y sincronización con ERP.",
  },
  {
    id: "logistics",
    days: 6,
    category: "Ventas y pagos",
    plans: ecommerce,
    scope:
      "Conexión con un transportista que disponga de API pública: cotización desde un origen a una dirección chilena, registro del número de seguimiento y enlace de consulta." +
      provider,
    excludes:
      "Contrato del transportista, costo de envíos, emisión masiva de etiquetas, retiros automáticos y múltiples proveedores.",
  },
  {
    id: "cartRecovery",
    days: 7,
    category: "Ventas y pagos",
    plans: ecommerce,
    scope:
      "Registro de carritos identificados y una secuencia de hasta 2 correos con enlace para retomar el carrito; exclusión de pedidos pagados y opción de dejar de recibir avisos.",
    excludes:
      "Consumo de correo, WhatsApp, seguimiento entre dispositivos sin identificar y garantía de recuperación de ventas.",
  },
  {
    id: "productVariants",
    days: 5,
    plans: ecommerce,
    scope:
      "Hasta 2 atributos por producto, 20 combinaciones por producto y stock y precio por variante. Configuración inicial en hasta 10 productos con datos aportados.",
    excludes:
      "Configuradores visuales, personalización por medidas, listas de materiales e integración con ERP.",
  },
  {
    id: "wishList",
    days: 3,
    plans: shop,
    scope:
      "Lista de hasta 50 productos favoritos por navegador, con agregar, quitar y enlace a la ficha del producto.",
    excludes:
      "Sincronización entre dispositivos, cuentas de usuario, compartir listas y alertas de precio.",
  },
  {
    id: "productReviews",
    days: 4,
    plans: ecommerce,
    scope:
      "Reseñas de texto y puntuación de 1 a 5 asociadas a una compra confirmada; aprobación administrativa y promedio visible en la ficha.",
    excludes:
      "Importación de reseñas, reseñas de Google, archivos, incentivos y moderación continua.",
  },
  {
    id: "volumePricing",
    days: 5,
    plans: ecommerce,
    scope:
      "Hasta 3 tramos de precio según cantidad de una misma referencia, configurables en hasta 20 productos; cálculo en carrito y comprobación del total en servidor.",
    excludes:
      "Precios por cliente, contratos B2B, combinación entre referencias, promociones acumulables y ERP.",
  },
  {
    id: "digitalDownloads",
    days: 7,
    plans: ecommerce,
    scope:
      "Entrega privada de un archivo PDF o ZIP de hasta 50 MB por producto, tras pago confirmado; enlace temporal, hasta 3 descargas y carga inicial de 10 productos digitales.",
    excludes:
      "Almacenamiento, DRM, licencias de software, video en streaming, cursos y venta por suscripción.",
  },
  {
    id: "quoteCalculator",
    days: 10,
    scope:
      "Cotizador manual de un servicio, hasta 15 opciones, 5 reglas de cálculo, subtotal e IVA; envío del resumen por correo y una plantilla PDF de hasta 3 páginas. Tarifas aportadas por el cliente.",
    excludes:
      "Inteligencia artificial, consulta de precios de mercado, pagos, cuenta de clientes, inventario y reglas fuera de las 5 definidas.",
  },
  {
    id: "serviceRequests",
    days: 8,
    scope:
      "Formulario de solicitud de hasta 10 campos, código de seguimiento, 5 estados y consulta mediante un enlace privado; panel protegido y 2 notificaciones por correo.",
    excludes: "Asignación geográfica, pagos, GPS, adjuntos, firma y consumo de correo.",
  },
  {
    id: "ticketDesk",
    days: 12,
    scope:
      "Mesa de ayuda con acceso de clientes y hasta 3 agentes, creación de tickets, prioridad, 4 estados, respuestas de texto y 3 avisos por correo. Panel y almacenamiento de tickets incluidos.",
    excludes:
      "Atención humana, SLA de soporte, chat en vivo, adjuntos, WhatsApp y licencias de proveedores.",
    covers: ["userLogin"],
  },
  {
    id: "jobBoard",
    days: 7,
    scope:
      "Publicación administrable de hasta 20 vacantes activas y postulación con hasta 8 campos y un CV PDF de hasta 5 MB; listado protegido de postulantes y exportación CSV.",
    excludes:
      "Evaluaciones psicométricas, IA de selección, portales de empleo externos y almacenamiento del proveedor.",
  },
  {
    id: "surveyBuilder",
    days: 5,
    scope:
      "Una encuesta de hasta 15 preguntas, opciones simples y texto; validación de respuesta, cierre por fecha y panel protegido con conteos y exportación CSV.",
    excludes:
      "Constructor ilimitado de encuestas, análisis estadístico avanzado, autenticación de encuestados y datos especialmente sensibles.",
  },
  {
    id: "emailSequences",
    days: 6,
    scope:
      "Una secuencia de hasta 3 correos a contactos que dieron consentimiento, con 2 condiciones de avance y un disparador existente del sitio; registro de envíos y baja.",
    excludes:
      "Consumo, licencias, redacción, campañas mensuales, compra de contactos y garantía de conversión.",
  },
  {
    id: "leadScoring",
    days: 5,
    scope:
      "Calificación de contactos de un formulario con hasta 5 reglas por respuesta, 3 niveles de prioridad y asignación a hasta 3 destinatarios; resumen por correo.",
    excludes: "IA predictiva, enriquecimiento de datos externos, CRM y equipo de ventas.",
  },
  {
    id: "faqAccordion",
    days: 2,
    scope:
      "Sección administrable de preguntas frecuentes, hasta 5 categorías y carga de 20 preguntas y respuestas aportadas; apertura accesible por teclado y adaptación móvil.",
    excludes: "Redacción, chatbot, respuestas con IA y administración recurrente.",
  },
  {
    id: "testimonials",
    days: 2,
    scope:
      "Sección administrable de testimonios con nombre autorizado, empresa y texto; carga inicial de 10 testimonios aportados y aprobados por el cliente.",
    excludes:
      "Obtención de testimonios, importación automática de Google y verificación de identidad de sus autores.",
  },
  {
    id: "portfolio",
    days: 4,
    scope:
      "Portafolio administrable con título, categoría, descripción y hasta 6 imágenes por proyecto; carga inicial de 10 proyectos aportados y filtro por categoría.",
    excludes: "Redacción, fotografía, video y casos con datos no autorizados por sus titulares.",
  },
  {
    id: "contentEditor",
    days: 7,
    scope:
      "Panel protegido para editar textos e imágenes de hasta 6 páginas existentes, con hasta 5 bloques predefinidos por página, vista previa y publicación.",
    excludes:
      "Constructor libre de páginas, cambio de estructura, nuevas funciones, traducciones y rediseño.",
  },
  {
    id: "cookieConsent",
    days: 3,
    scope:
      "Panel de preferencias con categorías necesarias, analítica y marketing; bloqueo de hasta 5 etiquetas opcionales antes de consentir y mecanismo para cambiar la elección.",
    excludes:
      "Asesoría jurídica, redacción de políticas, certificación de cumplimiento y auditoría de proveedores externos.",
  },
  {
    id: "twoFactor",
    days: 6,
    scope:
      "Segundo factor TOTP en una autenticación existente compatible: alta por aplicación autenticadora, verificación y códigos de recuperación para un tipo de usuario.",
    excludes:
      "Creación del login, SMS, biometría, llaves físicas y recuperación de cuentas sin códigos.",
  },
  {
    id: "securityHardening",
    days: 6,
    scope:
      "Revisión de hasta 10 rutas del sitio: cabeceras, validación de entradas, permisos, sesiones y límites de solicitudes; corrección de hasta 5 hallazgos de esa revisión e informe de resultados.",
    excludes:
      "Pentest certificado, auditoría de infraestructura, eliminación de malware preexistente y garantía de ausencia total de vulnerabilidades.",
  },
  {
    id: "accessibilityReview",
    days: 5,
    scope:
      "Revisión de hasta 10 páginas con pruebas automáticas y navegación por teclado; corrección de hasta 10 hallazgos de contraste, etiquetas, foco y estructura del proyecto, con informe.",
    excludes:
      "Certificación de conformidad, auditoría exhaustiva WCAG, interpretación jurídica y corrección de herramientas externas.",
  },
  {
    id: "dashboardReports",
    days: 9,
    category: "Reportes y documentos",
    scope:
      "Panel protegido con hasta 6 indicadores, 3 gráficos y filtros por fecha y un estado, sobre hasta 3 tablas existentes; definición de fórmulas y guía de uso.",
    excludes:
      "Creación o limpieza de fuentes de datos, inteligencia de negocios empresarial, predicciones y datos externos.",
  },
  {
    id: "lookerDashboard",
    days: 6,
    scope:
      "Un informe Looker Studio de hasta 3 páginas, 8 indicadores y 4 gráficos; conexión con una propiedad GA4 o una hoja Google Sheets y guía de acceso.",
    excludes:
      "Conectores pagados, licencias, creación de fuentes, data warehouse y actualización manual mensual.",
  },
];

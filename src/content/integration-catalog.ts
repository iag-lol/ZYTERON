export type IntegrationPlatform = {
  id: string;
  name: string;
  use: string;
  docs: string;
  logo: string;
  requirement?: string;
};

export type IntegrationGroup = {
  id: string;
  name: string;
  description: string;
  requirement: string;
  platforms: IntegrationPlatform[];
};

export const integrationGroups: IntegrationGroup[] = [
  {
    id: "publico",
    name: "Servicios públicos y datos en Chile",
    description:
      "Evalúa procesos tributarios y consultas de información pública con las vías oficiales de cada institución.",
    requirement:
      "La facturación exige los requisitos del SII. La API de Mercado Público entrega consultas; no implica presentar ofertas ni acceso a sistemas internos.",
    platforms: [
      {
        id: "sii",
        name: "SII · Servicio de Impuestos Internos",
        use: "Boletas, facturas, notas de crédito y otros DTE; manejo de folios, certificados y estados mediante una solución habilitada.",
        docs: "https://www.sii.cl/servicios_online/1039-1182.html",
        logo: "sii.jpg",
        requirement:
          "Requiere habilitación del contribuyente, certificado digital, folios y certificación según el documento y la solución utilizada. El SII no se presenta como un conector libre o una alianza comercial.",
      },
      {
        id: "mercadopublico",
        name: "ChileCompra · Mercado Público",
        use: "Consulta de licitaciones y órdenes de compra según cobertura de la API.",
        docs: "https://www.chilecompra.cl/api/",
        logo: "mercadopublico.png",
      },
      {
        id: "claveunica",
        name: "ClaveÚnica",
        use: "Inicio de sesión con identidad estatal para sistemas de instituciones habilitadas.",
        docs: "https://www.claveunica.gob.cl/instituciones",
        logo: "claveunica.svg",
        requirement:
          "La integración requiere elegibilidad y autorización de Gobierno Digital. Su disponibilidad no se ofrece de forma general a cualquier empresa privada.",
      },
      {
        id: "bcentral",
        name: "Banco Central de Chile",
        use: "Series económicas oficiales, como UF y dólar observado, para reportes y procesos que requieren indicadores actualizados.",
        docs: "https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/index_API_sec1_es.htm",
        logo: "bcentral.png",
        requirement:
          "Requiere una cuenta BDE con acceso API habilitado, autenticación y cumplimiento de las condiciones de uso y atribución de los datos.",
      },
    ],
  },
  {
    id: "firmas",
    name: "Firmas electrónicas y documentos",
    description:
      "Conecta contratos, autorizaciones y aprobaciones con un flujo de firma y seguimiento documental.",
    requirement:
      "Se valida el tipo de firma, la identidad del firmante, el documento y el servicio contratado. La disponibilidad de firma avanzada depende del prestador y su habilitación; FirmaGob exige una institución pública habilitada.",
    platforms: [
      {
        id: "firmavirtual",
        name: "FirmaVirtual",
        use: "Creación de documentos, definición de firmantes, seguimiento y descarga de documentos firmados.",
        docs: "https://firmavirtual.legal/servicios/api-firma-electronica",
        logo: "firmavirtual.png",
        requirement:
          "Requiere acceso API contratado, token y definición del tipo de firma o trámite disponible para cada documento.",
      },
      {
        id: "ecert",
        name: "Ecert · e-certchile",
        use: "Firma avanzada online, firma simple certificada y soluciones de identidad mediante los servicios corporativos habilitados.",
        docs: "https://www.ecertla.com/soluciones/integraciones/",
        logo: "ecert.png",
      },
      {
        id: "autentia",
        name: "Autentia",
        use: "Flujos de firma electrónica y verificación de identidad mediante los servicios de integración del proveedor.",
        docs: "https://www.autentia.cl/",
        logo: "autentia.svg",
        requirement:
          "El proveedor debe confirmar el producto, los mecanismos de firma, las credenciales y el acceso a su documentación de integración.",
      },
      {
        id: "docusign",
        name: "Docusign",
        use: "Envío de documentos a firma, seguimiento de sobres, plantillas y recuperación de acuerdos firmados.",
        docs: "https://developers.docusign.com/docs/esign-rest-api/",
        logo: "docusign.svg",
      },
      {
        id: "adobesign",
        name: "Adobe Acrobat Sign",
        use: "Acuerdos, formularios de firma, avisos de estado y descarga de documentos y trazas de auditoría.",
        docs: "https://developer.adobe.com/acrobat-sign/docs/overview/developer_guide/",
        logo: "adobesign.svg",
        requirement:
          "La API requiere el licenciamiento y los permisos de Adobe Acrobat Sign. Se valida la modalidad de integración y uso de cada cuenta.",
      },
      {
        id: "signaturit",
        name: "Signaturit",
        use: "Envío de solicitudes de firma y seguimiento del proceso documental mediante su API.",
        docs: "https://help.signaturit.com/hc/es/articles/115001596865-Empezar-con-la-integraci%C3%B3n-de-la-API",
        logo: "signaturit.png",
        requirement:
          "Se valida el plan API de producción, el mecanismo de identificación y el tipo de firma requerido para el documento en Chile.",
      },
      {
        id: "firmagob",
        name: "FirmaGob",
        use: "Firma de documentos oficiales con certificados y aplicaciones de instituciones públicas habilitadas.",
        docs: "https://firma.gob.cl/biblioteca/manuales-firmagob/manual-api-firma/",
        logo: "firmagob.png",
        requirement:
          "Exclusivo de instituciones públicas habilitadas y funcionarios autorizados. Requiere el procedimiento y las credenciales de FirmaGob.",
      },
    ],
  },
  {
    id: "redes",
    name: "Meta y redes sociales",
    description:
      "Relaciona consultas, contenido y conversaciones con la atención y gestión comercial de tu empresa.",
    requirement:
      "Requiere cuentas empresariales, permisos aprobados y, cuando corresponde, revisión de la aplicación. Cada red limita los datos, acciones y tipos de cuenta disponibles.",
    platforms: [
      {
        id: "meta",
        name: "Meta",
        use: "Conexión con activos empresariales y servicios del ecosistema Meta mediante Graph API y permisos autorizados.",
        docs: "https://developers.facebook.com/docs/graph-api/",
        logo: "meta.svg",
      },
      {
        id: "instagram",
        name: "Instagram",
        use: "Publicación y lectura de métricas de cuentas profesionales, según permisos y productos de la API.",
        docs: "https://developers.facebook.com/docs/instagram-platform/",
        logo: "instagram.svg",
      },
      {
        id: "facebook",
        name: "Facebook Pages",
        use: "Gestión de contenido y datos autorizados de páginas para acompañar la presencia y atención de la empresa.",
        docs: "https://developers.facebook.com/docs/pages-api/",
        logo: "facebook.svg",
      },
      {
        id: "messenger",
        name: "Messenger",
        use: "Mensajes y eventos de conversaciones de una página conectados con un flujo de atención.",
        docs: "https://developers.facebook.com/docs/messenger-platform/",
        logo: "messenger.svg",
      },
      {
        id: "linkedin",
        name: "LinkedIn",
        use: "Publicaciones y datos de páginas empresariales mediante los productos y permisos de la plataforma.",
        docs: "https://learn.microsoft.com/en-us/linkedin/marketing/",
        logo: "linkedin.svg",
        requirement:
          "LinkedIn restringe productos y niveles de acceso. La integración requiere aprobación y permisos del administrador; no incluye extracción masiva de perfiles.",
      },
      {
        id: "tiktok",
        name: "TikTok for Business",
        use: "Datos y funciones de marketing disponibles para las cuentas y aplicaciones empresariales autorizadas.",
        docs: "https://business-api.tiktok.com/portal/docs",
        logo: "tiktok.svg",
        requirement:
          "Requiere acceso a los productos de TikTok for Business, autorización de la cuenta y cumplimiento de sus políticas. Funciones y países disponibles se validan por producto.",
      },
    ],
  },
  {
    id: "pagos",
    name: "Pagos y recaudación",
    description:
      "Conecta la venta con la confirmación del pago y el seguimiento del pedido o servicio.",
    requirement:
      "Requiere cuenta de comercio, credenciales y habilitación del proveedor. Las comisiones se contratan por separado.",
    platforms: [
      {
        id: "transbank",
        name: "Transbank · Webpay Plus",
        use: "Pagos online con tarjetas y confirmación de transacciones.",
        docs: "https://www.transbankdevelopers.cl/documentacion/webpay-plus",
        logo: "transbank.svg",
      },
      {
        id: "mercadopago",
        name: "Mercado Pago",
        use: "Checkout, estados de pago y notificaciones de cobro.",
        docs: "https://www.mercadopago.cl/developers/es/reference",
        logo: "mercadopago.svg",
      },
      {
        id: "flow",
        name: "Flow",
        use: "Órdenes de pago, cobros y suscripciones según servicio.",
        docs: "https://developers.flow.cl/",
        logo: "flow.svg",
      },
      {
        id: "khipu",
        name: "Khipu",
        use: "Cobros por transferencia y consulta del estado del pago.",
        docs: "https://docs.khipu.com/",
        logo: "khipu.svg",
      },
      {
        id: "getnet",
        name: "Getnet",
        use: "Web Checkout para pagos con tarjeta, confirmación del cobro y consulta de transacciones.",
        docs: "https://www.getnet.cl/developers",
        logo: "getnet.webp",
        requirement:
          "Requiere contratación de Web Checkout, pruebas y validación de la integración antes de obtener llaves productivas.",
      },
      {
        id: "payku",
        name: "Payku",
        use: "Creación de cobros y consulta de estados para relacionar cada pago con tu venta o servicio.",
        docs: "https://docs.payku.cl/",
        logo: "payku.svg",
      },
      {
        id: "toku",
        name: "Toku",
        use: "Deudas, clientes y recaudación recurrente para servicios que necesitan seguimiento de cobranza.",
        docs: "https://docs.trytoku.com/",
        logo: "toku.png",
      },
      {
        id: "fintoc",
        name: "Fintoc",
        use: "Pagos por transferencia y notificaciones para conciliar cobros con órdenes o cuentas por cobrar.",
        docs: "https://docs.fintoc.com/",
        logo: "fintoc.svg",
      },
      {
        id: "reveniu",
        name: "Reveniu",
        use: "Planes de suscripción, cobros recurrentes y estados del ciclo de pago conectados con tu aplicación.",
        docs: "https://docs.reveniu.com/",
        logo: "reveniu.svg",
      },
      {
        id: "paypal",
        name: "PayPal",
        use: "Órdenes y estados de pagos internacionales mediante las APIs de la cuenta de comercio.",
        docs: "https://developer.paypal.com/docs/api/overview/",
        logo: "paypal.svg",
        requirement:
          "Se revisan disponibilidad del producto para la cuenta chilena, divisas, comisiones y habilitación del comercio.",
      },
    ],
  },
  {
    id: "erp",
    name: "ERP, contabilidad y facturación",
    description:
      "Evita duplicar registros entre la web, la administración, el inventario y los documentos de venta.",
    requirement:
      "Los módulos, la versión del ERP y los permisos contratados determinan los datos que se pueden intercambiar.",
    platforms: [
      {
        id: "bsale",
        name: "Bsale",
        use: "Productos, stock, clientes y documentos tributarios.",
        docs: "https://docs.bsale.dev/get-started/",
        logo: "bsale.svg",
      },
      {
        id: "defontana",
        name: "Defontana",
        use: "Intercambio de información comercial con el ERP.",
        docs: "https://apiintegraciones.defontana.com/",
        logo: "defontana.svg",
      },
      {
        id: "nubox",
        name: "Nubox",
        use: "Documentos de compra y venta, pagos y registros contables.",
        docs: "https://developers.nubox.com/",
        logo: "nubox.svg",
      },
      {
        id: "sap",
        name: "SAP",
        use: "Procesos y datos empresariales mediante las APIs de cada producto.",
        docs: "https://api.sap.com/",
        logo: "sap.svg",
      },
      {
        id: "odoo",
        name: "Odoo",
        use: "Ventas, inventario y gestión; acceso externo según plan y versión.",
        docs: "https://www.odoo.com/documentation/19.0/developer/reference/external_api.html",
        logo: "odoo.svg",
      },
      {
        id: "lioren",
        name: "Lioren",
        use: "Emisión de boletas, facturas y otros DTE; consulta de documentos y datos comerciales autorizados.",
        docs: "https://www.lioren.cl/docs",
        logo: "lioren.png",
        requirement:
          "Requiere los módulos contratados, certificado digital vigente y habilitación tributaria correspondiente.",
      },
      {
        id: "openfactura",
        name: "OpenFactura · Haulmer",
        use: "Emisión y consulta de documentos tributarios electrónicos desde una tienda, ERP o sistema propio.",
        docs: "https://docsapi-openfactura.haulmer.com/",
        logo: "openfactura.svg",
      },
      {
        id: "facto",
        name: "Facto",
        use: "Conexión de ventas con la emisión de documentos tributarios y el seguimiento de sus estados.",
        docs: "https://ayuda.facto.cl/qu%C3%A9-es-y-cu%C3%A1les-son-los-pasos-para-usar-la-api",
        logo: "facto.png",
        requirement:
          "La API es un servicio adicional de Facto. Se valida la certificación del contribuyente, el certificado y los documentos requeridos.",
      },
      {
        id: "softland",
        name: "Softland",
        use: "Intercambio de clientes, registros contables y datos disponibles en los módulos de API Gateway.",
        docs: "https://api.softlandcloud.cl/Softland.Apigateway/index.html",
        logo: "softland.svg",
        requirement:
          "Se revisan versión, módulos, licencias y habilitación de API Gateway. La disponibilidad varía entre instalaciones y productos Softland.",
      },
    ],
  },
  {
    id: "ecommerce",
    name: "Ecommerce y marketplaces",
    description:
      "Conecta productos, pedidos y clientes entre tu tienda y las herramientas que sostienen la venta.",
    requirement:
      "Se revisan permisos de la aplicación, plan de la tienda, versiones de API y reglas de cada marketplace.",
    platforms: [
      {
        id: "shopify",
        name: "Shopify",
        use: "Catálogo, pedidos e inventario a través de sus APIs y eventos.",
        docs: "https://shopify.dev/docs/api",
        logo: "shopify.svg",
      },
      {
        id: "woocommerce",
        name: "WooCommerce",
        use: "Productos, pedidos, clientes y estados de compra en WordPress.",
        docs: "https://developer.woocommerce.com/docs/apis/",
        logo: "woocommerce.svg",
      },
      {
        id: "jumpseller",
        name: "Jumpseller",
        use: "Sincronización de productos y pedidos de tu tienda.",
        docs: "https://jumpseller.com/support/api/",
        logo: "jumpseller.jpg",
      },
      {
        id: "mercadolibre",
        name: "Mercado Libre",
        use: "Catálogo, publicaciones, pedidos y datos de la cuenta vendedora para coordinar inventario, venta y postventa.",
        docs: "https://developers.mercadolibre.cl/",
        logo: "mercadolibre.webp",
        requirement:
          "Requiere una aplicación registrada, autorización OAuth de la cuenta y permisos disponibles. El alcance de publicaciones, envíos y mensajes depende de las políticas de Mercado Libre.",
      },
      {
        id: "prestashop",
        name: "PrestaShop",
        use: "Productos, pedidos, clientes y estados comerciales a través del servicio web de la tienda.",
        docs: "https://devdocs.prestashop-project.org/9/webservice/",
        logo: "prestashop.svg",
      },
      {
        id: "adobecommerce",
        name: "Adobe Commerce · Magento",
        use: "Catálogo, inventario y pedidos mediante las APIs disponibles en la implementación de Adobe Commerce o Magento.",
        docs: "https://developer.adobe.com/commerce/webapi/",
        logo: "adobecommerce.svg",
      },
      {
        id: "vtex",
        name: "VTEX",
        use: "Catálogo, inventario y gestión de pedidos para operaciones de comercio electrónico.",
        docs: "https://developers.vtex.com/docs/api-reference",
        logo: "vtex.svg",
      },
      {
        id: "bigcommerce",
        name: "BigCommerce",
        use: "Productos, clientes y pedidos para conectar la tienda con herramientas de operación y venta.",
        docs: "https://developer.bigcommerce.com/docs/rest-management",
        logo: "bigcommerce.svg",
      },
      {
        id: "wordpress",
        name: "WordPress",
        use: "Publicaciones, páginas y contenido del sitio mediante su REST API; ampliable con plugins autorizados.",
        docs: "https://developer.wordpress.org/rest-api/",
        logo: "wordpress.svg",
      },
    ],
  },
  {
    id: "logistica",
    name: "Despachos y logística",
    description:
      "Lleva el pedido desde tu tienda hasta la operación de despacho, con información para postventa.",
    requirement:
      "Tarifas, cobertura y servicios dependen del contrato y las credenciales del operador logístico.",
    platforms: [
      {
        id: "chilexpress",
        name: "Chilexpress",
        use: "Cotización, órdenes de transporte y seguimiento de envíos.",
        docs: "https://developers.wschilexpress.com/como-integrarse",
        logo: "chilexpress.svg",
      },
      {
        id: "starken",
        name: "Starken",
        use: "Tarifas, órdenes de flete y tracking del despacho.",
        docs: "https://starken.cl/integraciones",
        logo: "starken.webp",
      },
      {
        id: "shipit",
        name: "Shipit",
        use: "Pedidos, cotización y seguimiento con servicios de despacho.",
        docs: "https://developers.shipit.cl/reference/comienza-con-nuestra-api",
        logo: "shipit.png",
      },
      {
        id: "correos",
        name: "CorreosChile",
        use: "Tarifas, cobertura, normalización de direcciones, etiquetas y solicitudes de retiro según servicios contratados.",
        docs: "https://developers.correos.cl/",
        logo: "correos.png",
      },
      {
        id: "blueexpress",
        name: "Blue Express",
        use: "Conexión de la tienda con servicios de despacho mediante plugins o API habilitados por el operador.",
        docs: "https://www.blue.cl/empresas/soluciones-ecommerce",
        logo: "blueexpress.svg",
      },
      {
        id: "enviame",
        name: "Envíame",
        use: "Creación y consulta de envíos para empresas y marketplaces, con eventos de seguimiento.",
        docs: "https://docs.enviame.io/",
        logo: "enviame.svg",
      },
    ],
  },
  {
    id: "personas",
    name: "Personas y gastos",
    description:
      "Relaciona información del equipo y rendiciones con los procesos internos que necesita tu organización.",
    requirement:
      "Los datos personales y laborales requieren permisos limitados por función y autorización de la empresa.",
    platforms: [
      {
        id: "buk",
        name: "Buk",
        use: "Información de personas y organización según los permisos del token.",
        docs: "https://supportcenter.buk.cl/hc/es-419/articles/36657679009307-C%C3%B3mo-integrarse-a-Buk-a-trav%C3%A9s-de-API",
        logo: "buk.svg",
      },
      {
        id: "talana",
        name: "Talana",
        use: "Datos de personas, asistencia y otros módulos habilitados.",
        docs: "https://developers.talana.com/docs/getting-started",
        logo: "talana.png",
      },
      {
        id: "rindegastos",
        name: "Rindegastos",
        use: "Rendiciones y gastos aprobados para flujos administrativos.",
        docs: "https://rindegastos.com/documentacion-api",
        logo: "rindegastos.svg",
      },
      {
        id: "geovictoria",
        name: "GeoVictoria",
        use: "Datos autorizados de personas y asistencia para conectar marcajes y reportes con la gestión interna.",
        docs: "https://www.geovictoria.com/",
        logo: "geovictoria.svg",
        requirement:
          "Se revisan módulos, permisos y documentación API entregada al cliente. Los datos laborales se limitan a los procesos y usuarios autorizados.",
      },
      {
        id: "rexmas",
        name: "Rex+",
        use: "Información de personal y procesos de remuneraciones mediante las vías de integración habilitadas para la empresa.",
        docs: "https://ayudachile.rexmas.com/es/",
        logo: "rexmas.webp",
        requirement:
          "La versión chilena, los módulos contratados y el acceso a la API deben confirmarse con el proveedor antes de definir el intercambio de datos.",
      },
    ],
  },
  {
    id: "crm",
    name: "CRM y gestión comercial",
    description:
      "Convierte una consulta de tu web en una oportunidad que tu equipo pueda atender y seguir.",
    requirement:
      "Se acuerdan campos, responsables, consentimiento y reglas para evitar contactos duplicados.",
    platforms: [
      {
        id: "hubspot",
        name: "HubSpot",
        use: "Contactos, negocios y seguimiento de oportunidades comerciales.",
        docs: "https://developers.hubspot.com/docs/api-reference/latest/overview",
        logo: "hubspot.svg",
      },
      {
        id: "salesforce",
        name: "Salesforce",
        use: "Clientes, oportunidades y procesos mediante APIs autorizadas.",
        docs: "https://developer.salesforce.com/developer-centers/integration-apis",
        logo: "salesforce.svg",
      },
      {
        id: "zoho",
        name: "Zoho CRM",
        use: "Leads, contactos, negocios y avisos de cambios en el CRM.",
        docs: "https://www.zoho.com/crm/developer/docs/api/v8/",
        logo: "zoho.svg",
      },
      {
        id: "pipedrive",
        name: "Pipedrive",
        use: "Personas, empresas, actividades y etapas de venta.",
        docs: "https://developers.pipedrive.com/docs/api/v1",
        logo: "pipedrive.svg",
      },
    ],
  },
  {
    id: "comunicacion",
    name: "Mensajería y comunicación",
    description:
      "Envía confirmaciones y avisos útiles en el canal que corresponde a cada etapa de atención.",
    requirement:
      "Requiere consentimiento, configuración del remitente y cumplimiento de las políticas y plantillas del canal.",
    platforms: [
      {
        id: "whatsapp",
        name: "WhatsApp Business Platform",
        use: "Mensajes y notificaciones mediante la API oficial de Meta.",
        docs: "https://developers.facebook.com/docs/whatsapp/cloud-api/",
        logo: "whatsapp.svg",
      },
      {
        id: "twilio",
        name: "Twilio",
        use: "Mensajería programable según canales y cobertura contratados.",
        docs: "https://www.twilio.com/docs/messaging",
        logo: "twilio.svg",
      },
      {
        id: "brevo",
        name: "Brevo",
        use: "Correos transaccionales, contactos y eventos de comunicación.",
        docs: "https://developers.brevo.com/",
        logo: "brevo.svg",
      },
      {
        id: "mailchimp",
        name: "Mailchimp",
        use: "Audiencias y campañas con datos autorizados de tus formularios.",
        docs: "https://mailchimp.com/developer/",
        logo: "mailchimp.svg",
      },
    ],
  },
  {
    id: "productividad",
    name: "Productividad y reportes",
    description:
      "Conecta los datos de operación con documentos, calendarios y paneles para tu equipo.",
    requirement:
      "Se definen cuentas de servicio, accesos a archivos y licencias necesarias para cada herramienta.",
    platforms: [
      {
        id: "google",
        name: "Google Workspace",
        use: "Google Sheets, Drive, Gmail y Calendar según permisos.",
        docs: "https://developers.google.com/workspace",
        logo: "google.svg",
      },
      {
        id: "microsoft",
        name: "Microsoft 365",
        use: "Excel, Outlook, Teams y SharePoint mediante Microsoft Graph.",
        docs: "https://learn.microsoft.com/es-es/graph/overview",
        logo: "microsoft.svg",
      },
      {
        id: "powerbi",
        name: "Microsoft Power BI",
        use: "Reportes y conjuntos de datos; publicación según licenciamiento.",
        docs: "https://learn.microsoft.com/es-es/rest/api/power-bi/",
        logo: "powerbi.svg",
      },
      {
        id: "slack",
        name: "Slack",
        use: "Avisos de tareas, solicitudes y eventos a canales del equipo.",
        docs: "https://api.slack.com/",
        logo: "slack.svg",
      },
      {
        id: "notion",
        name: "Notion",
        use: "Páginas, bases de datos y documentos para relacionar conocimiento y registros operativos.",
        docs: "https://developers.notion.com/",
        logo: "notion.svg",
      },
      {
        id: "airtable",
        name: "Airtable",
        use: "Registros, tablas y vistas para conectar formularios, catálogos y procesos de trabajo.",
        docs: "https://airtable.com/developers/web/api/introduction",
        logo: "airtable.svg",
      },
      {
        id: "clickup",
        name: "ClickUp",
        use: "Tareas, estados y espacios de trabajo para coordinar solicitudes, responsables y entregas.",
        docs: "https://developer.clickup.com/",
        logo: "clickup.svg",
      },
      {
        id: "trello",
        name: "Trello",
        use: "Tarjetas, listas y tableros conectados con consultas, tareas y cambios de estado.",
        docs: "https://developer.atlassian.com/cloud/trello/rest/",
        logo: "trello.svg",
      },
      {
        id: "asana",
        name: "Asana",
        use: "Proyectos, tareas y responsables para relacionar procesos internos con el trabajo del equipo.",
        docs: "https://developers.asana.com/",
        logo: "asana.svg",
      },
    ],
  },
  {
    id: "medicion",
    name: "Marketing y medición",
    description:
      "Reúne datos de adquisición, campañas y conversiones para conocer de dónde llegan las oportunidades.",
    requirement:
      "Se revisan propiedad de las cuentas, consentimiento, permisos, cuotas y calidad de los eventos. Conectar una API no garantiza resultados publicitarios ni posicionamiento.",
    platforms: [
      {
        id: "ga4",
        name: "Google Analytics 4",
        use: "Reportes de usuarios, sesiones y eventos de conversión para paneles de seguimiento comercial.",
        docs: "https://developers.google.com/analytics/devguides/reporting/data/v1",
        logo: "ga4.svg",
      },
      {
        id: "googleads",
        name: "Google Ads",
        use: "Lectura de campañas, costos y conversiones e integración con procesos publicitarios autorizados.",
        docs: "https://developers.google.com/google-ads/api/docs/start",
        logo: "googleads.svg",
        requirement:
          "Requiere token de desarrollador y permisos de la cuenta. Las modificaciones de campañas y presupuestos se definen y autorizan por separado.",
      },
      {
        id: "searchconsole",
        name: "Google Search Console",
        use: "Consultas, páginas, clics e impresiones para seguir el rendimiento orgánico de propiedades verificadas.",
        docs: "https://developers.google.com/webmaster-tools/",
        logo: "searchconsole.svg",
      },
      {
        id: "tagmanager",
        name: "Google Tag Manager",
        use: "Configuración y gestión de etiquetas y contenedores autorizados para instrumentar medición.",
        docs: "https://developers.google.com/tag-platform/tag-manager/api/v2",
        logo: "tagmanager.svg",
      },
      {
        id: "metaads",
        name: "Meta Ads",
        use: "Campañas, anuncios y métricas mediante Marketing API para reportes y flujos publicitarios autorizados.",
        docs: "https://developers.facebook.com/docs/marketing-apis/",
        logo: "meta.svg",
        requirement:
          "Requiere permisos publicitarios y acceso a la cuenta. Crear anuncios, publicarlos o cambiar inversión requiere un alcance y autorización explícitos.",
      },
      {
        id: "googlebusiness",
        name: "Google Business Profile",
        use: "Datos y funciones disponibles de fichas empresariales para procesos de presencia local y atención.",
        docs: "https://developers.google.com/my-business",
        logo: "googlebusiness.svg",
        requirement:
          "Requiere acceso aprobado a las APIs y administración de las ubicaciones. La conexión no garantiza verificación, visibilidad ni posiciones en Google.",
      },
    ],
  },
  {
    id: "automatizacion",
    name: "Automatización de procesos",
    description:
      "Conecta eventos entre herramientas para preparar documentos, mover datos, crear tareas y avisar al responsable.",
    requirement:
      "Se define qué activa cada flujo, quién puede ejecutarlo, cómo se detectan errores y qué acciones requieren revisión de una persona. Licencias e infraestructura se presupuestan por separado.",
    platforms: [
      {
        id: "n8n",
        name: "n8n",
        use: "Flujos entre APIs, formularios, bases de datos y avisos, con condiciones y pasos de revisión.",
        docs: "https://docs.n8n.io/",
        logo: "n8n.svg",
      },
      {
        id: "make",
        name: "Make",
        use: "Escenarios que conectan eventos y acciones entre aplicaciones con reglas y control de errores.",
        docs: "https://developers.make.com/",
        logo: "make.svg",
      },
      {
        id: "zapier",
        name: "Zapier",
        use: "Automatización de tareas y eventos entre herramientas conectadas, según sus disparadores y acciones.",
        docs: "https://docs.zapier.com/platform/home",
        logo: "zapier.svg",
      },
    ],
  },
  {
    id: "datos",
    name: "Nube y bases de datos",
    description:
      "Conecta aplicaciones, archivos y datos con una infraestructura adecuada al volumen y la operación del proyecto.",
    requirement:
      "Se definen región, cuentas, permisos, respaldo y costos de infraestructura. La conexión requiere acceso autorizado y revisión del esquema; cada servicio mantiene sus límites y condiciones.",
    platforms: [
      {
        id: "aws",
        name: "Amazon Web Services",
        use: "Almacenamiento, servicios de aplicación y procesamiento de eventos mediante SDKs y APIs autorizadas.",
        docs: "https://docs.aws.amazon.com/",
        logo: "aws.svg",
      },
      {
        id: "azure",
        name: "Microsoft Azure",
        use: "Aplicaciones, almacenamiento y servicios de datos conectados con la infraestructura de la empresa.",
        docs: "https://learn.microsoft.com/en-us/rest/api/azure/",
        logo: "azure.svg",
      },
      {
        id: "googlecloud",
        name: "Google Cloud",
        use: "Servicios de aplicación, almacenamiento y análisis de datos mediante APIs y cuentas autorizadas.",
        docs: "https://cloud.google.com/apis/docs/overview",
        logo: "googlecloud.svg",
      },
      {
        id: "firebase",
        name: "Firebase",
        use: "Autenticación, datos y mensajería para aplicaciones web o móviles, según productos contratados.",
        docs: "https://firebase.google.com/docs",
        logo: "firebase.svg",
      },
      {
        id: "supabase",
        name: "Supabase",
        use: "Base de datos PostgreSQL, autenticación y archivos para conectar aplicaciones y procesos autorizados.",
        docs: "https://supabase.com/docs",
        logo: "supabase.svg",
      },
      {
        id: "postgresql",
        name: "PostgreSQL",
        use: "Intercambio y consulta de datos de negocio mediante conectores, consultas y roles de acceso definidos.",
        docs: "https://www.postgresql.org/docs/",
        logo: "postgresql.svg",
      },
      {
        id: "mysql",
        name: "MySQL",
        use: "Conexión de sistemas con bases de datos existentes, validando estructura, permisos y reglas de escritura.",
        docs: "https://dev.mysql.com/doc/",
        logo: "mysql.svg",
      },
    ],
  },
  {
    id: "ia",
    name: "Inteligencia artificial y asistentes",
    description:
      "Incorpora búsqueda sobre documentos, extracción de información y asistencia en tareas con modelos conectados a procesos reales.",
    requirement:
      "Se evalúan privacidad, datos permitidos, costos por uso, precisión y revisión humana. Las respuestas se validan antes de automatizar decisiones o ejecutar acciones relevantes.",
    platforms: [
      {
        id: "openai",
        name: "OpenAI",
        use: "Asistentes, extracción de datos y búsqueda sobre documentos mediante modelos y herramientas de la API.",
        docs: "https://platform.openai.com/docs/overview",
        logo: "openai.svg",
      },
      {
        id: "anthropic",
        name: "Anthropic · Claude",
        use: "Análisis de documentos, asistencia y uso de herramientas dentro de flujos con permisos y revisión.",
        docs: "https://platform.claude.com/docs/en/intro",
        logo: "anthropic.svg",
      },
      {
        id: "gemini",
        name: "Google Gemini",
        use: "Procesamiento de texto, imágenes y documentos para asistentes y flujos de trabajo con la API.",
        docs: "https://ai.google.dev/gemini-api/docs",
        logo: "gemini.svg",
      },
      {
        id: "mistral",
        name: "Mistral AI",
        use: "Asistencia, procesamiento de documentos y extracción de información mediante modelos y servicios de la API.",
        docs: "https://docs.mistral.ai/",
        logo: "mistral.svg",
      },
    ],
  },
  {
    id: "identidad",
    name: "Identidad y acceso",
    description:
      "Evalúa un acceso centralizado para que cada persona utilice los servicios que le corresponden.",
    requirement:
      "La autenticación se diseña con permisos mínimos y políticas de acceso; no constituye una certificación de seguridad.",
    platforms: [
      {
        id: "entra",
        name: "Microsoft Entra ID",
        use: "Inicio de sesión empresarial con OAuth 2.0 y OpenID Connect.",
        docs: "https://learn.microsoft.com/es-es/entra/identity-platform/",
        logo: "entra.png",
      },
      {
        id: "auth0",
        name: "Auth0",
        use: "Identidad, inicio de sesión y autorización de aplicaciones.",
        docs: "https://auth0.com/docs",
        logo: "auth0.svg",
      },
      {
        id: "googleidentity",
        name: "Google Identity",
        use: "Inicio de sesión con Google y acceso autorizado a APIs.",
        docs: "https://developers.google.com/identity",
        logo: "google.svg",
      },
      {
        id: "okta",
        name: "Okta",
        use: "Identidad e inicio de sesión empresarial para aplicaciones y usuarios autorizados.",
        docs: "https://developer.okta.com/docs/",
        logo: "okta.svg",
      },
      {
        id: "cloudflare",
        name: "Cloudflare Access",
        use: "Control de acceso a aplicaciones mediante políticas de identidad y servicios de Zero Trust.",
        docs: "https://developers.cloudflare.com/cloudflare-one/",
        logo: "cloudflare.svg",
      },
    ],
  },
  {
    id: "soporte",
    name: "Atención y soporte",
    description:
      "Organiza conversaciones, solicitudes y tickets para que el equipo pueda atenderlos con contexto y seguimiento.",
    requirement:
      "Requiere licencias, acceso a los canales contratados y reglas de asignación, retención y privacidad de los datos.",
    platforms: [
      {
        id: "zendesk",
        name: "Zendesk",
        use: "Tickets, usuarios y estados de atención para conectar la web con el servicio al cliente.",
        docs: "https://developer.zendesk.com/api-reference/",
        logo: "zendesk.svg",
      },
      {
        id: "freshdesk",
        name: "Freshdesk",
        use: "Creación y consulta de tickets, contactos y registros de soporte desde otras aplicaciones.",
        docs: "https://developers.freshdesk.com/api/",
        logo: "freshdesk.svg",
      },
      {
        id: "intercom",
        name: "Intercom",
        use: "Conversaciones, contactos y eventos de atención vinculados con tu aplicación o servicio.",
        docs: "https://developers.intercom.com/",
        logo: "intercom.svg",
      },
      {
        id: "zohodesk",
        name: "Zoho Desk",
        use: "Tickets y contactos para centralizar solicitudes y seguimiento del soporte.",
        docs: "https://desk.zoho.com/DeskAPIDocument",
        logo: "zohodesk.svg",
      },
    ],
  },
  {
    id: "mapas",
    name: "Mapas, ubicación y rutas",
    description:
      "Presenta sucursales, zonas de atención y datos de ubicación dentro de tus herramientas comerciales u operativas.",
    requirement:
      "Cobertura, geocodificación, rutas y cuotas dependen del producto contratado. OpenStreetMap exige atribución y servicios adecuados de mapas o geocodificación; sus servidores públicos tienen políticas de uso.",
    platforms: [
      {
        id: "googlemaps",
        name: "Google Maps Platform",
        use: "Mapas, ubicaciones, direcciones y rutas mediante las APIs habilitadas en el proyecto.",
        docs: "https://developers.google.com/maps/documentation",
        logo: "googlemaps.svg",
      },
      {
        id: "mapbox",
        name: "Mapbox",
        use: "Mapas, visualización geográfica y servicios de ubicación para aplicaciones y paneles operativos.",
        docs: "https://docs.mapbox.com/",
        logo: "mapbox.svg",
      },
      {
        id: "openstreetmap",
        name: "OpenStreetMap",
        use: "Cartografía abierta para mostrar ubicaciones y zonas de operación con proveedores de mapas adecuados.",
        docs: "https://operations.osmfoundation.org/policies/",
        logo: "openstreetmap.svg",
      },
    ],
  },
];

export const integrationPlatforms = integrationGroups.flatMap((group) =>
  group.platforms.map((platform) => ({
    ...platform,
    categoryId: group.id,
    category: group.name,
    requirement: platform.requirement ?? group.requirement,
  })),
);
export type IntegrationCatalogEntry = (typeof integrationPlatforms)[number];
export const integrationPlatformCount = integrationPlatforms.length;
export const featuredIntegrationIds = [
  "sii",
  "mercadolibre",
  "meta",
  "firmavirtual",
  "ecert",
  "docusign",
  "transbank",
  "whatsapp",
  "instagram",
  "adobesign",
  "bsale",
  "google",
  "microsoft",
  "openai",
  "n8n",
  "chilexpress",
];

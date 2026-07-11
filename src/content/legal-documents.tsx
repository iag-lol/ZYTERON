import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";

export type LegalPolicySection = {
  title: string;
  points: ReactNode[];
};

export const termsIntro =
  "Este documento regula la prestación de servicios de desarrollo web, software, soporte técnico y proyectos digitales de ZYTERON SpA, buscando una relación comercial clara, ordenada y profesional.";

export const termsCompanyInfo = [
  { label: "Razón social", value: siteConfig.legalName },
  { label: "RUT", value: siteConfig.taxId },
  { label: "Correo oficial", value: siteConfig.contact.email },
  { label: "Canales formales", value: "Correo y WhatsApp corporativo" },
] as const;

export const termsSections: LegalPolicySection[] = [
  {
    title: "1. Alcance del servicio",
    points: [
      <>
        El servicio contratado corresponde <strong>únicamente</strong> a lo indicado en la cotización, propuesta,
        orden de trabajo o correo de aprobación aceptado por el cliente.
      </>,
      <>
        <strong>
          Cualquier funcionalidad, sección, integración, panel, automatización, módulo, rediseño o cambio no
          detallado expresamente en el documento aprobado se considera adicional
        </strong>{" "}
        y podrá ser cotizado por separado.
      </>,
      <>
        El alcance puede incluir, según el proyecto, desarrollo web, diseño, configuración técnica, formularios,
        integraciones, carga base de contenido, publicación inicial u orientación de uso.
      </>,
      <>
        Quedan fuera del alcance, salvo acuerdo escrito, la redacción completa de textos, carga masiva de productos o
        contenido, campañas, mantención mensual, soporte ilimitado, desarrollo no contemplado, licencias de terceros,
        hosting, dominio, correos corporativos y cambios estructurales posteriores.
      </>,
      <>
        ZYTERON SpA no garantiza continuidad, disponibilidad ni políticas de terceros como hosting, dominio, Meta,
        Google, pasarelas de pago, APIs, plugins, servicios cloud, Resend, Twilio u otros proveedores externos.
      </>,
    ],
  },
  {
    title: "2. Obligaciones y entregables del cliente",
    points: [
      <>
        El cliente debe entregar oportunamente todos los insumos necesarios para el proyecto, incluyendo textos,
        imágenes, logos, accesos, credenciales, antecedentes comerciales, productos, estructuras, aprobaciones y
        definiciones necesarias para trabajar correctamente.
      </>,
      <>
        <strong>
          Los plazos de desarrollo comienzan a correr sólo cuando el cliente haya entregado el 100% de los insumos
          mínimos requeridos
        </strong>{" "}
        para iniciar o continuar la etapa correspondiente.
      </>,
      <>
        Si el cliente no entrega material, retrasa aprobaciones o responde fuera de plazo, el cronograma se suspende o
        se desplaza automáticamente sin que ello constituya incumplimiento imputable a ZYTERON SpA.
      </>,
      <>
        El cliente declara que tiene derecho de uso sobre el contenido, imágenes, marcas, bases de datos y materiales
        que entregue, asumiendo responsabilidad por eventuales infracciones de propiedad intelectual o uso no
        autorizado.
      </>,
    ],
  },
  {
    title: "3. Cláusula de abandono o inactividad",
    points: [
      <>
        Si el cliente deja de responder, no entrega material o pausa el proyecto por más de{" "}
        <strong>30 días corridos</strong>, el proyecto podrá ser clasificado como <strong>abandonado</strong>.
      </>,
      <>
        En ese caso, ZYTERON SpA podrá suspender el cronograma, reasignar recursos a otros proyectos y perderse la
        prioridad de agenda inicialmente reservada.
      </>,
      <>
        Para retomar un proyecto abandonado, el cliente deberá regularizar pagos pendientes y pagar una{" "}
        <strong>tarifa de reactivación equivalente al 15% del valor total del proyecto</strong>, salvo que exista otra
        condición indicada por escrito en la cotización.
      </>,
      <>
        <strong>No se realizan devoluciones de abonos por paralización, abandono o falta de colaboración imputable al cliente.</strong>
      </>,
    ],
  },
  {
    title: "4. Políticas de pago y facturación electrónica",
    points: [
      <>
        Todo proyecto inicia exclusivamente con el pago del abono inicial indicado en la cotización aprobada por el
        cliente.
      </>,
      <>
        Salvo que la cotización establezca otro esquema, la condición comercial base será{" "}
        <strong>50% de abono inicial y 50% contra entrega, antes de publicar y antes de entregar credenciales finales</strong>.
      </>,
      <>
        ZYTERON SpA podrá exigir pagos por etapa, hitos de avance, anticipos especiales o pagos previos para dominio,
        hosting, licencias, APIs, plugins, herramientas o servicios de terceros.
      </>,
      <>
        <strong>
          La publicación final, migración, liberación de código, entrega de accesos y traspaso formal quedan sujetos
          al pago íntegro del saldo adeudado.
        </strong>
      </>,
      <>
        ZYTERON SpA emitirá la respectiva boleta electrónica o factura electrónica según corresponda, conforme al marco
        tributario chileno y los datos entregados por el cliente.
      </>,
      <>
        Si el cliente requiere factura, deberá enviar oportunamente sus datos tributarios correctos. Cualquier
        rectificación posterior quedará sujeta a la normativa vigente y, cuando corresponda, a emisión de nota de
        crédito u otro documento tributario aplicable.
      </>,
      <>
        La mora o atraso en el pago faculta a ZYTERON SpA para suspender entregas, pausar soporte, retener publicación
        o postergar hitos hasta la regularización total del monto adeudado.
      </>,
    ],
  },
  {
    title: "5. Rondas de revisión y correcciones",
    points: [
      <>
        Salvo que la propuesta indique otra cosa, el servicio incluye <strong>dos (2) rondas de revisión integral</strong>{" "}
        por etapa o entregable principal.
      </>,
      <>
        Las observaciones deben enviarse agrupadas en un solo correo, documento o mensaje consolidado, con el fin de
        evitar retrabajo, ambigüedad y desorden operativo.
      </>,
      <>
        Se consideran correcciones incluidas los ajustes razonables dentro del alcance aprobado, tales como cambios
        menores de texto, orden, presentación o detalles funcionales no estructurales.
      </>,
      <>
        <strong>No se consideran correcciones incluidas</strong> los cambios completos de plantilla, rediseño total,
        nuevas secciones no contempladas, pasarelas de pago no aprobadas, nuevas integraciones, funcionalidades no
        cotizadas o cambios estratégicos posteriores a una aprobación previa.
      </>,
      <>
        Toda modificación profunda o fuera de alcance podrá ser cobrada por hora, por bloque o mediante cotización
        adicional.
      </>,
    ],
  },
  {
    title: "6. Garantía técnica vs. mantención",
    points: [
      <>
        ZYTERON SpA otorga una <strong>garantía técnica de 30 días corridos</strong> desde la entrega o publicación del
        proyecto, según corresponda.
      </>,
      <>
        La garantía técnica cubre únicamente errores de programación imputables a ZYTERON SpA, fallos de origen,
        enlaces rotos, incidencias funcionales atribuibles al código entregado y correcciones técnicas dentro del
        alcance contratado.
      </>,
      <>
        <strong>La garantía no cubre</strong> cambios de contenido, nuevas funcionalidades, carga de productos, nuevas
        secciones, cambios de decisión del cliente, incidentes del hosting, errores de terceros, malware, hackeos
        externos, fallas de plugins o cambios de políticas de proveedores externos.
      </>,
      <>
        <strong>La garantía se pierde automáticamente</strong> si el cliente o un tercero ajeno a ZYTERON SpA interviene
        el código, instala plugins, modifica la base de datos, altera configuraciones críticas o provoca fallos por
        manipulación externa.
      </>,
      <>
        La mantención es un servicio distinto de la garantía. Incluye, según plan contratado, soporte continuo,
        actualizaciones, cambios menores, monitoreo, continuidad operativa o mejoras evolutivas.
      </>,
      <>
        Todo trabajo posterior a la garantía, o fuera de su cobertura, se atenderá mediante plan mensual de mantención,
        soporte especializado o cotización puntual.
      </>,
    ],
  },
  {
    title: "7. Propiedad intelectual y permiso de portafolio",
    points: [
      <>
        <strong>
          La propiedad de los entregables finales pagados íntegramente se transfiere al cliente sólo una vez recibido
          el 100% del pago comprometido.
        </strong>
      </>,
      <>
        Mientras existan saldos pendientes, ZYTERON SpA conserva los derechos sobre el trabajo no pagado, incluyendo
        código, configuraciones, despliegues, archivos fuente, versiones no liberadas y material técnico asociado.
      </>,
      <>
        ZYTERON SpA mantiene la titularidad sobre metodologías propias, componentes reutilizables, librerías internas,
        estructuras base, frameworks, procesos, conocimiento técnico y piezas no exclusivas reutilizables.
      </>,
      <>
        El cliente es responsable de contar con licencias válidas para imágenes, tipografías, APIs, software, plugins o
        servicios de terceros que requieran pago o autorización especial.
      </>,
      <>
        El cliente autoriza a ZYTERON SpA a mostrar el proyecto terminado en su portafolio, sitio web, propuestas
        comerciales, redes sociales, presentaciones y casos de éxito, incluyendo capturas, nombre comercial,
        descripción general y enlace público del proyecto.
      </>,
      <>
        Si el cliente requiere confidencialidad reforzada o exclusión de portafolio, ello deberá acordarse
        expresamente por escrito antes del inicio del proyecto, mediante cláusula especial o acuerdo de confidencialidad.
      </>,
    ],
  },
];

export const termsExtraNotes = [
  "Los servicios se atienden por correo y WhatsApp corporativo.",
  "Horario de atención regular: lunes a sábado.",
  "El soporte de emergencias críticas fuera de horario se evalúa según disponibilidad operativa y gravedad del incidente.",
  "Estas condiciones se complementan con la cotización, propuesta, orden de trabajo y correos de aprobación de cada proyecto.",
];

export const termsLastUpdated = "06 de junio de 2026";

export const privacyIntro =
  "ZYTERON utiliza la información entregada por los usuarios únicamente para responder solicitudes, preparar cotizaciones, gestionar servicios, procesar pagos, coordinar proyectos y mantener comunicación comercial relacionada.";

export const privacySections: LegalPolicySection[] = [
  {
    title: "1. Datos recopilados",
    points: [
      "Datos ingresados en formularios de contacto y cotización: nombre, empresa/proyecto, correo, WhatsApp/teléfono y detalles del requerimiento.",
      "Datos para cotización: tipo de proyecto, funcionalidades solicitadas, alcance preliminar, presupuesto estimado y plazos esperados.",
      "Datos para contacto comercial por WhatsApp o correo.",
      "Datos necesarios para pagos por Flow en servicios habilitados.",
      "Datos de facturación cuando corresponda (boleta/factura u otros antecedentes tributarios).",
    ],
  },
  {
    title: "2. Uso de la información",
    points: [
      "Responder solicitudes y preparar propuestas comerciales/cotizaciones formales.",
      "Gestionar servicios contratados, pagos, abonos y soporte.",
      "Coordinar reuniones, etapas de proyecto y comunicaciones relacionadas.",
      "Emitir o gestionar documentación comercial y tributaria cuando corresponda.",
    ],
  },
  {
    title: "3. Pagos y proveedores externos",
    points: [
      "Para pagos online, ZYTERON puede utilizar Flow como pasarela externa.",
      "Información procesada por pasarelas de pago se rige además por políticas del proveedor externo.",
      "ZYTERON no almacena información sensible de tarjetas fuera de los mecanismos del proveedor habilitado.",
    ],
  },
  {
    title: "4. Analítica, cookies y rendimiento",
    points: [
      "El sitio puede utilizar herramientas de analítica y medición para mejorar experiencia y rendimiento.",
      "Se pueden usar cookies técnicas o de medición para funcionamiento del sitio y análisis agregado.",
      "La información analítica se usa para optimización del servicio y no para venta de datos personales.",
    ],
  },
  {
    title: "5. Protección de datos",
    points: [
      "ZYTERON aplica medidas razonables para proteger datos contra acceso no autorizado, alteración o uso indebido.",
      "El acceso interno a datos se limita a finalidades comerciales y operativas del servicio.",
    ],
  },
  {
    title: "6. No venta de información",
    points: [
      "ZYTERON no vende información personal de usuarios a terceros.",
      "Los datos se usan únicamente para responder solicitudes, preparar cotizaciones, gestionar servicios y mantener comunicación comercial relacionada.",
    ],
  },
  {
    title: "7. Derechos de actualización o eliminación",
    points: [
      `Puedes solicitar actualización, rectificación o eliminación de tus datos escribiendo a ${siteConfig.contact.email}.`,
      "La solicitud será revisada conforme a obligaciones legales, tributarias y contractuales aplicables.",
    ],
  },
  {
    title: "8. Cambios de política",
    points: [
      "ZYTERON puede actualizar esta política para reflejar mejoras operativas o cambios regulatorios.",
      "La versión vigente se publica en esta página con fecha de última actualización.",
    ],
  },
];

export const privacyLastUpdated = "11 de mayo de 2026";

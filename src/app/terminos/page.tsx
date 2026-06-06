import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Políticas y condiciones de servicio",
  description:
    "Políticas y condiciones de servicio de ZYTERON SpA para desarrollo web, software, soporte técnico, pagos, revisiones, garantía y propiedad intelectual.",
  path: "/terminos",
  noIndex: true,
});

type PolicySection = {
  title: string;
  points: ReactNode[];
};

const sections: PolicySection[] = [
  {
    title: "1. Alcance del servicio",
    points: [
      <>
        El servicio contratado corresponde <strong>únicamente</strong> a lo indicado en la cotización, propuesta,
        orden de trabajo o correo de aprobación aceptado por el cliente.
      </>,
      <>
        <strong>Cualquier funcionalidad, sección, integración, panel, automatización, módulo, rediseño o cambio no
        detallado expresamente en el documento aprobado se considera adicional</strong> y podrá ser cotizado por
        separado.
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
        <strong>Los plazos de desarrollo comienzan a correr sólo cuando el cliente haya entregado el 100% de los
        insumos mínimos requeridos</strong> para iniciar o continuar la etapa correspondiente.
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
        <strong>No se realizan devoluciones de abonos por paralización, abandono o falta de colaboración imputable al
        cliente.</strong>
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
        <strong>50% de abono inicial y 50% contra entrega, antes de publicar y antes de entregar credenciales
        finales</strong>.
      </>,
      <>
        ZYTERON SpA podrá exigir pagos por etapa, hitos de avance, anticipos especiales o pagos previos para dominio,
        hosting, licencias, APIs, plugins, herramientas o servicios de terceros.
      </>,
      <>
        <strong>La publicación final, migración, liberación de código, entrega de accesos y traspaso formal quedan
        sujetos al pago íntegro del saldo adeudado.</strong>
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
        <strong>La propiedad de los entregables finales pagados íntegramente se transfiere al cliente sólo una vez
        recibido el 100% del pago comprometido.</strong>
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
        comerciales, redes sociales, presentaciones y casos de éxito, incluyendo capturas, nombre comercial, descripción
        general y enlace público del proyecto.
      </>,
      <>
        Si el cliente requiere confidencialidad reforzada o exclusión de portafolio, ello deberá acordarse
        expresamente por escrito antes del inicio del proyecto, mediante cláusula especial o acuerdo de confidencialidad.
      </>,
    ],
  },
];

const extraNotes = [
  "Los servicios se atienden por correo y WhatsApp corporativo.",
  "Horario de atención regular: lunes a sábado.",
  "El soporte de emergencias críticas fuera de horario se evalúa según disponibilidad operativa y gravedad del incidente.",
  "Estas condiciones se complementan con la cotización, propuesta, orden de trabajo y correos de aprobación de cada proyecto.",
];

export default function TerminosPage() {
  return (
    <main className="bg-white py-16">
      <Container className="max-w-5xl space-y-8">
        <div className="space-y-4">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Documento corporativo
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Políticas y condiciones de servicio
          </h1>
          <p className="max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
            Este documento regula la prestación de servicios de desarrollo web, software, soporte técnico y proyectos
            digitales de <strong>ZYTERON SpA</strong>, buscando una relación comercial clara, ordenada y profesional.
          </p>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Razón social</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">ZYTERON SpA</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">RUT</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">78.398.774-0</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Correo oficial</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">contacto@zyteron.cl</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Canales formales</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Correo y WhatsApp corporativo</p>
            </div>
          </div>
        </section>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-900">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                {section.points.map((point, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    <p>{point}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">Notas operativas complementarias</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            {extraNotes.map((note) => (
              <div key={note} className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                <p>{note}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-500">Última actualización: 06 de junio de 2026.</p>
      </Container>
    </main>
  );
}

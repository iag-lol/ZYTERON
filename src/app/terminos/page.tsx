import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Términos y condiciones",
  description:
    "Condiciones comerciales de ZYTERON sobre cotizaciones, abonos, pagos por etapas, suscripciones mensuales, alcance y soporte.",
  path: "/terminos",
  noIndex: true,
});

const sections = [
  {
    title: "1. Sobre cotizaciones",
    points: [
      "Los precios publicados en el sitio son referenciales y se muestran como valores base (desde).",
      "Cada proyecto se cotiza según alcance real, funcionalidades, integraciones, contenido y soporte requerido.",
      "La cotización debe ser aprobada antes de iniciar cualquier desarrollo.",
      "Funcionalidades no incluidas en la propuesta aprobada se cotizan aparte.",
    ],
  },
  {
    title: "2. Sobre pagos",
    points: [
      "Los proyectos pueden requerir abono inicial para iniciar planificación y ejecución.",
      "El saldo se paga según avance, entrega o condiciones acordadas por escrito.",
      "Los pagos pueden realizarse por Flow, transferencia bancaria u otros medios habilitados.",
      "Servicios externos (dominio, hosting, licencias, herramientas o compras necesarias) pueden requerir pago previo.",
    ],
  },
  {
    title: "3. Sobre abonos",
    points: [
      "El abono inicial se descuenta del total del proyecto aprobado en cotización.",
      "El abono confirma reserva de agenda e inicio de trabajo.",
      "Si el cliente cancela después de iniciado el trabajo, el abono puede no ser reembolsable total o parcialmente según avance y costos ya incurridos.",
      "Si ZYTERON no puede ejecutar el servicio por responsabilidad propia, se evaluará devolución según corresponda.",
    ],
  },
  {
    title: "4. Sobre servicios mensuales",
    points: [
      "Los planes mensuales pueden tener permanencia mínima de 6 o 12 meses según alcance inicial.",
      "El pago mensual cubre el servicio indicado y no implica desarrollo ilimitado.",
      "Cambios mayores, nuevas funcionalidades o rediseños se cotizan aparte.",
      "La falta de pago puede suspender el servicio hasta regularización.",
      "La reactivación de un servicio suspendido puede requerir costos técnicos adicionales.",
    ],
  },
  {
    title: "5. Dominio, hosting y correos",
    points: [
      "Pueden estar incluidos o cotizados aparte según plan contratado.",
      "Titularidad, renovación y administración deben quedar definidas en la propuesta comercial.",
      "Servicios de terceros están sujetos a sus propias condiciones y disponibilidad.",
      "Costos externos pueden variar según proveedor y fecha de contratación/renovación.",
    ],
  },
  {
    title: "6. Cambios y alcance",
    points: [
      "El proyecto se ejecuta según el alcance aprobado en cotización.",
      "Cambios menores pueden incluirse según plan y etapa del proyecto.",
      "Cambios mayores o nuevas funcionalidades pueden modificar plazo y valor.",
      "El cliente debe entregar contenido, imágenes, accesos y antecedentes necesarios para ejecución.",
      "Retrasos en entrega de información por parte del cliente pueden afectar plazos de entrega.",
    ],
  },
  {
    title: "7. Entregas",
    points: [
      "La entrega se realiza una vez completado el alcance definido y condiciones comerciales acordadas.",
      "Se contemplan revisiones según el plan contratado y condiciones de la propuesta.",
      "Publicación final puede depender de pagos pendientes, accesos, dominio, hosting o servicios de terceros.",
    ],
  },
  {
    title: "8. Devoluciones",
    points: [
      "Pagos por servicios ya iniciados, configuraciones, diagnósticos, reservas, compras externas o trabajos realizados no son automáticamente reembolsables.",
      "Cada caso se revisa según avance efectivo y costos incurridos.",
      "Productos físicos/tecnológicos se rigen por condiciones específicas de garantía, disponibilidad y entrega.",
    ],
  },
  {
    title: "9. Soporte",
    points: [
      "El soporte incluido depende del plan contratado.",
      "El soporte no incluye nuevas funcionalidades salvo contratación específica.",
      "Soporte prioritario puede requerir plan mensual adicional.",
    ],
  },
  {
    title: "10. Responsabilidad y limitaciones",
    points: [
      "ZYTERON no garantiza resultados comerciales específicos (ventas, posicionamiento o conversiones exactas).",
      "ZYTERON no responde por caídas, fallas o cambios derivados de terceros fuera de su control directo.",
      "Integraciones externas dependen de disponibilidad técnica y condiciones del proveedor correspondiente.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <main className="bg-white py-16">
      <Container className="max-w-4xl space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Términos y condiciones</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Estas condiciones regulan los servicios de ZYTERON para desarrollo web, sistemas, soporte TI, servicios
          mensuales y pagos asociados. Cada proyecto se formaliza mediante cotización o propuesta comercial.
        </p>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="card-premium p-5">
              <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                {section.points.map((point) => (
                  <p key={point}>• {point}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-slate-500">Última actualización: 11 de mayo de 2026.</p>
      </Container>
    </main>
  );
}

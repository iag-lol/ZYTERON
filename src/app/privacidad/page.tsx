import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Política de privacidad",
  description:
    "Política de privacidad de ZYTERON sobre datos de formularios, cotizaciones, pagos por Flow y comunicación comercial.",
  path: "/privacidad",
  noIndex: true,
});

const sections = [
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
      "Puedes solicitar actualización, rectificación o eliminación de tus datos escribiendo a contacto@zyteron.cl.",
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

export default function PrivacidadPage() {
  return (
    <main className="bg-white py-16">
      <Container className="max-w-4xl space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Política de privacidad</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          ZYTERON utiliza la información entregada por los usuarios únicamente para responder solicitudes, preparar
          cotizaciones, gestionar servicios, procesar pagos, coordinar proyectos y mantener comunicación comercial
          relacionada.
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

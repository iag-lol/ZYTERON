import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { CommercialQuoteBuilder } from "@/components/forms/commercial-quote-builder";

export const metadata: Metadata = createPageMetadata({
  title: "Cotizador profesional y solicitud de propuesta",
  description:
    "Cotizador inteligente de ZYTERON con precios competitivos para pymes en Chile. Obtén recomendación, rango estimado y cotización formal.",
  path: "/paquetes",
  noIndex: true,
});

const extras = [
  ["Página adicional", "Desde $14.990"],
  ["Sección adicional", "Desde $9.990"],
  ["Formulario avanzado", "Desde $19.990"],
  ["Carga de productos hasta 20", "Desde $19.990"],
  ["Carga de productos hasta 50", "Desde $49.990"],
  ["Catálogo administrable", "Desde $59.990"],
  ["Mini panel administrativo", "Desde $89.990"],
  ["Panel administrativo completo", "Desde $219.990"],
  ["Integración Flow/Webpay/Mercado Pago", "Desde $89.990"],
  ["Generador de PDF", "Desde $79.990"],
  ["Sistema de reservas", "Desde $129.990"],
  ["Login de usuarios", "Desde $99.990"],
  ["Correos corporativos (configuración)", "Desde $19.990"],
  ["SEO inicial avanzado", "Desde $59.990"],
  ["Automatización WhatsApp", "Desde $99.990"],
  ["Reportes o dashboard", "Desde $89.990"],
  ["Exportación Excel/PDF", "Desde $49.990"],
  ["Mantención mensual", "Desde $19.990"],
  ["Soporte prioritario", "Desde $34.990/mes"],
];

export default function PaquetesPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="paquetes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/paquetes",
          title: "Cotizador profesional y solicitud de propuesta",
          description: "Cotizador comercial con recomendación de plan y evaluación de alcance.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Cotizador", path: "/paquetes" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Cotización profesional
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Cotiza con claridad, paga con seguridad y desarrolla con respaldo
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Este cotizador entrega valores competitivos de entrada para pymes en Chile. El valor final depende del
            alcance, funcionalidades, integraciones y nivel de personalización.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container className="space-y-8">
          <CommercialQuoteBuilder />

          <section className="card-premium p-6">
            <h2 className="text-2xl font-extrabold text-slate-900">Extras y funcionalidades adicionales</h2>
            <p className="mt-2 text-sm text-slate-600">
              Los extras se agregan solo si el proyecto los requiere. Ajustamos estos valores para competir por debajo
              de rangos habituales de agencia, manteniendo cotización formal antes de iniciar.
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-bold">Extra</th>
                    <th className="px-4 py-3 font-bold">Valor referencial</th>
                  </tr>
                </thead>
                <tbody>
                  {extras.map(([name, value]) => (
                    <tr key={name} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-700">{name}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Valores base sujetos a evaluación técnica y comercial.
            </p>
          </section>
        </Container>
      </section>
    </main>
  );
}

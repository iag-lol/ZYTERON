import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { CommercialQuoteBuilder, type ProjectTypeValue } from "@/components/forms/commercial-quote-builder";

export const metadata: Metadata = createPageMetadata({
  title: "Cotiza tu proyecto | ZYTERON",
  description:
    "Cotizador asistido de ZYTERON para empresas, pymes y emprendedores en Chile. Responde preguntas simples y recibe orientación comercial clara.",
  path: "/paquetes",
  noIndex: true,
});

const allowedProjectTypes = new Set<ProjectTypeValue>([
  "web-basica",
  "web-profesional",
  "tienda-online",
  "sistema-web",
  "automatizacion",
  "soporte-ti",
  "no-seguro",
]);

const planLabels: Record<string, string> = {
  "web-basica-presentacion": "Web Básica de Presentación",
  "plan-emprendedor": "Plan Emprendedor",
  "plan-pyme": "Plan Pyme",
  "plan-empresa": "Plan Empresa",
  "catalogo-tienda-online": "Catálogo / Tienda Online",
  "sistema-web-panel-administrativo": "Sistema Web / Panel Administrativo",
  "sistema-avanzado": "Sistema Avanzado / Desarrollo a medida",
};

function normalizeProjectType(value?: string) {
  return value && allowedProjectTypes.has(value as ProjectTypeValue) ? (value as ProjectTypeValue) : undefined;
}

type PageProps = {
  searchParams?:
    | Promise<{ tipo?: string; plan?: string }>
    | { tipo?: string; plan?: string };
};

export default async function PaquetesPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const initialProjectType = normalizeProjectType(query?.tipo);
  const initialPlanLabel = query?.plan ? planLabels[String(query.plan).trim()] : undefined;

  return (
    <main className="bg-white">
      <JsonLd
        id="paquetes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/paquetes",
          title: "Cotiza tu proyecto",
          description: "Asistente de cotización de ZYTERON para levantar necesidades reales sin lenguaje técnico.",
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
            Cotiza tu proyecto
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Cotiza tu proyecto
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Cuéntanos qué necesitas y prepararemos una propuesta clara para tu negocio.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container className="space-y-8">
          <CommercialQuoteBuilder
            initialPlanLabel={initialPlanLabel}
            initialProjectType={initialProjectType}
          />
        </Container>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { SolutionFamilies, IndustrySolutions } from "@/components/commercial/solution-families";
import { solutionFamilies } from "@/content/solutions";
import { buildServicesListJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

const title = "Soluciones de Software y Desarrollo Digital para Empresas";
const description =
  "Software empresarial, gestión de personas y flotas, ecommerce, catálogos, sitios web e integraciones a medida para empresas y profesionales en Chile.";
export const metadata: Metadata = createPageMetadata({ title, description, path: "/servicios" });
export default function ServiciosPage() {
  return (
    <main>
      <JsonLd
        id="solutions-webpage"
        data={buildWebPageJsonLd({
          path: "/servicios",
          title,
          description,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Soluciones", path: "/servicios" },
          ],
        })}
      />
      <JsonLd
        id="solutions-list"
        data={buildServicesListJsonLd({
          path: "/servicios",
          title,
          services: solutionFamilies.map((f) => ({
            name: f.name,
            description: f.description,
            path: `/servicios#${f.id}`,
          })),
        })}
      />
      <section className="bg-hero-pattern border-b border-slate-200 py-16 sm:py-20">
        <Container>
          <p className="eyebrow">Soluciones digitales a medida</p>
          <h1 className="mt-5 max-w-4xl text-4xl sm:text-5xl">
            Presentar, comercializar y gestionar tu negocio.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Desarrollamos proyectos completos y herramientas específicas para empresas y
            profesionales. Partimos por tus objetivos, procesos y usuarios; conectamos las piezas
            que tu operación necesita y definimos cómo pueden evolucionar.
          </p>
          <Link className="design-button mt-7" href="/contacto?origen=soluciones">
            Conversemos sobre tu proyecto <ArrowUpRight size={18} />
          </Link>
          <nav className="solution-jump-links" aria-label="Familias de soluciones">
            {solutionFamilies.map((f) => (
              <Link key={f.id} href={`#${f.id}`}>
                {f.shortName}
              </Link>
            ))}
          </nav>
        </Container>
      </section>
      <section className="py-16">
        <Container>
          <h2 className="text-3xl sm:text-4xl">Cinco familias, un alcance definido para ti.</h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Las capacidades se desarrollan y combinan según cada proyecto. La propuesta confirma qué
            incluye la primera entrega, qué se deja para una siguiente etapa y qué depende de
            servicios externos.
          </p>
          <SolutionFamilies detailed />
        </Container>
      </section>
      <section id="rubros" className="border-y border-slate-200 bg-white py-16">
        <Container>
          <p className="eyebrow">Según tu actividad</p>
          <h2 className="mt-3 text-3xl">Soluciones por rubro</h2>
          <IndustrySolutions />
        </Container>
      </section>
      <section className="py-16">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl">Una primera conversación basta para comenzar.</h2>
            <p className="mt-5 leading-7 text-slate-600">
              Cuéntanos qué quieres mejorar. Revisamos la necesidad y preparamos una propuesta con
              entregables, calendario, inversión y condiciones de operación.
            </p>
            <Link
              href="/contacto?tipo=orientacion&origen=soluciones"
              className="design-button mt-6"
            >
              Necesito orientación <ArrowUpRight size={18} />
            </Link>
          </div>
          <nav
            aria-label="Servicios y recursos complementarios"
            className="grid content-start gap-4 text-sm"
          >
            {[
              ["Precios y alcances", "/planes"],
              ["Proyectos seleccionados", "/casos-exito"],
              ["Webs para empresas en Santiago", "/paginas-web-santiago"],
              ["Integraciones y desarrollo web en Santiago", "/desarrollo-web-santiago"],
              ["Webs para pymes", "/paginas-web-para-pymes"],
              ["SEO para empresas", "/servicios/seo-para-empresas-chile"],
              ["Mantenimiento web", "/servicios/mantencion-web-chile"],
              ["Soporte TI", "/soporte-ti"],
              ["Recursos para preparar un proyecto", "/recursos"],
              ["Preguntas frecuentes", "/faq"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="text-link">
                {label}
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </nav>
        </Container>
      </section>
    </main>
  );
}
